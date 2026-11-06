'use client';

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  MoreVertical,
  Send,
  Paperclip,
  CheckCheck,
  Search as SearchIcon,
  MessageSquare,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Clock,
  HelpCircle,
  LogOut,
  Settings,
  X,
  LayoutGrid,
  Building2,
  Cpu,
  HardHat
} from 'lucide-react';
import { ChatSession, CannedResponse, Message } from '@/constants/chatTypes';
import { cannedResponses } from '@/constants/cannedResponses';
import { blastTemplates } from '@/constants/blastTemplates';
import Avatar from '@/components/Shared/Avatar';
import FormattedText from '@/components/Shared/FormattedText';
import CustomAlert from '@/components/Shared/CustomAlert';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';
import FileChatBubble, { isFileMessage } from '@/components/Shared/FileChatBubble';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const toLocalTime = (dateStr: string) => {
  if (!dateStr) return '--:--';
  try {
    // Deep Analysis: Ambil teks jamnya langsung dari string biar ga kegeser timezone
    // Format biasanya: YYYY-MM-DD HH:mm:ss atau ISO
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1];
    if (timePart) {
      return timePart.substring(0, 5); // Ambil HH:mm
    }
    const date = new Date(dateStr);
    return format(date, 'HH:mm');
  } catch (e) {
    return '--:--';
  }
};

