'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, CannedResponse } from '@/constants/chatTypes';
import { toLocalTime } from '../utils';

// ── Options to handle Web vs Mobile differences ──
export interface UseAdminChatOptions {
  /** Mobile uses `unread_count` directly, Web maps it to `unread` + `lastMessage`/`user` fields */
  platform: 'web' | 'mobile';
}

export function useAdminChat(options: UseAdminChatOptions) {
  const { platform } = options;

  // ── Auth State ──
  const [adminName, setAdminName] = useState('Admin');
  const [adminGmail, setAdminGmail] = useState('');

  // ── Rooms ──
  const [rooms, setRooms] = useState<any[]>([]);

  // ── Selected Chat (persisted to sessionStorage) ──
  const [selectedChat, setSelectedChat] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('adminActiveChat');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  useEffect(() => {
    if (selectedChat) {
      sessionStorage.setItem('adminActiveChat', JSON.stringify(selectedChat));
    } else {
      sessionStorage.removeItem('adminActiveChat');
    }
  }, [selectedChat]);

  // ── Messages ──
  const [messages, setMessages] = useState<Message[]>([]);

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
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/rooms`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        if (platform === 'web') {
          setRooms(data.map((r: any) => ({
            ...r,
            user: r.user_name || r.user_gmail.split('@')[0],
            lastMessage: r.last_message,
            time: toLocalTime(r.updated_at),
            unread: r.unread_count,
            is_online: r.is_online,
            is_marked_unread: r.is_marked_unread
          })));
        } else {
          setRooms(data.map((r: any) => ({
            ...r,
            is_online: r.is_online,
            is_marked_unread: r.is_marked_unread
          })));
        }
      } else if (platform === 'web') {
        setRooms([]);
      } else {
        if (res.ok) {
          setRooms([]);
        }
      }
    } catch (err) {
      console.error("Gagal ambil room:", err);
      setRooms([]);
    }
  }, [platform]);

  const fetchMessages = useCallback(async (roomId: number, token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages/${roomId}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          id: m.id.toString(),
          sender: m.sender_gmail.toLowerCase() === adminGmail.toLowerCase() ? 'admin' : 'user',
          text: m.message,
          timestamp: toLocalTime(m.created_at),
          type: m.message_type
        })));
      } else if (platform === 'web') {
        setMessages([]);
      }
    } catch (err) {
      console.error("Gagal ambil pesan:", err);
      if (platform === 'web') {
        setMessages([]);
      }
    }
  }, [adminGmail, platform]);

  const markAsRead = useCallback(async (id: number) => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/mark-read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      fetchRooms(token);
    } catch (err) {
      console.error("Gagal mark read:", err);
    }
  }, [fetchRooms]);

  const handleMarkAsUnread = useCallback(async () => {
    if (!selectedChat) return;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/mark-unread/${selectedChat.id}`, {
        method: 'POST',
        headers: { 'Authorization': token }
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

    const combinedText = selectedResponse
      ? `${selectedResponse.response}\n\nCatatan Tambahan:\n${manualNote}`
      : manualNote;

    if (!combinedText.trim() && pendingFiles.length === 0) return;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token, gmail } = JSON.parse(storedUser);

    try {
      if (pendingFiles.length === 1) {
        const pf = pendingFiles[0];
        const fileMsg = (combinedText.trim())
          ? `${pf.name}|${pf.data}|${combinedText.trim()}`
          : `${pf.name}|${pf.data}`;

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            room_id: selectedChat.id,
            sender_gmail: gmail,
            message: fileMsg,
            message_type: pf.type
          })
        });
      } else if (pendingFiles.length > 1) {
        // Multi-file: Kirim sekaligus dalam 1 bubble tunggal
        const payload = {
          files: pendingFiles.map(pf => ({ name: pf.name, data: pf.data, type: pf.type })),
          caption: combinedText.trim() || undefined
        };
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            room_id: selectedChat.id,
            sender_gmail: gmail,
            message: JSON.stringify(payload),
            message_type: 'multi_file'
          })
        });
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            room_id: selectedChat.id,
            sender_gmail: gmail,
            message: combinedText.trim(),
            message_type: 'text'
          })
        });
      }

      setManualNote('');
      setSelectedResponse(null);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const inputId = platform === 'web' ? 'admin-web-message-input' : 'admin-message-input';
      const el = document.getElementById(inputId);
      if (el) el.style.height = 'auto';
      fetchMessages(selectedChat.id, token);
      if (platform === 'web') {
        fetchRooms(token);
      }
      scrollToBottom();
    } catch (err) {
      console.error("Gagal kirim pesan:", err);
    }
  }, [selectedChat, selectedResponse, manualNote, platform, fetchMessages, fetchRooms, scrollToBottom]);

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
