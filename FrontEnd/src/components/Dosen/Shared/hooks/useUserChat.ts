'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Message, CannedResponse } from '@/constants/chatTypes';
import { supabase } from '@/lib/supabaseClient';
import { toLocalTime } from '../utils';
import type { PendingFile } from './useUserAttachments';

interface UseUserChatOptions {
  platform: 'mobile' | 'web';
  /**
   * Apakah ruang chat sedang terlihat oleh user.
   * - Mobile: activeTab === 'chats' && chatView === 'ROOM'
   * - Web   : isChatOpen
   */
  isChatVisible: boolean;
  /** Opsional: dipakai buat nampilin alert kalau kirim pesan gagal. */
  showAlert?: (message: string, title?: string) => void;
}

export const useUserChat = ({ platform, isChatVisible, showAlert }: UseUserChatOptions) => {
  const [userName, setUserName] = useState('User');
  const [userGmail, setUserGmail] = useState('');
  const [roomId, setRoomId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('user_chat_room_id');
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('user_chat_messages');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastRoomIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingMessagesRef = useRef(false);
  const lastFetchMessagesTimeRef = useRef(0);

  // Ref status visibilitas chat (pengganti activeTabRef/chatViewRef di Mobile & isChatOpenRef di Web)
  const isChatVisibleRef = useRef(isChatVisible);
  useEffect(() => {
    isChatVisibleRef.current = isChatVisible;
  }, [isChatVisible]);

  useEffect(() => {
    if (roomId) {
      try {
        sessionStorage.setItem('user_chat_room_id', roomId.toString());
      } catch {}
    }
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      // Pesan lampiran (base64) nggak disimpan biar sessionStorage (~5 MB) nggak penuh.
      // Pesan itu tetap muncul lagi dari server lewat fetchMessages.
      try {
        const ringan = messages.filter(
          (m) => m.type !== 'image' && m.type !== 'file' && m.type !== 'multi_file'
        );
        sessionStorage.setItem('user_chat_messages', JSON.stringify(ringan));
      } catch (err) {
        console.warn('Gagal simpan cache pesan:', err);
      }
    } else {
      // Chat kosong (mis. dihapus dari database): buang cache lama biar nggak muncul lagi
      try {
        sessionStorage.removeItem('user_chat_messages');
      } catch {}
    }
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  const markAsRead = useCallback(async (id: number, token: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/mark-read?room_id=${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token 
        },
        body: JSON.stringify({ room_id: id })
      });
    } catch (err) {
      console.error("Gagal mark read user:", err);
    }
  }, []);

  const fetchMessages = useCallback(async (id: number, token: string, currentGmail: string) => {
    // Mencegah request menumpuk jika request sebelumnya masih berjalan
    if (isFetchingMessagesRef.current) return;
    isFetchingMessagesRef.current = true;
    lastFetchMessagesTimeRef.current = Date.now();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages?room_id=${id}&_t=${Date.now()}`, {
        headers: { 'Authorization': token },
        cache: 'no-store'
      });
      const raw = await res.json().catch(() => null);
      // Backend (Go) bisa balas `null` kalau room belum punya pesan: anggap daftar kosong
      const data: any[] | null = res.ok ? (Array.isArray(raw) ? raw : raw == null ? [] : null) : null;
      if (data) {
        const serverMessages: Message[] = data.map((m: any) => ({
          id: m.id.toString(),
          sender: (m.sender_gmail || m.sender_identifier || '').toLowerCase() === currentGmail.toLowerCase() ? 'user' : 'admin',
          text: m.message,
          timestamp: toLocalTime(m.created_at),
          type: m.message_type
        }));

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
            return prevMessages; // Hindari re-render berulang agar tidak berkedip
          }

          return merged;
        });

        const unreadAdminCount = data.filter((m: any) => {
          const senderId = (m.sender_gmail || m.sender_identifier || '').toLowerCase();
          const isFromUser = senderId === currentGmail.toLowerCase();
          const isUnread = !m.is_read || m.is_read === 0 || m.is_read === 'false';
          return !isFromUser && isUnread;
        }).length;

        if (isChatVisibleRef.current) {
          // HANYA panggil markAsRead jika memang ADA pesan unread (hindari infinite DB UPDATE loop)
          if (unreadAdminCount > 0) {
            markAsRead(id, token);
          }
          setUnreadCount(0);
        } else {
          setUnreadCount(unreadAdminCount);
        }
      }
    } catch (err) {
      console.error("Gagal ambil pesan:", err);
    } finally {
      isFetchingMessagesRef.current = false;
    }
  }, [markAsRead]);

  const initChat = useCallback(async (gmail: string, token: string) => {
    try {
      // 1. Get or Create Room
      const roomRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/user-room?gmail=${gmail}`, {
        headers: { 'Authorization': token }
      });
      const roomData = await roomRes.json();
      if (roomRes.ok) {
        setRoomId(roomData.id);
        setUnreadCount(roomData.unread_count || 0);
        fetchMessages(roomData.id, token, gmail);
      }
    } catch (err) {
      console.error("Gagal inisialisasi chat:", err);
    }
  }, [fetchMessages]);

  // Tandai pesan terbaca saat chat terlihat
  useEffect(() => {
    if (isChatVisible && roomId) {
      setUnreadCount(0);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const { token } = JSON.parse(storedUser);
          markAsRead(roomId, token);
        } catch (e) {}
      }
    }
  }, [isChatVisible, roomId]);

  // Ambil data user dari localStorage lalu init chat
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserName(parsed.username || parsed.Username || 'User');

      if (platform === 'mobile') {
        const idUser = parsed.identifier || parsed.gmail;
        setUserGmail(idUser);
        initChat(idUser, parsed.token);
      } else {
        // Ambil identifier (NIM/NIP) atau fallback gmail
        const email = parsed.identifier || parsed.gmail || parsed.Gmail || parsed.email || parsed.Email || '';
        setUserGmail(email);

        if (email) {
          initChat(email, parsed.token);
        }
      }
    }
  }, []);

  // Realtime + polling
  useEffect(() => {
    if (roomId && userGmail) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const { token } = JSON.parse(storedUser);

            // 1. Supabase Realtime WebSocket listener (0 ms delay instan)
            let wasDisconnected = false;
            const channel = supabase
              .channel(platform === 'mobile' ? `realtime_chat_user_mob_${roomId}` : `realtime_chat_user_${roomId}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'chat_messages',
                  filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                  console.debug('[Realtime user] event:', payload.eventType);
                  // Jangan refetch jika hanya event UPDATE is_read (mencegah loop request)
                  if (payload.eventType === 'UPDATE') {
                    return;
                  }
                  fetchMessages(roomId, token, userGmail);
                }
              )
              .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                  console.info('[Realtime user] terhubung, room', roomId);
                  // Jika sebelumnya terputus, refetch 1x agar tidak tertinggal data
                  if (wasDisconnected) {
                    fetchMessages(roomId, token, userGmail);
                    wasDisconnected = false;
                  }
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  wasDisconnected = true;
                  console.warn('[Realtime user] status:', status, err ?? '');
                }
              });

            // 2. Fallback polling sebagai cadangan jika WebSocket terputus (60 detik, hanya saat tab aktif)
            const interval = setInterval(() => {
              if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
              fetchMessages(roomId, token, userGmail);
            }, 60000);

            // 3. Refetch instan 1x saat tab kembali aktif/terlihat (dengan debounce 5 detik)
            const handleVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastFetchMessagesTimeRef.current >= 5000 && !isFetchingMessagesRef.current) {
                  fetchMessages(roomId, token, userGmail);
                }
              }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
              supabase.removeChannel(channel);
              clearInterval(interval);
              document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }
  }, [roomId, userGmail]);

  // Efek pintar buat scroll
  useEffect(() => {
    if (roomId && messages.length > 0) {
      if (lastRoomIdRef.current !== roomId) {
        scrollToBottom('auto');
        lastRoomIdRef.current = roomId;
        setShouldAutoScroll(true);
      } else if (shouldAutoScroll) {
        scrollToBottom('smooth');
      }
    }
  }, [messages, roomId, shouldAutoScroll]);

  const handleSendMessage = async (
    e: React.FormEvent,
    pendingFiles: PendingFile[] = [],
    setPendingFiles?: (files: PendingFile[]) => void
  ) => {
    e.preventDefault();
    if (!roomId) {
      showAlert?.('Chat belum siap (room belum terbentuk). Coba refresh halaman atau login ulang.', 'Pesan Belum Terkirim');
      return;
    }

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
    const gmail = parsed.identifier || parsed.gmail || userGmail;

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

    // OPTIMISTIC UPDATE: Langsung render bubble chat tanpa delay
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      sender: 'user',
      text: messageText,
      timestamp: format(new Date(), 'HH:mm'),
      type: messageType,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setManualNote('');
    setSelectedResponse(null);
    setPendingFiles?.([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // ID textarea beda antara Mobile dan Web (sesuai aslinya)
    const el = document.getElementById(platform === 'mobile' ? 'user-message-input' : 'user-web-message-input');
    if (el) el.style.height = 'auto';
    scrollToBottom('smooth');

    // Kalau kirim gagal: buang bubble palsu, balikin isi input, kasih tau user
    const rollback = (reason: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setManualNote(prevNote);
      setSelectedResponse(prevSelected);
      setPendingFiles?.(prevFiles);
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
          room_id: roomId,
          sender_gmail: gmail,
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

      const savedMsg = await sendRes.json().catch(() => null);
      if (savedMsg?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: savedMsg.id.toString() } : m))
        );
      }
      scrollToBottom('smooth');
    } catch (err) {
      console.error('Gagal kirim pesan:', err);
      rollback('Periksa koneksi internet lalu coba lagi.');
    }
  };

  return {
    userName,
    setUserName,
    userGmail,
    setUserGmail,
    roomId,
    setRoomId,
    messages,
    setMessages,
    isChatStarted,
    setIsChatStarted,
    unreadCount,
    setUnreadCount,
    selectedResponse,
    setSelectedResponse,
    manualNote,
    setManualNote,
    messagesEndRef,
    scrollContainerRef,
    lastRoomIdRef,
    shouldAutoScroll,
    setShouldAutoScroll,
    scrollToBottom,
    handleScroll,
    handleSendMessage,
    fetchMessages,
    markAsRead,
    initChat,
    fileInputRef,
  };
};

export default useUserChat;