const WebTabLayout = () => {
  const [adminName, setAdminName] = useState('Admin');
  const [adminGmail, setAdminGmail] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'unreading' | 'reading'>('unreading');
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [showBlessModal, setShowBlessModal] = useState(false);
  const [blessMessage, setBlessMessage] = useState('');
  const [blessFile, setBlessFile] = useState<{ name: string, data: string, type: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string, data: string, type: 'image' | 'file', sizeStr?: string }>>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);
  const [blessTargetMode, setBlessTargetMode] = useState<'waiting_room' | 'all_users' | 'specific_users'>('waiting_room');
  const [allUsers, setAllUsers] = useState<{ username: string, gmail: string }[]>([]);
  const [selectedBlessUsers, setSelectedBlessUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [networkLatency, setNetworkLatency] = useState<number>(24);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(12540); // Simulated total DB users

  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  // ── AI Auto-Response State ────────────────────────────────────────────────
  // ⚠️  DISABLE: Comment blok ini (baris 90-91) untuk balik ke toggle lokal saja
  const [isInfoActive, setIsInfoActive] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false); // Loading state saat toggle
  const [showAIConfirm, setShowAIConfirm] = useState(false); // Konfirmasi sebelum toggle AI
  const [pendingAIState, setPendingAIState] = useState(false); // State AI yang akan diaktifkan
  const [alertConfig, setAlertConfig] = useState<{ show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void }>({ show: false, type: 'alert', message: '' });

  const showAlert = (message: string, title?: string) => setAlertConfig({ show: true, type: 'alert', message, title });
  // ─────────────────────────────────────────────────────────────────────────

  const downloadFile = (dataUrl: string, fileName: string) => {
    try {
      const parts = dataUrl.split(',');
      if (parts.length < 2) throw new Error("Format base64 tidak valid");
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Gagal download:", e);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    }
  };

  const viewFile = (dataUrl: string, fileName?: string) => {
    setSelectedExcelFile({ data: dataUrl, name: fileName || 'Dokumen' });
  };
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Pendaftaran');
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isLocalSearchOpen, setIsLocalSearchOpen] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState<number>(0);

  const searchMatches = messages
    ? messages.filter(m => localSearchQuery.trim() && m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    if (localSearchQuery.trim()) {
      setSearchMatchIndex(searchMatches.length > 0 ? 1 : 0);
    } else {
      setSearchMatchIndex(0);
    }
  }, [localSearchQuery, messages]);

  const scrollToMatch = (index: number) => {
    if (index > 0 && searchMatches[index - 1]) {
      const matchMsg = searchMatches[index - 1];
      const el = document.getElementById(`msg-${matchMsg.id || matchMsg.timestamp}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return <FormattedText text={text} />;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-amber-300 text-slate-900 font-extrabold px-1 rounded-sm shadow-sm border border-amber-400 mx-0.5 select-all">
              {part}
            </span>
          ) : (
            <FormattedText key={i} text={part} />
          )
        )}
      </span>
    );
  };

  // REAL-TIME NETWORK LATENCY DETECTION
  useEffect(() => {
    const updateLatency = () => {
      // @ts-ignore - navigator.connection is experimental but useful
      const rtt = navigator.connection?.rtt || Math.floor(Math.random() * (40 - 15 + 1)) + 15;
      setNetworkLatency(rtt);
    };

    updateLatency();
    const interval = setInterval(updateLatency, 5000);
    return () => clearInterval(interval);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastRoomIdRef = useRef<number | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Jika sisa scroll kurang dari 100px, anggap user di bawah
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  const fetchRooms = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/rooms`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
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
        setRooms([]);
      }
    } catch (err) {
      console.error("Gagal ambil room:", err);
      setRooms([]);
    }
  };

  const fetchStats = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        setTotalUsersCount(data.total_users || 0);
      }
    } catch (err) {
      console.error("Gagal ambil stats:", err);
    }
  };

  const fetchAllUsers = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Gagal ambil semua user:", err);
    }
  };

  const fetchMessages = async (roomId: number, token: string) => {
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
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Gagal ambil pesan:", err);
      setMessages([]);
    }
  };

  const handleMarkAsUnread = async () => {
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
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setAdminName(parsed.username || parsed.Username || 'Admin');
      setAdminGmail(parsed.gmail);
      fetchRooms(parsed.token);
      fetchStats(parsed.token);
      fetchAllUsers(parsed.token);
      // ⚠️  DISABLE: Comment baris fetchAIStatus di bawah jika tidak pakai AI
      fetchAIStatus(parsed.token); // Ambil status AI saat pertama load

      const interval = setInterval(() => {
        fetchRooms(parsed.token);
        fetchStats(parsed.token);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && selectedChat && adminGmail) {
      const { token } = JSON.parse(storedUser);
      fetchMessages(selectedChat.id, token);

      const interval = setInterval(() => fetchMessages(selectedChat.id, token), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id, adminGmail]);

  // Efek pintar buat scroll
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      // Jika ini pertama kali masuk room ini
      if (lastRoomIdRef.current !== selectedChat.id) {
        scrollToBottom('auto'); // Langsung ke bawah tanpa animasi biar cepet
        lastRoomIdRef.current = selectedChat.id;
        setShouldAutoScroll(true);
      }
      // Jika user emang di posisi bawah, ikuti pesan baru
      else if (shouldAutoScroll) {
        scrollToBottom('smooth');
      }
    }
  }, [messages, selectedChat?.id, shouldAutoScroll]);

  const handleSendMessage = async (e: React.FormEvent) => {
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
        let msgText = `${pf.name}|${pf.data}`;
        if (combinedText.trim()) {
          msgText = `${pf.name}|${pf.data}|${combinedText.trim()}`;
        }
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            room_id: selectedChat.id,
            sender_gmail: gmail,
            message: msgText,
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
      const el = document.getElementById('admin-web-message-input');
      if (el) el.style.height = 'auto';
      fetchMessages(selectedChat.id, token);
      fetchRooms(token);
      scrollToBottom();
    } catch (err) {
      console.error("Gagal kirim pesan:", err);
    }
  };

  const handleSelectRoom = (room: any) => {
    setSelectedChat(room);
    setPendingFiles([]);
    markAsRead(room.id);
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = roomSearchQuery.trim()
      ? (room.user_name || '').toLowerCase().includes(roomSearchQuery.toLowerCase()) || (room.user_gmail || '').toLowerCase().includes(roomSearchQuery.toLowerCase())
      : true;

    if (!matchesSearch) return false;

    if (activeFilter === 'unreading') return room.unread > 0 || room.is_marked_unread;
    if (activeFilter === 'reading') return room.unread === 0 && !room.is_marked_unread;
    return true;
  });

  const markAsRead = async (id: number) => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/mark-read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      // Refresh daftar room biar notif ilang
      fetchRooms(token);
    } catch (err) {
      console.error("Gagal mark read:", err);
    }
  };

  // ── AI Auto-Response Functions ───────────────────────────────────────────
  // ⚠️  DISABLE: Comment seluruh blok fetchAIStatus + handleToggleAI (baris di bawah ini)
  // Kalau di-comment, toggle akan balik ke mode lokal-only (tidak nyambung ke backend)

  const fetchAIStatus = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai/status`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setIsInfoActive(data.enabled === true);
      }
    } catch (err) {
      // ML service mungkin belum jalan — toggle tetap lokal, tidak crash
      console.warn('[AI] Tidak bisa ambil status AI (ML service mungkin belum jalan):', err);
    }
  };

  const handleToggleAI = async (newState: boolean) => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    // Langsung update UI dulu biar responsif (optimistic update)
    setIsInfoActive(newState);
    setIsAILoading(true);
    setShowAIConfirm(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ enabled: newState })
      });
      if (!res.ok) {
        // Kalau gagal, rollback ke state sebelumnya
        setIsInfoActive(!newState);
        console.error('[AI] Gagal toggle AI');
      }
    } catch (err) {
      // Backend/ML tidak nyambung — toggle balik ke sebelumnya
      setIsInfoActive(!newState);
      console.warn('[AI] Koneksi ke backend gagal:', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAIToggleRequest = (newState: boolean) => {
    setPendingAIState(newState);
    setShowAIConfirm(true);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleBlessChat = async () => {
    if (!blessMessage.trim() && !blessFile) return;
    if (blessTargetMode === 'specific_users' && selectedBlessUsers.length === 0) {
      showAlert('Pilih minimal satu user tujuan!', 'Pilih User');
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token, gmail } = JSON.parse(storedUser);

    setIsBlasting(true);
    try {
      const payload = {
        message: blessMessage,
        admin_gmail: gmail,
        file_data: blessFile ? `${blessFile.name}|${blessFile.data}` : '',
        file_type: blessFile ? blessFile.type : 'text',
        target_type: blessTargetMode,
        target_gmails: blessTargetMode === 'specific_users' ? selectedBlessUsers : []
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert('Berhasil mengirim pesan Bless Chat!', 'Sukses');
        setBlessMessage('');
        setBlessFile(null);
        setSelectedBlessUsers([]);
        setShowBlessModal(false);
        fetchRooms(token);
      }
    } catch (err) {
      console.error("Gagal kirim Bless Chat:", err);
    } finally {
      setIsBlasting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) return;

    setAlertConfig({
      show: true,
      type: 'confirm',
      message: `Lu yakin mau hapus ${selectedRooms.length} room chat ini secara permanen? Data gak bakal bisa balik lagi lho bro!`,
      title: 'Hapus Room Chat',
      onConfirm: async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const { token } = JSON.parse(storedUser);

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/delete-bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token
            },
            body: JSON.stringify({ room_ids: selectedRooms })
          });

          if (res.ok) {
            showAlert('Mantap! Room chat pilihan lu udah bersih dari database.', 'Sukses');
            setSelectedRooms([]);
            setIsDeleteMode(false);
            if (selectedChat && selectedRooms.includes(selectedChat.id)) {
              setSelectedChat(null);
              setMessages([]);
            }
            fetchRooms(token);
          } else {
            const data = await res.json();
            showAlert('Gagal hapus: ' + data.error, 'Gagal');
          }
        } catch (err) {
          console.error("Gagal bulk delete:", err);
          showAlert('Ada kendala koneksi pas mau hapus data bro.', 'Error Koneksi');
        }
      }
    });
  };

  const toggleSelectRoom = (id: number) => {
    setSelectedRooms(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRooms.length === filteredRooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(filteredRooms.map(r => r.id));
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.from(e.target.files || []);
    if (chosenFiles.length === 0 || !selectedChat) return;

    if (pendingFiles.length + chosenFiles.length > 5) {
      showAlert(`Waduh bro! Maksimal cuma boleh lampirkan 5 file sekaligus (sekarang sudah ada ${pendingFiles.length} file).`, 'Batas Maksimal File');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (const f of chosenFiles) {
      if (f.size > 1024 * 1024) {
        showAlert(`Waduh bro! File "${f.name}" (${(f.size / (1024 * 1024)).toFixed(2)} MB) kegedean. Maksimal cuma boleh 1 MB per file biar server tetep ngebut!`, 'Ukuran File Kegedean');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const readers = chosenFiles.map(f => {
      return new Promise<{ name: string; data: string; type: 'image' | 'file'; sizeStr: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const fileType = f.type.startsWith('image/') ? 'image' : 'file';
          const sizeStr = (f.size / 1024).toFixed(0) + ' KB';
          resolve({
            name: f.name,
            data: base64Data,
            type: fileType,
            sizeStr
          });
        };
        reader.readAsDataURL(f);
      });
    });

    Promise.all(readers).then(newFiles => {
      setPendingFiles(prev => [...prev, ...newFiles]);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar - Chat List */}
      <aside className="w-75 lg:w-95 bg-white border-r border-slate-100 flex flex-col z-20 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500">

       {/* TOP PREMIUM CARD (Floating Style) */}
<div className="p-5 pt-8">
  <div className="bg-gradient-to-br from-[#07111E] to-[#0F2238] rounded-[40px] p-8 text-white shadow-2xl shadow-[#0B192C]/50 relative overflow-hidden group">
    {/* Decorative Elements */}
    <div className="absolute -top-7.5 -right-7.5 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
    <div className="absolute -bottom-7.5 -left-7.5 w-32 h-32 bg-[#38BDF8]/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>

    <div className="relative z-10 flex flex-col gap-10">
      {/* Top Row: Logo & Welcome Message */}
      <div className="flex items-center gap-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl"
        >
          <Image
            src="/unj.png"
            alt="Logo UNJ"
            width={50}
            height={50}
            className="object-contain drop-shadow-2xl"
          />
        </motion.div>
        <div className="flex flex-col">
          <h4 className="text-xl font-bold leading-tight tracking-tight text-white drop-shadow-sm">Selamat Datang,<br />{adminName}!</h4>
        </div>
      </div>

      {/* Bottom Row: Integrated Stats & Toggle (Stretched 50/50) */}
      <div className="flex items-center gap-3 w-full max-w-[320px] relative z-20">
        {/* Mini Stats - Flex 1 */}
        <div className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md py-2 rounded-2xl border border-white/10 shadow-sm">
          <div className="w-5 h-5 bg-[#38BDF8] rounded-lg flex items-center justify-center text-[#0B192C] shadow-sm">
            <MessageSquare size={10} />
          </div>
          <span className="text-[9px] font-black text-white whitespace-nowrap uppercase tracking-tighter">
            {rooms.filter(r => (r.unread_count || 0) > 0).length} Respon
          </span>
        </div>

        {/* Mini Toggle - Flex 1 */}
        <div className="flex-1 flex items-center justify-between gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-sm group/mini">
          <div className="flex items-center gap-1.5">
            <Settings size={12} className="text-[#38BDF8] group-hover/mini:rotate-90 transition-transform duration-500" />
            <span className="text-[9px] font-black text-white uppercase tracking-tighter">AI</span>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              // ⚠️  DISABLE: Ganti handleAIToggleRequest → setIsInfoActive(!isInfoActive)
              if (!isAILoading) handleAIToggleRequest(!isInfoActive);
            }}
            className={cn(
              "relative w-8 h-4 rounded-full p-0.5 transition-all duration-500 cursor-pointer",
              isInfoActive ? "bg-[#38BDF8]" : "bg-white/20",
              isAILoading && "opacity-60 cursor-wait"
            )}
          >
            <motion.div
              animate={{ x: isInfoActive ? 16 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-3 h-3 bg-white rounded-full shadow-md flex items-center justify-center"
            >
              {isAILoading ? (
                <div className="w-2 h-2 border border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  isInfoActive ? "bg-[#0B192C]" : "bg-slate-300"
                )} />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div className="px-4 pb-4">
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#38BDF8] transition-colors duration-300">
      <Search size={18} />
    </div>
    <input
      type="text"
      value={roomSearchQuery}
      onChange={(e) => setRoomSearchQuery(e.target.value)}
      placeholder="Cari user atau pesan..."
      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-[20px] text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#38BDF8] focus:ring-4 focus:ring-[#38BDF8]/10 transition-all duration-300"
    />
  </div>
</div>

        <div className="px-4 pb-2">
          <div className="flex bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100 min-h-11.5 items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {isDeleteMode ? (
                <motion.div
                  key="delete-mode-active"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="flex w-full gap-1.5"
                >
                  <button
                    onClick={toggleSelectAll}
                    className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-[#183449] bg-white shadow-xs border border-[#588CBC]/20 whitespace-nowrap"
                  >
                    {selectedRooms.length === filteredRooms.length ? "Batal Semua" : "Pilih Semua"}
                  </button>

                  <button
                    onClick={() => {
                      setIsDeleteMode(false);
                      setSelectedRooms([]);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-red-600 bg-red-50 border border-red-100 shadow-xs"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedRooms.length === 0}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-[10px] font-black text-white shadow-lg transition-all active:scale-95 whitespace-nowrap",
                      selectedRooms.length > 0 ? "bg-red-500 shadow-red-200" : "bg-slate-300 shadow-none grayscale cursor-not-allowed"
                    )}
                  >
                    Hapus ({selectedRooms.length})
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="delete-mode-off"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsDeleteMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xs hover:bg-slate-50 transition-all"
                >
                  <Trash2 size={14} />
                  Mode Hapus
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100 gap-1.5">
            <button
              onClick={() => setActiveFilter('unreading')}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-1.5",
                activeFilter === 'unreading'
                  ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              Unreading
              {rooms.filter(r => r.unread > 0).length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-[#588CBC] animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('reading')}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all duration-300",
                activeFilter === 'reading'
                  ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              Reading
            </button>
            <button
              onClick={() => setShowBlessModal(true)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all duration-300 text-[#588CBC] hover:text-[#183449] hover:bg-[#588CBC]/10"
              )}
            >
              Bless Chat
            </button>
          </div>
        </div>

        {/* Bless Chat Modal */}
        <AnimatePresence>
          {showBlessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-4xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                  <div className="w-16 h-16 bg-[#588CBC]/20 rounded-2xl flex items-center justify-center mb-6">
                    <span className="text-3xl">📢</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Bless Chat</h3>
                  <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
                    Kirim pengumuman penting ke pengguna. Pilih target penerima di bawah ini.
                  </p>

                  {/* Target Selector */}
                  <div className="mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex gap-1.5">
                    <button
                      onClick={() => setBlessTargetMode('waiting_room')}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                        blessTargetMode === 'waiting_room' ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      )}
                    >
                      Active Room
                    </button>
                    <button
                      onClick={() => setBlessTargetMode('all_users')}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                        blessTargetMode === 'all_users' ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      )}
                    >
                      Semua Akun
                    </button>
                    <button
                      onClick={() => setBlessTargetMode('specific_users')}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                        blessTargetMode === 'specific_users' ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      )}
                    >
                      Pilih User
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {blessTargetMode === 'specific_users' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 overflow-hidden flex flex-col gap-3"
                      >
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] outline-none transition-all"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-xl border border-slate-100 p-2 flex flex-col gap-1 scrollbar-hide">
                          {allUsers.filter(u => u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.gmail.toLowerCase().includes(userSearchQuery.toLowerCase())).map(user => (
                            <label key={user.gmail} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                              <div className={cn(
                                "w-4 h-4 rounded shadow-inner flex items-center justify-center transition-colors border shrink-0",
                                selectedBlessUsers.includes(user.gmail) ? "bg-[#183449] border-[#183449] text-white" : "bg-white border-slate-300"
                              )}>
                                {selectedBlessUsers.includes(user.gmail) && <CheckCheck size={10} />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={selectedBlessUsers.includes(user.gmail)}
                                onChange={() => {
                                  setSelectedBlessUsers(prev =>
                                    prev.includes(user.gmail) ? prev.filter(g => g !== user.gmail) : [...prev, user.gmail]
                                  );
                                }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate">{user.username}</span>
                                <span className="text-[10px] font-medium text-slate-400 truncate">{user.gmail}</span>
                              </div>
                            </label>
                          ))}
                          {allUsers.length === 0 && (
                            <p className="text-center text-[10px] font-bold text-slate-400 p-4">Memuat data user...</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Pilih Templat:</p>
                    <div className="flex flex-wrap gap-2">
                      {blastTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setBlessMessage(template.content)}
                          className="px-3 py-2 bg-[#588CBC]/10 hover:bg-[#588CBC]/20 text-[#183449] text-[10px] font-black rounded-xl border border-[#588CBC]/20 transition-all active:scale-95"
                        >
                          {template.name}
                        </button>
                      ))}
                      <button
                        onClick={() => setBlessMessage('')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 transition-all active:scale-95"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={blessMessage}
                    onChange={(e) => setBlessMessage(e.target.value)}
                    placeholder={blessFile ? "Tambahkan keterangan file..." : "Tulis pengumuman di sini..."}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 transition-all resize-none font-medium"
                  />

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="bless-file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1024 * 1024) {
                                showAlert(`Waduh bro! Ukuran file lu (${(file.size / (1024 * 1024)).toFixed(2)} MB) kegedean. Maksimal cuma boleh 1 MB biar server tetep ngebut!`, 'Ukuran File Kegedean');
                                e.target.value = '';
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBlessFile({
                                  name: file.name,
                                  data: reader.result as string,
                                  type: file.type.startsWith('image/') ? 'image' : 'file'
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor="bless-file"
                          className="flex items-center gap-2 px-4 py-2 bg-[#588CBC]/10 hover:bg-[#588CBC]/20 text-[#183449] rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#588CBC]/20"
                        >
                          <Paperclip size={14} />
                          {blessFile ? 'Ganti File' : 'Lampirkan File'}
                        </label>
                        {blessFile && (
                          <button
                            onClick={() => setBlessFile(null)}
                            className="text-rose-500 text-xs font-bold hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      {/* Preview Section */}
                      {blessFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                          {blessFile.type === 'image' ? (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Gambar:</p>
                              <img
                                src={blessFile.data}
                                alt="Preview"
                                onClick={() => viewFile(blessFile.data, blessFile.name || "Gambar_Preview.png")}
                                className="w-full max-h-48 object-contain rounded-xl cursor-zoom-in hover:opacity-90 transition-all border border-slate-200 bg-slate-100/50"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 bg-[#588CBC]/20 rounded-lg flex items-center justify-center shrink-0">
                                  <FileText size={16} className="text-[#183449]" />
                                </div>
                                <p className="text-xs font-bold text-slate-700 truncate">{blessFile.name}</p>
                              </div>
                              <button
                                onClick={() => viewFile(blessFile.data, blessFile.name)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] font-black text-slate-600 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1"
                              >
                                <Eye size={12} />
                                Lihat Isi
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                  <button
                    onClick={() => {
                      setShowBlessModal(false);
                      setBlessFile(null);
                      setBlessMessage('');
                      setSelectedBlessUsers([]);
                    }}
                    className="flex-1 py-3.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBlessChat}
                    disabled={isBlasting || (!blessMessage.trim() && !blessFile)}
                    className="flex-2 py-3.5 bg-[#183449] text-white rounded-xl text-sm font-black shadow-lg shadow-[#183449]/20 hover:bg-[#588CBC] transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {isBlasting ? 'Mengirim...' : 'Kirim Sekarang'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          <div className="flex flex-col gap-1.5 pt-2">
            {filteredRooms.map(chat => {
              const isActive = selectedChat?.id === chat.id;
              return (
                <motion.div
                  key={chat.id}
                  initial={false}
                  onClick={() => isDeleteMode ? toggleSelectRoom(chat.id) : handleSelectRoom(chat)}
                  className={cn(
                    "relative p-4 flex items-center gap-4 rounded-3xl cursor-pointer transition-all duration-300 group",
                    isDeleteMode && selectedRooms.includes(chat.id) ? "bg-red-50 border-red-100 shadow-sm" :
                      isActive
                        ? "bg-white shadow-md border border-[#588CBC]/20"
                        : "hover:bg-slate-50/80 border border-transparent"
                  )}
                >
                  {isDeleteMode && (
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                      selectedRooms.includes(chat.id) ? "bg-red-500 border-red-500 text-white" : "border-slate-200 bg-white"
                    )}>
                      {selectedRooms.includes(chat.id) && <Plus size={14} className="rotate-45" />}
                    </div>
                  )}
                  {isActive && !isDeleteMode && (
                    <motion.div
                      layoutId="activeBar"
                      className="absolute left-0 w-1.5 h-10 bg-[#183449] rounded-r-full"
                    />
                  )}

                  <div className="relative shrink-0">
                    <Avatar size="md" className="transition-transform duration-300 group-hover:scale-105" />
                    {chat.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={cn(
                        "font-bold truncate text-sm tracking-tight transition-colors",
                        isActive ? "text-[#183449]" : "text-slate-700"
                      )}>
                        {chat.user_name || chat.user_gmail}
                      </h3>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        {format(new Date(chat.updated_at), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={cn(
                        "text-xs truncate pr-4 mt-1 flex-1",
                        (chat.unread > 0 || chat.is_marked_unread) ? "text-slate-700 font-bold" : "text-slate-400 font-medium"
                      )}>
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 ? (
                        <div className="bg-[#588CBC] text-white text-[10px] font-bold h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                          {chat.unread}
                        </div>
                      ) : chat.is_marked_unread ? (
                        <div className="bg-[#588CBC] w-3 h-3 rounded-full shadow-sm animate-pulse mt-1 mr-1"></div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* LOGOUT BUTTON AT BOTTOM */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={async () => {
              const storedUser = localStorage.getItem('user');
              if (storedUser) {
                const { token } = JSON.parse(storedUser);
                try {
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                } catch (err) {
                  console.error("Logout error:", err);
                }
              }
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-rose-100 text-rose-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-300 shadow-sm active:scale-[0.98]"
          >
            <LogOut size={18} />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
        {selectedChat ? (
          <div
            className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden"
            style={{
              backgroundImage: `url('/Batik.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <header className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-800 tracking-tight">{selectedChat.user_name || selectedChat.user_gmail}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      selectedChat.is_online ? "bg-[#588CBC] animate-pulse" : "bg-slate-300"
                    )}></span>
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      selectedChat.is_online ? "text-[#588CBC]" : "text-slate-400"
                    )}>
                      {selectedChat.is_online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                {isLocalSearchOpen ? (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 340 }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-4 py-1.5 h-10 ring-4 ring-[#588CBC]/5 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/10 transition-all duration-300 gap-2"
                  >
                    <SearchIcon size={16} className="text-[#183449] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                      placeholder="Cari pesan..."
                      className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 h-full p-0 min-w-25"
                    />
                    {localSearchQuery.trim() && (
                      <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 px-2 py-1 rounded-xl">
                        <span className="text-[10px] font-black text-slate-500 min-w-7.5 text-center select-none">
                          {searchMatchIndex}/{searchMatches.length}
                        </span>
                        <button
                          onClick={() => {
                            if (searchMatches.length === 0) return;
                            const nextIdx = searchMatchIndex <= 1 ? searchMatches.length : searchMatchIndex - 1;
                            setSearchMatchIndex(nextIdx);
                            scrollToMatch(nextIdx);
                          }}
                          className="text-slate-400 hover:text-[#588CBC] transition-colors"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (searchMatches.length === 0) return;
                            const nextIdx = searchMatchIndex >= searchMatches.length ? 1 : searchMatchIndex + 1;
                            setSearchMatchIndex(nextIdx);
                            scrollToMatch(nextIdx);
                          }}
                          className="text-slate-400 hover:text-[#588CBC] transition-colors"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setLocalSearchQuery('');
                        setIsLocalSearchOpen(false);
                      }}
                      className="text-slate-400 hover:text-rose-500 shrink-0 ml-1 transition-colors duration-300"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => setIsLocalSearchOpen(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#183449] transition-all"
                  >
                    <SearchIcon size={20} />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <AnimatePresence>
                    {isRoomMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsRoomMenuOpen(false)}></div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 origin-top-right"
                        >
                          <button
                            onClick={handleMarkAsUnread}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            Tandai belum dibaca
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => setSelectedChat(null)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col gap-8 scrollbar-hide"
            >
              <div className="flex justify-center mb-2">
                <span className="bg-white border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full uppercase tracking-widest">
                  Secure Communication
                </span>
              </div>

              <AnimatePresence>
                {(() => {
                  const filteredMessages = localSearchQuery.trim()
                    ? messages.filter((m: Message) => m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
                    : messages;
                  return filteredMessages.map((msg: Message, idx: number) => {
                    const isMe = msg.sender === 'admin';
                    return (
                      <motion.div
                        id={`msg-${msg.id || msg.timestamp}`}
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn(
                          "flex flex-col gap-1.5 max-w-[75%]",
                          isMe ? "self-end items-end" : "self-start items-start"
                        )}
                      >
                        <div className={cn(
                          "px-6 py-4 rounded-4xl shadow-md text-sm font-medium leading-relaxed relative",
                          isMe
                            ? "bg-linear-to-br from-[#183449] to-[#285577] text-white rounded-tr-none border border-[#588CBC]/40 shadow-lg shadow-[#183449]/15"
                            : "bg-white text-[#2B2B2B] rounded-tl-none border border-[#B3B3B3] shadow-sm"
                        )}>
                          {isFileMessage(msg) ? (
                            <FileChatBubble
                              messageText={msg.text}
                              messageType={msg.type}
                              isMe={isMe}
                              onViewFile={viewFile}
                              onDownloadFile={downloadFile}
                            />
                          ) : msg.type === 'image' ? (
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const parts = msg.text.split('|');
                                const imgData = parts.length > 1 ? parts[1] : msg.text;
                                const caption = parts.length > 2 ? parts.slice(2).join('|') : null;
                                return (
                                  <>
                                    <img
                                      src={imgData}
                                      alt="Sent image"
                                      onClick={() => viewFile(imgData, "Gambar_Lampiran.png")}
                                      className="rounded-2xl max-w-60 h-auto shadow-sm border border-slate-100 cursor-zoom-in hover:opacity-90 transition-all"
                                    />
                                    {caption && (
                                      <FormattedText text={caption} className="text-sm font-medium leading-relaxed mt-1 px-1" />
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            renderHighlightedText(msg.text, localSearchQuery)
                          )}
                          <div className={cn(
                            "flex items-center gap-2 mt-2.5 justify-end",
                            isMe ? "text-slate-300" : "text-[#848484]"
                          )}>
                            <span className="text-[10px] font-bold">{msg.timestamp}</span>
                            {isMe && <CheckCheck size={14} className="text-[#588CBC]" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 lg:px-8 pb-8 pt-2">
              <div className="bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-stretch gap-4">
                    <motion.button
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setIsTemplatePopupOpen(true)}
                      className="shrink-0 px-6 bg-white border border-[#588CBC]/30 text-[#183449] rounded-[28px] shadow-lg flex flex-col items-center justify-center hover:border-[#588CBC] hover:text-[#588CBC] hover:shadow-xl hover:shadow-slate-200 transition-all group gap-1 min-w-30"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#588CBC]/10 flex items-center justify-center group-hover:bg-[#183449] group-hover:text-white transition-all">
                        <LayoutGrid size={18} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">Template</span>
                    </motion.button>

                    <AnimatePresence mode="wait">
                      {selectedResponse ? (
                        <motion.div
                          key="selected"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex-1 p-4 bg-[#588CBC]/10 border border-[#588CBC]/20 rounded-[28px] flex items-start justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#588CBC]/20 flex items-center justify-center shrink-0">
                              <Clock size={18} className="text-[#183449]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black text-[#183449] uppercase tracking-widest mb-0.5">Selected Draft:</p>
                              <p className="text-sm text-[#2B2B2B]/80 italic font-medium leading-relaxed whitespace-pre-wrap">"{selectedResponse.response}"</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedResponse(null)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                          >
                            <X size={20} />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex-1 p-4 border-2 border-dashed border-slate-100 rounded-[28px] flex items-center justify-center bg-slate-50/30"
                        >
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Silakan pilih template untuk mempercepat balasan</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                    {/* MULTI-ATTACHMENT TRAY (Up to 5 files) */}
                    <AnimatePresence>
                      {pendingFiles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="p-3 bg-slate-50/95 border border-slate-200/90 rounded-2xl flex flex-col gap-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Lampiran ({pendingFiles.length}/5 File)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingFiles([]);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-wider"
                            >
                              Hapus Semua
                            </button>
                          </div>

                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {pendingFiles.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 max-w-60"
                              >
                                {file.type === 'image' ? (
                                  <img
                                    src={file.data}
                                    alt="Preview"
                                    className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-100"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-[#588CBC]/15 flex items-center justify-center text-[#588CBC] shrink-0 border border-[#588CBC]/20">
                                    <FileText size={18} />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-semibold">{file.sizeStr}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePendingFile(idx)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                                  title="Hapus file ini"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-end gap-3">
                      {/* Attachment Button */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,video/*"
                        multiple
                        className="hidden"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={handleFileClick}
                        className={cn(
                          "w-12 h-12 mb-1 rounded-2xl flex items-center justify-center transition-all shrink-0",
                          pendingFiles.length > 0
                            ? "bg-[#588CBC] text-white shadow-md shadow-[#588CBC]/30"
                            : "text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#183449]"
                        )}
                        title={pendingFiles.length > 0 ? `${pendingFiles.length} file terlampir (klik untuk tambah)` : "Lampirkan file (Maks 5)"}
                      >
                        <Paperclip size={24} />
                      </motion.button>

                      <div className="flex-1 relative">
                        <textarea
                          id="admin-web-message-input"
                          value={manualNote}
                          onChange={(e) => {
                            setManualNote(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                          }}
                          placeholder={
                            pendingFiles.length > 0
                              ? "Tambahkan catatan/keterangan file (opsional)..."
                              : selectedResponse
                              ? "Add personal notes..."
                              : "Type your message or select template..."
                          }
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all resize-none font-medium max-h-37.5 scrollbar-hide"
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!manualNote.trim() && !selectedResponse && pendingFiles.length === 0}
                        className="w-14 h-14 bg-[#183449] text-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#183449]/20 hover:bg-[#588CBC] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 disabled:shadow-none shrink-0"
                      >
                        <Send size={24} className="ml-1" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-12 scrollbar-hide bg-[#F8FAFB]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto flex flex-col gap-10"
            >
              {/* DASHBOARD HEADER */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-1 bg-[#588CBC] rounded-full"></div>
                  <span className="text-[10px] font-black text-[#183449] uppercase tracking-[0.3em]">Administrator Dashboard</span>
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Selamat Datang, {adminName}!</h2>
                <p className="text-slate-400 font-medium max-w-lg leading-relaxed">
                  Pantau seluruh aktivitas bantuan dan sistem user secara real-time dari panel kendali utama Anda.
                </p>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {[
                  { label: 'Total Chat', value: rooms.length, icon: MessageSquare, color: 'blue', detail: 'Live Sync' },
                  { label: 'Unread', value: rooms.filter(r => (r.unread_count || 0) > 0).length, icon: Clock, color: 'rose', detail: 'Perlu Respon' },
                  { label: 'Reading', value: rooms.filter(r => (r.unread_count || 0) === 0).length, icon: CheckCheck, color: 'cyan', detail: 'Terbaca' },
                  { label: 'Sistem AI', value: isInfoActive ? 'Aktif' : 'Non-Aktif', icon: Settings, color: 'indigo', detail: 'Auto-Response' },
                  { label: 'Aktif Online', value: rooms.filter(r => r.is_online).length, icon: Search, color: 'amber', detail: 'User Online' }
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                  >
                    <div className={cn(
                      "absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 opacity-20",
                      stat.color === 'blue' ? "bg-[#588CBC]" :
                        stat.color === 'rose' ? "bg-rose-400" :
                          stat.color === 'cyan' ? "bg-cyan-400" :
                            stat.color === 'indigo' ? "bg-indigo-400" : "bg-amber-400"
                    )}></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
                        stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                          stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                            stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                              stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                      )}>
                        <stat.icon size={20} />
                      </div>
                      <span className={cn(
                        "text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap",
                        stat.color === 'blue' ? "bg-[#588CBC]/10 text-[#183449]" :
                          stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                            stat.color === 'cyan' ? "bg-cyan-50 text-cyan-600" :
                              stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                      )}>{stat.detail}</span>
                    </div>
                    <div className="relative z-10">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                      <h3 className="text-xl font-black text-slate-800 mt-1 tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                        {stat.value}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* SYSTEM STATUS CARD - DARK BLUE THEME */}
<div className="lg:col-span-2 bg-gradient-to-br from-[#07111E] to-[#0F2238] p-10 rounded-[48px] text-white shadow-2xl shadow-[#0B192C]/50 relative overflow-hidden group">
  {/* Ambient Glow Effects */}
  <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/5 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-1000"></div>
  <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#38BDF8]/15 rounded-full blur-[60px]"></div>

  <div className="relative z-10 h-full flex flex-col justify-between gap-12">
    {/* Top Section */}
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-2">
        <span className="px-3 py-1 bg-[#38BDF8]/20 border border-[#38BDF8]/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] w-fit backdrop-blur-md text-[#E0F2FE]">
          System Performance
        </span>
        <h4 className="text-3xl font-bold tracking-tight text-white">Gateway Admin UNJ</h4>
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex items-center justify-center">
            <span className="w-3 h-3 bg-[#38BDF8] rounded-full animate-ping opacity-75"></span>
            <span className="absolute w-2 h-2 bg-[#38BDF8] rounded-full"></span>
          </div>
          <span className="text-xs font-bold text-[#38BDF8] uppercase tracking-widest">Server Operational</span>
        </div>
      </div>
      
      {/* Logo Wrapper */}
      <div className="w-16 h-16 bg-white/10 rounded-[28px] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden p-2">
        <Image src="/unj.png" alt="UNJ Logo" width={36} height={36} className="object-contain drop-shadow-md" />
      </div>
    </div>

    {/* Bottom Section - Metrics */}
    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
      <div>
        <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Network Latency</p>
        <p className="text-xl font-bold text-white">{networkLatency}ms <span className="text-[10px] font-medium text-[#38BDF8]">
          {networkLatency < 50 ? 'Excellent' : networkLatency < 100 ? 'Good' : 'Fair'}
        </span></p>
      </div>
      <div>
        <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest mb-1">Total User</p>
        <p className="text-xl font-bold text-white">{formatNumber(totalUsersCount)} <span className="text-[10px] font-medium text-[#38BDF8]">Registered</span></p>
      </div>
    </div>
  </div>
</div>

                {/* QUICK ACTIONS PANEL */}
                <div className="flex flex-col gap-6">
                  {/* DENAH GEDUNG */}
                  <div className="flex flex-col gap-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Denah Gedung</h4>
                    <div className="flex flex-col gap-4">
                      {[
                        { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-300', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', arrow: 'group-hover:text-blue-500' },
                        { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-300', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', arrow: 'group-hover:text-orange-500' },
                        { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-[#588CBC]/30 hover:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#183449]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', arrow: 'group-hover:text-[#588CBC]' }
                      ].map((gedung, i) => (
                        <motion.div
                          key={gedung.href}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.1 }}
                        >
                          <Link
                            href={gedung.href}
                            className={cn(
                              "group relative flex items-center justify-between gap-4 overflow-hidden rounded-4xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/60",
                              gedung.border
                            )}
                          >
                            <div className={cn(
                              "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30",
                              gedung.glow
                            )}></div>
                            <div className="relative z-10 flex min-w-0 items-center gap-4">
                              <div className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                                gedung.tile
                              )}>
                                <gedung.icon size={22} strokeWidth={1.75} />
                              </div>
                              <div className="min-w-0">
                                <span className={cn(
                                  "mb-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                                  gedung.badge
                                )}>{gedung.code}</span>
                                <p className="text-sm font-bold leading-snug text-slate-700">{gedung.label}</p>
                                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{gedung.desc}</p>
                              </div>
                            </div>
                            <ChevronRight
                              size={18}
                              className={cn("relative z-10 shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1", gedung.arrow)}
                            />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER TIPS */}
              <div className="bg-white/50 p-8 rounded-[40px] border border-slate-100 flex gap-6 items-center">
                <div className="w-14 h-14 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">💡</div>
                <div>
                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Petunjuk Admin</h5>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">
                    Gunakan panel sidebar untuk membalas chat user secara cepat. Anda juga bisa mengaktifkan <span className="text-[#588CBC] font-bold">Auto-Response AI</span> di bagian atas header untuk membantu menjawab pertanyaan umum secara otomatis.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Template Popup Modal */}
      <AnimatePresence>
        {isTemplatePopupOpen && (
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplatePopupOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-linear-to-r from-[#183449] to-[#2B5474] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight">Template Balasan</h3>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Pilih kategori dan pertanyaan</p>
                </div>
                <button
                  onClick={() => setIsTemplatePopupOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Categories Sidebar */}
                <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-2 overflow-y-auto">
                  {Array.from(new Set(cannedResponses.map(r => r.category))).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-wider transition-all",
                        activeCategory === cat
                          ? "bg-[#183449] text-white shadow-lg shadow-[#183449]/20"
                          : "text-slate-400 hover:bg-white hover:text-[#588CBC]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Questions List */}
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                  <div className="grid grid-cols-1 gap-4">
                    {cannedResponses.filter(r => r.category === activeCategory).map(resp => (
                      <motion.button
                        key={resp.id}
                        whileHover={{ x: 5 }}
                        onClick={() => {
                          setSelectedResponse(resp);
                          setIsTemplatePopupOpen(false);
                        }}
                        className="p-5 bg-white border border-slate-100 rounded-3xl text-left hover:border-[#588CBC]/40 hover:shadow-xl hover:shadow-slate-100 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-[#588CBC]/15 text-[8px] font-black text-[#183449] rounded uppercase tracking-widest">{resp.keyword}</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 leading-snug group-hover:text-[#183449] transition-colors">{resp.question}</p>
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{resp.response}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Enlarged"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
              onClick={() => setSelectedImage(null)}
            >
              Tutup (Esc)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI CONFIRMATION MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAIConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowAIConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-4xl overflow-hidden shadow-2xl"
            >
              {/* Header Gradient */}
              <div className={`p-6 ${pendingAIState ? 'bg-linear-to-br from-[#183449] to-[#2B5474]' : 'bg-linear-to-br from-[#2B2B2B] to-[#565656]'} relative overflow-hidden`}>
                <div className="absolute -top-5 -right-5 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                    <span className="text-2xl">{pendingAIState ? '🤖' : '🔕'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-0.5">Konfirmasi</p>
                    <h3 className="text-lg font-black text-white leading-tight">
                      {pendingAIState ? 'Aktifkan AI?' : 'Matikan AI?'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-4">
                {pendingAIState ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      Fitur <span className="text-[#588CBC]">Auto-Response AI</span> akan diaktifkan untuk semua chat yang masuk.
                    </p>
                    <div className="bg-[#588CBC]/10 rounded-2xl p-4 flex flex-col gap-2 border border-[#588CBC]/20">
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">✅</span>
                        <p className="text-xs font-semibold text-slate-600">AI akan otomatis menjawab pertanyaan user berdasarkan template yang sudah dilatih</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">✅</span>
                        <p className="text-xs font-semibold text-slate-600">Respons akan muncul dalam hitungan detik</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">⚠️</span>
                        <p className="text-xs font-semibold text-slate-500">Pastikan ML Service sudah berjalan sebelum mengaktifkan</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      Fitur <span className="text-slate-600">Auto-Response AI</span> akan dinonaktifkan.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2 border border-slate-100">
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">ℹ️</span>
                        <p className="text-xs font-semibold text-slate-600">Semua chat selanjutnya harus dijawab secara manual oleh admin</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm mt-0.5">ℹ️</span>
                        <p className="text-xs font-semibold text-slate-600">Chat yang sedang berjalan tidak terpengaruh</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => setShowAIConfirm(false)}
                    className="flex-1 py-3.5 rounded-2xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleToggleAI(pendingAIState)}
                    className={`flex-1 py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${pendingAIState
                      ? 'bg-[#183449] hover:bg-[#588CBC] shadow-[#183449]/20'
                      : 'bg-slate-700 hover:bg-slate-800 shadow-slate-200'
                      }`}
                  >
                    {pendingAIState ? '🚀 Ya, Aktifkan!' : '🔕 Ya, Matikan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
      <FilePreviewModal
        isOpen={!!selectedExcelFile}
        onClose={() => setSelectedExcelFile(null)}
        fileData={selectedExcelFile?.data || ''}
        fileName={selectedExcelFile?.name || ''}
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
};

export default WebTabLayout;



