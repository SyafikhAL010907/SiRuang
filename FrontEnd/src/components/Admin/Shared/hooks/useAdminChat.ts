'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Message, CannedResponse } from '@/constants/chatTypes';
import { supabase } from '@/lib/supabaseClient';
import { toLocalTime } from '../utils';

// ── Options to handle Web vs Mobile differences ──
export interface UseAdminChatOptions {
  /** Mobile uses `unread_count` directly, Web maps it to `unread` + `lastMessage`/`user` fields */
  platform: 'web' | 'mobile';
  /** Opsional: dipakai buat nampilin alert kalau kirim pesan gagal. */
  showAlert?: (message: string, title?: string) => void;
}

export function useAdminChat(options: UseAdminChatOptions) {
  const { platform, showAlert } = options;

  // ── Auth State ──
  const [adminName, setAdminName] = useState('Admin');
  const [adminGmail, setAdminGmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.identifier || parsed.gmail || '';
        } catch {}
      }
    }
    return '';
  });
  const adminGmailRef = useRef(adminGmail);
  useEffect(() => {
    adminGmailRef.current = adminGmail;
  }, [adminGmail]);

  // ── Rooms (persisted to sessionStorage for instant 0ms load on refresh) ──
  const [rooms, setRooms] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('admin_cached_rooms');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  // ── Selected Chat (persisted to sessionStorage) ──
  const [selectedChat, setSelectedChat] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('adminActiveChat');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    if (selectedChat) {
      sessionStorage.setItem('adminActiveChat', JSON.stringify(selectedChat));
    } else {
      sessionStorage.removeItem('adminActiveChat');
    }
  }, [selectedChat]);

  // ── Messages (persisted to sessionStorage per room for instant 0ms load on refresh) ──
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('adminActiveChat');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.id) {
            const cached = sessionStorage.getItem(`admin_chat_messages_${parsed.id}`);
            return cached ? JSON.parse(cached) : [];
          }
        } catch {}
      }
    }
    return [];
  });

  // Saat selectedChat berganti, langsung ambil cache lokal pesan room tersebut (0ms delay)
  useEffect(() => {
    if (selectedChat?.id) {
      try {
        const cached = sessionStorage.getItem(`admin_chat_messages_${selectedChat.id}`);
        // Tanpa cache: kosongkan dulu supaya pesan room sebelumnya nggak kebawa
        setMessages(cached ? JSON.parse(cached) : []);
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [selectedChat?.id]);

  // Simpan update pesan ke cache lokal sessionStorage
  useEffect(() => {
    const roomKey = selectedChatRef.current?.id;
    if (!roomKey) return;
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(`admin_chat_messages_${roomKey}`, JSON.stringify(messages));
      } else {
        // Chat kosong (mis. dihapus dari database): buang cache lama
        sessionStorage.removeItem(`admin_chat_messages_${roomKey}`);
      }
    } catch {}
  }, [messages]);

  // ── Send Message State ──
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [manualNote, setManualNote] = useState('');

  // ── File Preview ──
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);

  // ── Scroll refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastRoomIdRef = useRef<number | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // ── File input ref ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingRoomsRef = useRef(false);
  const isFetchingMessagesRef = useRef(false);

  const viewFile = useCallback((dataUrl: string, fileName?: string) => {
    setSelectedExcelFile({ data: dataUrl, name: fileName || 'Dokumen' });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  }, []);

  // ── Fetch Functions ──
  const fetchRooms = useCallback(async (token: string) => {
    if (isFetchingRoomsRef.current) return;
    isFetchingRoomsRef.current = true;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/rooms`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const mapped = data.map((r: any) => ({
          ...r,
          user: r.user_name || r.user_gmail?.split('@')[0] || r.user_identifier,
          lastMessage: r.last_message,
          time: toLocalTime(r.updated_at),
          unread: r.unread_count || 0,
          unread_count: r.unread_count || 0,
          is_online: r.is_online,
          is_marked_unread: r.is_marked_unread
        }));
        setRooms(mapped);
        try {
          sessionStorage.setItem('admin_cached_rooms', JSON.stringify(mapped));
        } catch {}
      }
    } catch (err) {
      console.error("Gagal ambil room:", err);
    } finally {
      isFetchingRoomsRef.current = false;
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    // 1. Instan Optimistic Update di UI: hilangkan notif badge dan set unread = 0 seketika
    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.id === id ? { ...r, unread: 0, unread_count: 0, is_marked_unread: false } : r
      )
    );

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/mark-read?room_id=${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({ room_id: id })
      });
      fetchRooms(token);
    } catch (err) {
      console.error("Gagal mark read:", err);
    }
  }, [fetchRooms]);

  const fetchMessages = useCallback(async (roomId: number, token: string) => {
    if (isFetchingMessagesRef.current) return;
    isFetchingMessagesRef.current = true;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages?room_id=${roomId}&_t=${Date.now()}`, {
        headers: { 'Authorization': token },
        cache: 'no-store',
      });
      const raw = await res.json().catch(() => null);
      // Backend (Go) bisa balas `null` kalau room belum punya pesan: anggap daftar kosong
      const data: any[] | null = res.ok ? (Array.isArray(raw) ? raw : raw == null ? [] : null) : null;
      if (data) {
        const currentAdminId = (adminGmailRef.current || adminGmail || '').toLowerCase();
        const serverMessages: Message[] = data.map((m: any) => {
          const sId = (m.sender_gmail || m.sender_identifier || '').toLowerCase();
          const isAI = sId === 'admin_ai';
          const isAdmin =
            isAI ||
            sId === currentAdminId ||
            sId.startsWith('admin') ||
            (selectedChatRef.current?.user_identifier && sId !== selectedChatRef.current.user_identifier.toLowerCase());
          return {
            id: m.id.toString(),
            sender: (isAdmin ? 'admin' : 'user') as 'admin' | 'user',
            text: m.message,
            timestamp: toLocalTime(m.created_at),
            type: m.message_type,
            isAI,
          };
        });

        setMessages((prevMessages) => {
          // Server = sumber kebenaran. Satu-satunya pesan lokal yang dipertahankan adalah
          // pesan "temp-" yang baru dikirim dan belum muncul di server.
          const localPending = prevMessages.filter((p) => {
            if (!p.id.startsWith('temp-')) return false;
            return !serverMessages.some(
              (s) => s.sender === p.sender && s.text === p.text && s.type === p.type
            );
          });

          const merged = [...serverMessages, ...localPending];

          if (
            prevMessages.length === merged.length &&
            prevMessages.every((p, idx) => p.id === merged[idx]?.id && p.text === merged[idx]?.text)
          ) {
            return prevMessages;
          }

          return merged;
        });

        // Jika admin sedang membuka room ini dan ada pesan user yang belum terbaca, tandai sudah dibaca otomatis
        const hasUnreadFromUser = data.some((m: any) => {
          const sId = (m.sender_gmail || m.sender_identifier || '').toLowerCase();
          return !m.is_read && sId !== currentAdminId && sId !== 'admin_ai' && !sId.startsWith('admin');
        });
        if (hasUnreadFromUser && selectedChatRef.current?.id === roomId) {
          markAsRead(roomId);
        }
      }
    } catch (err) {
      console.error("Gagal ambil pesan:", err);
    } finally {
      isFetchingMessagesRef.current = false;
    }
  }, [adminGmail, markAsRead]);

  // ── Supabase Realtime (instan) ──
  // Polling di layout tetap jalan sebagai cadangan. Kalau di console muncul
  // "[Realtime admin] terhubung", pesan baru masuk detik itu juga tanpa nunggu polling.
  const fetchRoomsRef = useRef(fetchRooms);
  const fetchMessagesRef = useRef(fetchMessages);
  useEffect(() => {
    fetchRoomsRef.current = fetchRooms;
    fetchMessagesRef.current = fetchMessages;
  }, [fetchRooms, fetchMessages]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return;
    let token = '';
    try {
      token = JSON.parse(stored).token;
    } catch {
      return;
    }
    if (!token) return;

    // Gabungkan event yang datang beruntun (mis. Bless Chat ke banyak room) jadi 1 refresh
    let roomsTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshRooms = () => {
      if (roomsTimer) return;
      roomsTimer = setTimeout(() => {
        roomsTimer = null;
        fetchRoomsRef.current(token);
      }, 150);
    };

    const channel = supabase
      .channel('realtime_chat_admin_all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row: any =
            payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
          console.debug('[Realtime admin] event:', payload.eventType, 'room', row?.room_id);

          // Jika hanya event UPDATE is_read, tidak perlu refetch (mencegah loop feedback antar tab)
          if (payload.eventType === 'UPDATE') {
            return;
          }

          refreshRooms();

          const activeId = selectedChatRef.current?.id;
          if (activeId && (!row?.room_id || Number(row.room_id) === Number(activeId))) {
            fetchMessagesRef.current(activeId, token);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime admin] terhubung');
        } else {
          console.warn('[Realtime admin] status:', status, err ?? '');
        }
      });

    return () => {
      if (roomsTimer) clearTimeout(roomsTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkAsUnread = useCallback(async () => {
    if (!selectedChat) return;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/mark-unread?room_id=${selectedChat.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({ room_id: selectedChat.id })
      });
      setIsRoomMenuOpen(false);
      setSelectedChat(null);
      fetchRooms(token);
    } catch (err) {
      console.error("Gagal tandai belum dibaca:", err);
    }
  }, [selectedChat, fetchRooms]);

  // ── Room menu ──
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);

  // ── Send Message Handler (shared, but input ID differs per platform) ──
  const handleSendMessage = useCallback(async (
    e: React.FormEvent,
    pendingFiles: Array<{ name: string; data: string; type: 'image' | 'file'; sizeStr?: string }>,
    setPendingFiles: React.Dispatch<React.SetStateAction<Array<{ name: string; data: string; type: 'image' | 'file'; sizeStr?: string }>>>,
  ) => {
    e.preventDefault();
    if (!selectedChat) return;

    // Simpan isi input sebelum dikosongkan, buat dikembalikan kalau kirim gagal
    const prevNote = manualNote;
    const prevSelected = selectedResponse;
    const prevFiles = pendingFiles;

    const combinedText = selectedResponse
      ? `${selectedResponse.response}\n\nCatatan Tambahan:\n${manualNote}`
      : manualNote;

    if (!combinedText.trim() && pendingFiles.length === 0) return;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const parsed = JSON.parse(storedUser);
    const token = parsed.token;
    const adminIdentifier = parsed.identifier || parsed.gmail || 'admin';

    // Hitung isi pesan dan tipe pesan sebelum optimistic update
    let messageText = combinedText.trim();
    let messageType: 'text' | 'image' | 'file' | 'multi_file' = 'text';

    if (pendingFiles.length === 1) {
      const pf = pendingFiles[0];
      messageType = pf.type;
      messageText = (combinedText.trim())
        ? `${pf.name}|${pf.data}|${combinedText.trim()}`
        : `${pf.name}|${pf.data}`;
    } else if (pendingFiles.length > 1) {
      messageType = 'multi_file';
      const payload = {
        files: pendingFiles.map(pf => ({ name: pf.name, data: pf.data, type: pf.type })),
        caption: combinedText.trim() || undefined
      };
      messageText = JSON.stringify(payload);
    }

    // OPTIMISTIC UPDATE: Tampilkan bubble chat admin seketika tanpa delay
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      sender: 'admin',
      text: messageText,
      timestamp: format(new Date(), 'HH:mm'),
      type: messageType,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setManualNote('');
    setSelectedResponse(null);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const inputId = platform === 'web' ? 'admin-web-message-input' : 'admin-message-input';
    const el = document.getElementById(inputId);
    if (el) el.style.height = 'auto';
    scrollToBottom('smooth');

    // Kalau kirim gagal: buang bubble palsu, balikin isi input, kasih tau admin
    const rollback = (reason: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setManualNote(prevNote);
      setSelectedResponse(prevSelected);
      setPendingFiles(prevFiles);
      showAlert?.(`Pesan gagal terkirim. ${reason}`, 'Pesan Belum Terkirim');
    };

    try {
      const sendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          room_id: selectedChat.id,
          sender_gmail: adminIdentifier,
          message: messageText,
          message_type: messageType
        })
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text().catch(() => '');
        console.error('Gagal kirim pesan:', sendRes.status, errText);
        rollback(`(Server membalas ${sendRes.status}). Coba lagi ya.`);
        return;
      }

      const saved = await sendRes.json().catch(() => null);
      if (saved?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: saved.id.toString() } : m))
        );
      }

      if (platform === 'web') {
        fetchRooms(token);
      }
      scrollToBottom('smooth');
    } catch (err) {
      console.error('Gagal kirim pesan:', err);
      rollback('Periksa koneksi internet lalu coba lagi.');
    }
  }, [selectedChat, selectedResponse, manualNote, platform, fetchMessages, fetchRooms, scrollToBottom, showAlert]);

  return {
    // Auth
    adminName, setAdminName,
    adminGmail, setAdminGmail,
    // Rooms
    rooms, setRooms,
    fetchRooms,
    // Selected Chat
    selectedChat, setSelectedChat,
    // Messages
    messages, setMessages,
    fetchMessages,
    // Mark read/unread
    markAsRead,
    handleMarkAsUnread,
    // Room menu
    isRoomMenuOpen, setIsRoomMenuOpen,
    // Send message
    selectedResponse, setSelectedResponse,
    manualNote, setManualNote,
    handleSendMessage,
    // File preview
    selectedExcelFile, setSelectedExcelFile,
    viewFile,
    // Scroll
    messagesEndRef,
    scrollContainerRef,
    lastRoomIdRef,
    shouldAutoScroll, setShouldAutoScroll,
    scrollToBottom,
    handleScroll,
    // File input
    fileInputRef,
  };
}