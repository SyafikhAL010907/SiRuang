'use client';

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  Paperclip,
  CheckCheck,
  MessageSquare,
  HelpCircle,
  Clock,
  Search as SearchIcon,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  LogOut,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  LayoutGrid,
  Trash2,
  Calendar,
  ChevronRight,
  Building2,
  Cpu,
  HardHat
} from 'lucide-react';
import { Message, CannedResponse } from '@/constants/chatTypes';
import { cannedQuestions as cannedResponses } from '@/constants/cannedQuestions';
import { jadwalPenmaba } from '@/constants/jadwalPenmaba';
import Link from 'next/link';
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
        const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr.split(' ')[1];
        if (timePart) {
            return timePart.substring(0, 5); // Ambil HH:mm
        }
        return format(new Date(dateStr), 'HH:mm');
    } catch (e) {
        return '--:--';
    }
};

const WebTabLayout = () => {
  const [userName, setUserName] = useState('User');
  const [userGmail, setUserGmail] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [manualNote, setManualNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    if (!query.trim()) return <FormattedText text={text} className="wrap-anywhere leading-relaxed" />;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className="whitespace-pre-wrap leading-relaxed wrap-anywhere">
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-amber-300 text-slate-900 font-extrabold px-1 rounded-sm shadow-sm border border-amber-400 mx-0.5 select-all">
              {part}
            </span>
          ) : (
            <FormattedText key={i} text={part} className="wrap-anywhere inline" />
          )
        )}
      </span>
    );
  };
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('userActiveChat') === 'true';
    }
    return false;
  });

  useEffect(() => {
    sessionStorage.setItem('userActiveChat', isChatOpen.toString());
    if (isChatOpen) {
      setUnreadCount(0);
      const storedUser = localStorage.getItem('user');
      if (storedUser && roomId) {
        try {
          const { token } = JSON.parse(storedUser);
          markAsRead(roomId, token);
        } catch (e) {}
      }
    }
  }, [isChatOpen, roomId]);
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string, data: string, type: 'image' | 'file', sizeStr?: string }>>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Informasi Umum');
  const [alertConfig, setAlertConfig] = useState<{show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void}>({show: false, type: 'alert', message: ''});

  const showAlert = (message: string, title?: string) => setAlertConfig({show: true, type: 'alert', message, title});

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
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserName(parsed.username || parsed.Username || 'User');
      // Ambil gmail dengan berbagai kemungkinan penulisan
      const email = parsed.gmail || parsed.Gmail || parsed.email || parsed.Email || '';
      setUserGmail(email);
      
      if (email) {
        initChat(email, parsed.token);
      }
    }
  }, []);

  const initChat = async (gmail: string, token: string) => {
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
        
        // Polling setiap 3 detik
        const interval = setInterval(() => fetchMessages(roomData.id, token, gmail), 3000);
        return () => clearInterval(interval);
      }
    } catch (err) {
      console.error("Gagal inisialisasi chat:", err);
    }
  };

  useEffect(() => {
    if (roomId && userGmail) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const { token } = JSON.parse(storedUser);
            const interval = setInterval(() => fetchMessages(roomId, token, userGmail), 3000);
            return () => clearInterval(interval);
        }
    }
  }, [roomId, userGmail]);

  const fetchMessages = async (id: number, token: string, currentGmail: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/messages/${id}`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMessages(data.map((m: any) => ({
          id: m.id.toString(),
          sender: m.sender_gmail.toLowerCase() === currentGmail.toLowerCase() ? 'user' : 'admin',
          text: m.message,
          timestamp: toLocalTime(m.created_at),
          type: m.message_type
        })));

        if (isChatOpen) {
          markAsRead(id, token);
          setUnreadCount(0);
        } else {
          const unreadAdminCount = data.filter((m: any) => m.sender_gmail.toLowerCase() !== currentGmail.toLowerCase() && m.is_read === 0).length;
          setUnreadCount(unreadAdminCount);
        }
      }
    } catch (err) {
      console.error("Gagal ambil pesan:", err);
    }
  };

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

  const markAsRead = async (id: number, token: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/mark-read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
    } catch (err) {
      console.error("Gagal mark read user:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    
    const combinedText = selectedResponse
      ? `${selectedResponse.response}\n\nCatatan Tambahan:\n${manualNote}`
      : manualNote;

    if (!combinedText.trim() && pendingFiles.length === 0) return;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token, gmail } = JSON.parse(storedUser);

    try {
      if (pendingFiles.length > 0) {
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
              room_id: roomId,
              sender_gmail: gmail,
              message: msgText,
              message_type: pf.type
            })
          });
        } else {
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
              room_id: roomId,
              sender_gmail: gmail,
              message: JSON.stringify(payload),
              message_type: 'multi_file'
            })
          });
        }
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/send`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            room_id: roomId,
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
      const el = document.getElementById('user-web-message-input');
      if (el) el.style.height = 'auto';
      fetchMessages(roomId, token, gmail);
    } catch (err) {
      console.error("Gagal kirim pesan:", err);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.from(e.target.files || []);
    if (chosenFiles.length === 0 || !roomId) return;

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
      {/* Sidebar - Integrated Info (Instead of Chat List) */}
      <aside className="w-75 lg:w-95 bg-white border-r border-slate-100 flex flex-col z-20 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500">
        
        {/* TOP PREMIUM CARD (Matching Mobile Header style) */}
        <div className="p-4">
            <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-4xl p-6 text-white shadow-2xl shadow-[#183449]/20 relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute -top-5 -right-5 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-[#588CBC]/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-700"></div>

                <div className="relative z-10 flex flex-col gap-8">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
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
                                <h3 className="text-lg font-black tracking-tighter leading-none">Q & A  UNJ</h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 bg-[#588CBC] text-[7px] font-black text-white rounded-md uppercase tracking-wider border border-[#588CBC]/40 shadow-sm">
                                        HelpDesk 
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Welcome Message */}
                    <div 
                        onClick={() => setIsChatOpen(true)}
                        className="cursor-pointer group/card"
                    >
                        <h4 className="text-xl font-bold leading-tight tracking-tight">Selamat Datang, {userName}!</h4>
                        <div className={cn(
                            "mt-4 flex items-center gap-2 w-fit px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-500",
                            unreadCount > 0 
                                ? "bg-rose-500/20 border-rose-500/30 animate-pulse" 
                                : "bg-white/10 border-white/10 group-hover/card:bg-white/20"
                        )}>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(88,140,188,0.8)]",
                                unreadCount > 0 ? "bg-rose-400" : "bg-[#588CBC]"
                            )}></span>
                            <span className="text-[9px] font-bold tracking-tight">
                                {unreadCount > 0 ? `${unreadCount} Balasan Baru` : "Admin Siap Membantu"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 px-6 flex flex-col gap-6 pt-2 overflow-y-auto scrollbar-hide">
            <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Panduan Cepat</h4>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => setIsTemplatePopupOpen(true)}
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-[#588CBC]/5 hover:border-[#588CBC]/30 transition-all select-none w-full"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#588CBC]/10 flex items-center justify-center group-hover:bg-[#588CBC] group-hover:text-white transition-all">
                                <LayoutGrid size={16} className="text-[#588CBC] group-hover:text-white transition-all" />
                            </div>
                            <span className="text-xs font-black text-slate-700 group-hover:text-[#183449] tracking-tight leading-tight">Template Pertanyaan</span>
                        </div>
                        <HelpCircle size={14} className="text-slate-300 group-hover:text-[#588CBC]" />
                    </button>
                </div>
            </div>

            {/* Support Info Section */}
            <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Jam Layanan</h4>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#588CBC]/10 flex items-center justify-center">
                            <Clock size={16} className="text-[#588CBC]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Senin - Jumat</span>
                            <span className="text-xs font-black text-slate-700 leading-none mt-1">09:00 - 16:00 WIB</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="p-4 mt-auto">
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
                            console.error("Logout API failed:", err);
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
      <main 
        className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden"
        style={{
          backgroundImage: `url('/Batik.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isChatOpen ? (
          <>
            {/* Header */}
            <header className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar src="/unj.png" size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-800 tracking-tight">Admin  UNJ</h2>
                    <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-md tracking-tighter uppercase">OFFICIAL</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                {isLocalSearchOpen ? (
                  <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 340 }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-4 py-1.5 h-10 ring-4 ring-[#588CBC]/10 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/20 transition-all duration-300 gap-2"
                  >
                    <SearchIcon size={16} className="text-[#588CBC] shrink-0" />
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#588CBC] transition-all"
                  >
                    <SearchIcon size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                >
                  <X size={20} />
                </button>
              </div>
            </header>
            {/* Messages Area */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col gap-8 scrollbar-hide"
            >
          <div className="flex justify-center mb-2">
            <span className="bg-white border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full uppercase tracking-widest">
              Layanan Bantuan Resmi UNJ
            </span>
          </div>
          
          <AnimatePresence>
            {(() => {
              const filteredMessages = localSearchQuery.trim()
                ? messages.filter((m: Message) => m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
                : messages;
              return filteredMessages.map((msg: Message, idx: number) => {
                const isMe = msg.sender === 'user';
                return (
                <motion.div
                  id={`msg-${msg.id || msg.timestamp}`}
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex flex-col gap-1.5 max-w-[85%] md:max-w-[75%] min-w-0 w-fit",
                    isMe ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  <div className={cn(
                    "w-fit max-w-full px-6 py-4 rounded-3xl md:rounded-4xl shadow-md text-sm font-medium leading-relaxed relative wrap-anywhere min-w-0",
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

        {/* Input Area */}
        <div className="px-4 lg:px-8 pb-8 pt-2">
          <div className="bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-6 flex flex-col gap-4">
              {selectedResponse && (
                <div className="flex items-stretch gap-4 w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 p-4 bg-[#588CBC]/5 border border-[#B3B3B3] rounded-[28px] flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#588CBC]/15 flex items-center justify-center shrink-0">
                          <Clock size={18} className="text-[#588CBC]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-[#183449] uppercase tracking-widest mb-0.5">Selected Draft:</p>
                          <p className="text-sm text-[#183449]/70 italic font-medium leading-relaxed whitespace-pre-wrap">"{selectedResponse.response}"</p>
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
                  </AnimatePresence>
                </div>
              )}

              <div className="p-4">
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
                          : "text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#588CBC]"
                      )}
                      title={pendingFiles.length > 0 ? `${pendingFiles.length} file terlampir (klik untuk tambah)` : "Lampirkan file (Maks 5)"}
                    >
                      <Paperclip size={24} />
                    </motion.button>
                    
                    <div className="flex-1 relative">
                      <textarea
                        id="user-web-message-input"
                        value={manualNote}
                        onChange={(e) => {
                            setManualNote(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                        }}
                        placeholder={pendingFiles.length > 0 ? "Tambahkan catatan/keterangan file (opsional)..." : "Tulis pertanyaanmu di sini..."}
                        className="w-full min-w-0 px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all resize-none font-medium max-h-37.5 scrollbar-hide wrap-anywhere"
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
      </>
    ) : (
          <div className="flex-1 flex flex-col items-center justify-start p-12 overflow-y-auto text-center bg-white">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center max-w-sm mb-12 shrink-0"
              >
                  <div className="w-24 h-24 bg-slate-100 rounded-4xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[#588CBC]/10 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full"></div>
                      <Image src="/unj.png" alt="Logo" width={60} height={60} className="relative z-10" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Admin  UNJ</h2>
                  {/* Jadwal Penmaba Card (Replaces Search Bar) */}
                  <motion.button 
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsJadwalModalOpen(true)}
                      className="w-full bg-white rounded-full shadow-xl shadow-slate-200/40 p-1 border-2 border-[#B3B3B3] hover:border-[#588CBC] focus:outline-none transition-all duration-300 flex items-center justify-between mb-8"
                  >
                      <div className="flex items-center gap-3 px-3 h-11">
                          <Calendar size={18} className="text-[#588CBC] shrink-0" />
                          <div className="flex flex-col text-left">
                              <span className="text-[11px] font-black text-slate-800 leading-tight">Cek Jadwal Penting Penmaba 2026</span>
                              <span className="text-[9px] font-bold text-[#588CBC] uppercase tracking-wider leading-tight mt-0.5">Info pendaftaran & ujian</span>
                          </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#588CBC]/10 text-[#588CBC] flex items-center justify-center mr-1 shrink-0">
                          <ChevronRight size={14} />
                      </div>
                  </motion.button>

                  <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                    Klik tombol dibawah ini untuk  mulai berkonsultasi dengan petugas kami.
                  </p>
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="px-8 py-3.5 bg-[#183449] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#183449]/20 hover:bg-[#588CBC] hover:scale-105 active:scale-95 transition-all relative w-full mb-4"
                  >
                    BUKA CHAT SEKARANG
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#588CBC] text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border-2 border-white animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>
              </motion.div>

              <div className="w-full mt-4 border-t border-slate-100/80 pt-4">
  <div className="flex flex-col gap-5 text-left">
    
    {/* Header Section */}
    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <Building2 size={22} className="text-[#183449]" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Denah Gedung</h3>
      </div>
      <span className="px-3 py-1 bg-[#588CBC]/10 text-[#183449] text-[10px] font-black rounded-full uppercase tracking-widest">
        3 Gedung
      </span>
    </div>

    {/* List Container - Diubah jadi Grid 3 Kolom */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mt-2">
      {[
        // Urutan 1: Elektro (LE)
        { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-400', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', image: '/Lantai3.png' },
        // Urutan 2: SFD 
        { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-slate-200 hover:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#588CBC]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', image: '/Lantai3.png' },
        // Urutan 3: Sipil (LS)
        { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-400', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', image: '/Lantai3.png' }
      ].map((gedung, i) => (
        <motion.div
          key={gedung.href}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1 }}
          className="h-full"
        >
          <Link
            href={gedung.href}
            className={cn(
              // border diubah jadi border-2 biar lebih tebal
              "group relative flex flex-col w-full h-full gap-5 overflow-hidden rounded-[28px] border-2 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 active:scale-[0.99]",
              gedung.border
            )}
          >
            {/* Efek Glow di Pojok Kanan Atas */}
            <div className={cn(
              "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20",
              gedung.glow
            )}></div>

            {/* Container Gambar (Posisi Teratas) - border-2 ditambahin & efek zoom gambar dihapus */}
            <div className="w-full h-40 rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border-2 border-slate-100/60">
              <img 
                src={gedung.image} 
                alt={gedung.label} 
                className="w-full h-full object-cover" 
                loading="lazy"
              />
            </div>

            {/* Container Icon & Teks */}
            <div className="relative z-10 flex items-start gap-4">
              <div className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                gedung.tile
              )}>
                <gedung.icon size={22} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "mb-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                  gedung.badge
                )}>{gedung.code}</span>
                <p className="text-base font-bold leading-snug text-slate-700 truncate">{gedung.label}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-400 truncate">{gedung.desc}</p>
              </div>
            </div>

            {/* Tombol "Lihat Denah" di bagian paling bawah */}
            <span className={cn(
              "relative z-10 flex w-full justify-between items-center mt-auto rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors",
              gedung.badge
            )}>
              Lihat Denah
              <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
</div>
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
              <div className="px-8 py-6 bg-[#183449] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight">Template Pertanyaan</h3>
                  <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">Pilih kategori bantuan</p>
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
                          ? "bg-[#588CBC] text-white shadow-lg shadow-[#588CBC]/20" 
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
                          setIsChatOpen(true);
                        }}
                        className="p-5 bg-white border border-slate-100 rounded-3xl text-left hover:border-[#588CBC]/40 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                           <span className="px-2 py-0.5 bg-[#588CBC]/10 text-[8px] font-black text-[#588CBC] rounded uppercase tracking-widest">{resp.keyword}</span>
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

      {/* Jadwal Modal Popup */}
      <AnimatePresence>
        {isJadwalModalOpen && (
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJadwalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-[#183449] text-white flex items-center justify-between relative shrink-0">
                <div className="absolute -top-7.5 -right-7.5 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 text-white">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    <Calendar size={24} className="text-[#588CBC]" />
                    Kalender & Jadwal
                  </h3>
                  <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Jadwal Penting PENMABA UNJ 2026
                  </p>
                </div>
                <button 
                  onClick={() => setIsJadwalModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-all text-white relative z-10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Schedules List */}
              <div className="flex-1 p-8 overflow-y-auto scrollbar-hide bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {jadwalPenmaba.map((event) => (
                    <motion.div
                      key={event.id}
                      whileTap={{ scale: 0.98 }}
                      className="p-6 bg-white border border-slate-100 rounded-3xl text-left hover:border-[#588CBC]/40 hover:shadow-xl hover:shadow-[#183449]/5 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-2 justify-between">
                         <span className={cn(
                           "px-2.5 py-1 text-[8px] font-black rounded uppercase tracking-widest",
                           event.category === 'PENDAFTARAN' && "bg-blue-50 text-blue-600",
                           event.category === 'UJIAN' && "bg-amber-50 text-amber-600",
                           event.category === 'PENGUMUMAN' && "bg-[#588CBC]/10 text-[#183449]"
                         )}>
                           {event.category}
                         </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 leading-snug mb-2">
                        {event.title}
                      </p>
                      <p className="text-[12px] font-bold text-slate-500 leading-relaxed">
                        {event.dateRange}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center shrink-0">
                 <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({...alertConfig, show: false})} />
      <FilePreviewModal
        isOpen={!!selectedExcelFile}
        onClose={() => setSelectedExcelFile(null)}
        fileData={selectedExcelFile?.data || ''}
        fileName={selectedExcelFile?.name || ''}
      />
    </div>
  );
};

export default WebTabLayout;



