'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  MessageCircle, 
  User,
  Plus,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Send,
  Paperclip,
  CheckCheck,
  HelpCircle,
  Search,
  LogOut,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Clock,
  LayoutGrid,
  X,
  Trash2,
  MessageSquare,
  Calendar,
  Building2,
  Cpu,
  HardHat
} from 'lucide-react';
import { Message, CannedResponse } from '@/constants/chatTypes';
import { cannedQuestions as cannedResponses } from '@/constants/cannedQuestions';
import { jadwalPenmaba } from '@/constants/jadwalPenmaba';
import Link from 'next/link';
import Image from 'next/image';
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

const NotchedBackground = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 1000 80"
            preserveAspectRatio="xMidYMin slice"
            className="drop-shadow-[0_-5px_20px_rgba(0,0,0,0.05)] filter transition-all duration-500"
        >
            <path
                d="M-500,40 
                   C-500,18 -482,0 -460,0 
                   L430,0 
                   C450,0 455,5 460,15 
                   C480,62 520,62 540,15 
                   C545,5 550,0 570,0 
                   L1460,0 
                   C1482,0 1500,18 1500,40 
                   L1500,40 
                   C1500,62 1482,80 1460,80 
                   L-460,80 
                   C-482,80 -500,62 -500,40 
                   Z"
                className="fill-white backdrop-blur-3xl stroke-slate-100"
                strokeWidth="1"
            />
        </svg>
    </div>
);

const MobileLayout = () => {
  const [userName, setUserName] = useState('User');
  const [userGmail, setUserGmail] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [chatView, setChatView] = useState<'LIST' | 'ROOM'>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('userActiveChat') === 'true' ? 'ROOM' : 'LIST';
    }
    return 'LIST';
  });

  useEffect(() => {
    sessionStorage.setItem('userActiveChat', (chatView === 'ROOM' && activeTab === 'chats').toString());
    if (chatView === 'ROOM' && activeTab === 'chats') {
      setUnreadCount(0);
      const storedUser = localStorage.getItem('user');
      if (storedUser && roomId) {
        try {
          const { token } = JSON.parse(storedUser);
          markAsRead(roomId, token);
        } catch (e) {}
      }
    }
  }, [chatView, activeTab, roomId]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isLocalSearchOpen, setIsLocalSearchOpen] = useState(false);
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
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
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ name: string, data: string, type: 'image' | 'file', sizeStr?: string }>>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
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
      setUserGmail(parsed.gmail);
      initChat(parsed.gmail, parsed.token);
    }
  }, []);

  const initChat = async (gmail: string, token: string) => {
    try {
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

        if (activeTab === 'chats' && chatView === 'ROOM') {
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
      ? `${selectedResponse.response}\n\nCatatan Tambahan:\n${newMessage}`
      : newMessage;

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
            room_id: roomId,
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
            room_id: roomId,
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
            room_id: roomId,
            sender_gmail: gmail,
            message: combinedText.trim(),
            message_type: 'text'
          })
        });
      }

      setNewMessage('');
      setSelectedResponse(null);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const el = document.getElementById('user-message-input');
      if (el) el.style.height = 'auto';
      fetchMessages(roomId, token, gmail);
    } catch (err) {
      console.error("Gagal kirim pesan:", err);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) : [];
    if (!rawFiles.length || !roomId) return;

    const totalFiles = pendingFiles.length + rawFiles.length;
    if (totalFiles > 5) {
      showAlert(`Maksimal hanya boleh melampirkan 5 file sekaligus, bro! Kamu sudah melampirkan ${pendingFiles.length} file.`, 'Batas Maksimal File');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validFiles: File[] = [];
    for (const file of rawFiles) {
      if (file.size > 1024 * 1024) {
        showAlert(`Waduh bro! File "${file.name}" ukurannya (${(file.size / (1024 * 1024)).toFixed(2)} MB) kegedean. Maksimal cuma boleh 1 MB per file biar server tetep ngebut!`, 'Ukuran File Kegedean');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    let loadedCount = 0;
    const newItems: Array<{ name: string; data: string; type: 'image' | 'file'; sizeStr?: string }> = [];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
        newItems.push({
          name: file.name,
          data: base64Data,
          type: fileType,
          sizeStr: sizeStr
        });
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setPendingFiles(prev => [...prev, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Beranda' },
    { id: 'chats', icon: MessageCircle, label: 'Chat' },
    { id: 'logout', icon: LogOut, label: 'Keluar' },
  ];

  return (
    <div className="h-screen w-full bg-slate-50 overflow-hidden relative font-sans text-slate-900">
      <AnimatePresence mode="wait">
        {activeTab === 'chats' ? (
          <motion.div
            key="chats-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full bg-slate-50"
          >
            <AnimatePresence mode="wait">
              {chatView === 'LIST' ? (
                <motion.div
                  key="chat-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col h-full"
                >
                  {/* List Header */}
                  <div className="bg-[#183449] rounded-b-[40px] px-6 pt-12 pb-16 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-5 -right-5 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <header className="relative z-10">
                      <h2 className="text-xl font-black text-white tracking-tight leading-none">Pesan Bantuan</h2>
                      <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-2">Hubungi Admin UNJ</p>
                    </header>
                  </div>

                  {/* Jadwal Penmaba Card (Replaces Search Bar) */}
                  <div className="px-6 -mt-8 relative z-20 mb-4">
                      <motion.button 
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsJadwalModalOpen(true)}
                          className="w-full bg-white rounded-full shadow-xl shadow-slate-200/40 p-1.5 border-2 border-[#B3B3B3] hover:border-[#588CBC] focus:outline-none transition-all duration-300 flex items-center justify-between"
                      >
                          <div className="flex items-center gap-3 px-4 h-11">
                              <Calendar size={18} className="text-[#588CBC] shrink-0" />
                              <div className="flex flex-col text-left">
                                  <span className="text-[11px] font-black text-slate-800 leading-tight">Cek Jadwal Penting Penmaba 2026</span>
                                  <span className="text-[9px] font-bold text-[#588CBC] uppercase tracking-wider">Info pendaftaran & ujian</span>
                              </div>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-[#588CBC]/10 text-[#588CBC] flex items-center justify-center mr-1">
                              <ChevronRight size={16} />
                          </div>
                      </motion.button>
                  </div>

                  {/* Admin Room Item - Refined & Clean */}
                  <main className="flex-1 px-6 overflow-y-auto scrollbar-hide pb-32">
                    <div className="flex flex-col gap-4 mt-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2">Admin Helpdesk </h4>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setChatView('ROOM')}
                        className="w-full bg-white p-6 rounded-4xl shadow-xl shadow-slate-200/30 border border-slate-100 flex items-center gap-5 group active:bg-[#588CBC]/10 active:border-[#588CBC]/30 transition-all duration-300"
                      >
                        <div className="relative">
                          <div className="w-16 h-16 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-[#588CBC] ring-4 ring-slate-50">
                            <Image src="/unj.png" alt="UNJ" width={40} height={40} className="drop-shadow-md" />
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-center">
                            <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1">
                              <span>Admin </span>
                              <ChevronRight size={16} className="text-slate-400" />
                            </h4>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#588CBC] group-hover:text-white transition-all">
                           <MessageCircle size={18}     />
                        </div>
                      </motion.button>

                      {/* Info Card - Dark Blue & Light Blue Gradient */}
                      <div className="p-6 bg-linear-to-br from-[#183449] to-[#2B5474] rounded-4xl text-white relative overflow-hidden shadow-2xl shadow-[#183449]/20">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-[#588CBC]/15 rounded-full blur-3xl"></div>
                         <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-2">Info Layanan</h5>
                         <p className="text-[11px] text-[#B3B3B3] font-medium leading-relaxed">Admin akan merespon pesan Anda segera dalam jam operasional.</p>
                      </div>
                    </div>
                  </main>
                </motion.div>
              ) : (
                <motion.div
                  key="chat-room"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full bg-slate-50"
                  style={{
                    backgroundImage: `url('/Batik.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Room Header */}
                  <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 p-4 pt-12 flex items-center gap-3 z-30">
                    <button 
                      onClick={() => setChatView('LIST')}
                      className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 active:bg-[#588CBC]/10 active:text-[#588CBC] transition-all"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    
                    {!isLocalSearchOpen && (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="relative">
                            <Avatar src="/unj.png" size="sm" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-black text-slate-800 text-sm tracking-tight truncate">
                              Admin  UNJ
                          </h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#588CBC]">Online</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={cn("flex gap-1 relative items-center", isLocalSearchOpen ? "flex-1 ml-2" : "")}>
                      {isLocalSearchOpen ? (
                        <motion.div 
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "100%" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex items-center bg-slate-50 border border-slate-200 rounded-[18px] px-3 py-1 h-9 ring-4 ring-[#588CBC]/10 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/20 transition-all duration-300 gap-1.5 flex-1"
                        >
                          <Search size={14} className="text-[#588CBC] shrink-0" />
                          <input 
                            type="text" 
                            autoFocus
                            value={localSearchQuery}
                            onChange={(e) => setLocalSearchQuery(e.target.value)}
                            placeholder="Cari..."
                            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 h-full p-0 min-w-15"
                          />
                          {localSearchQuery.trim() && (
                            <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 px-1.5 py-0.5 rounded-lg">
                              <span className="text-[9px] font-black text-slate-500 select-none">
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
                                <ChevronUp size={12} />
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
                                <ChevronDown size={12} />
                              </button>
                            </div>
                          )}
                          <button 
                            onClick={() => {
                              setLocalSearchQuery('');
                              setIsLocalSearchOpen(false);
                            }}
                            className="text-slate-300 hover:text-rose-500 shrink-0 ml-1 transition-colors duration-300"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      ) : (
                        <button 
                          onClick={() => setIsLocalSearchOpen(true)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 active:bg-slate-100"
                        >
                          <Search size={18} />
                        </button>
                      )}
                    </div>
                  </header>

                  <main 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col gap-6 scrollbar-hide pb-32"
                  >
                    <div className="flex justify-center mb-2">
                      <span className="bg-white border border-slate-100 shadow-sm text-[10px] font-black text-slate-400 px-4 py-1.5 rounded-full uppercase tracking-widest">
                        Layanan Bantuan Resmi
                      </span>
                    </div>

                    {(() => {

                      const filteredMessages = localSearchQuery.trim()

                        ? messages.filter(m => m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))

                        : messages;

                      return filteredMessages.map((msg, idx) => {
                      const isMe = msg.sender === 'user';
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id || idx}
                          className={cn(
                            "w-fit max-w-[85%] min-w-0 px-5 py-3.5 rounded-3xl text-xs shadow-md relative wrap-anywhere",
                            isMe 
                              ? "bg-linear-to-br from-[#183449] to-[#285577] text-white self-end rounded-tr-none border border-[#588CBC]/40 shadow-lg shadow-[#183449]/15" 
                              : "bg-white text-[#2B2B2B] self-start rounded-tl-none border border-[#B3B3B3] shadow-sm"
                          )}
                        >
                          {isFileMessage(msg) ? (
                            <FileChatBubble
                              messageText={msg.text}
                              messageType={msg.type}
                              isMe={isMe}
                              onViewFile={viewFile}
                              onDownloadFile={downloadFile}
                              isMobile
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
                                      className="rounded-2xl max-w-50 h-auto shadow-sm border border-slate-100 cursor-zoom-in active:scale-95 transition-all"
                                    />
                                    {caption && (
                                      <FormattedText text={caption} className="text-[13px] font-medium leading-relaxed mt-1 px-1" />
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            renderHighlightedText(msg.text, localSearchQuery)
                          )}
                          <div className="flex items-center justify-end gap-1.5 mt-2">
                            <span className={cn(
                                "text-[9px] font-bold",
                                isMe ? "text-slate-300" : "text-[#848484]"
                            )}>
                              {msg.timestamp}
                            </span>
                            {isMe && <CheckCheck size={12} className="text-[#588CBC]" />}
                          </div>
                        </motion.div>
                      );
                    });
                    })()}
                    <div ref={messagesEndRef} />
                  </main>

                  {/* Input Area - Moved Lower (since bottom nav is hidden) */}
                  <div className="absolute bottom-6 left-4 right-4 z-20">
                      <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-2xl shadow-slate-300/20 p-2">
                           <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                               {selectedResponse && (
                                 <motion.div
                                   initial={{ opacity: 0, height: 0 }}
                                   animate={{ opacity: 1, height: 'auto' }}
                                   className="p-3 bg-[#588CBC]/10 border border-[#588CBC]/20 rounded-2xl flex items-start justify-between gap-3 mx-2"
                                 >
                                   <div className="flex-1 min-w-0 flex items-start gap-2">
                                     <div className="w-6 h-6 rounded-full bg-[#588CBC]/20 flex items-center justify-center shrink-0">
                                       <Clock size={12} className="text-[#183449]" />
                                     </div>
                                     <div className="min-w-0 flex-1">
                                       <p className="text-[8px] font-black text-[#183449] uppercase tracking-widest mb-0.5">Draf:</p>
                                       <p className="text-[10px] text-[#2B2B2B]/80 italic font-medium leading-relaxed whitespace-pre-wrap">"{selectedResponse.response}"</p>
                                     </div>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => setSelectedResponse(null)}
                                     className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 text-slate-400 hover:text-red-500 shrink-0 shadow-sm transition-all"
                                   >
                                     <X size={14} />
                                   </button>
                                 </motion.div>
                               )}
                               {/* ATTACHMENT PREVIEW CARD (Ala WhatsApp) */}
                               <AnimatePresence>
                                 {pendingFiles.length > 0 && (
                                   <motion.div
                                     initial={{ opacity: 0, height: 0 }}
                                     animate={{ opacity: 1, height: 'auto' }}
                                     exit={{ opacity: 0, height: 0 }}
                                     className="p-2 bg-slate-50/95 border border-slate-200/90 rounded-2xl mx-1 shadow-xs"
                                   >
                                     <div className="flex items-center justify-between mb-1.5 px-1">
                                       <span className="text-[10px] font-bold text-slate-500">
                                         Lampiran ({pendingFiles.length}/5 file):
                                       </span>
                                       <button
                                         type="button"
                                         onClick={() => {
                                           setPendingFiles([]);
                                           if (fileInputRef.current) fileInputRef.current.value = '';
                                         }}
                                         className="text-[10px] text-rose-500 font-bold hover:underline"
                                       >
                                         Hapus Semua
                                       </button>
                                     </div>
                                     <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                       {pendingFiles.map((file, idx) => (
                                         <div
                                           key={idx}
                                           className="relative shrink-0 flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl max-w-42.5"
                                         >
                                           {file.type === 'image' ? (
                                             <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                               <img src={file.data} alt="thumb" className="w-full h-full object-cover" />
                                             </div>
                                           ) : (
                                             <div className="w-8 h-8 rounded-lg bg-[#588CBC]/15 flex items-center justify-center text-[#588CBC] shrink-0 border border-[#588CBC]/20">
                                               <FileText size={14} />
                                             </div>
                                           )}
                                           <div className="min-w-0 flex-1">
                                             <p className="text-[10px] font-bold text-slate-700 truncate leading-tight">
                                               {file.name}
                                             </p>
                                             <p className="text-[8px] text-slate-400 font-medium">
                                               {file.sizeStr || ''}
                                             </p>
                                           </div>
                                           <button
                                             type="button"
                                             onClick={() => handleRemovePendingFile(idx)}
                                             className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors"
                                             title="Hapus file ini"
                                           >
                                             <X size={11} />
                                           </button>
                                         </div>
                                       ))}
                                     </div>
                                   </motion.div>
                                 )}
                               </AnimatePresence>

                               <div className="flex items-end gap-2 bg-slate-50/50 rounded-2xl p-1">
                                 <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                                 <div className="flex items-center gap-1 mb-1 ml-1">
                                     <button 
                                        type="button" 
                                        onClick={handleFileClick} 
                                        className={cn(
                                          "w-8 h-8 flex items-center justify-center rounded-full transition-all relative",
                                          pendingFiles.length > 0
                                            ? "bg-[#588CBC] text-white shadow-sm"
                                            : "text-slate-400 hover:bg-white hover:shadow-sm active:text-[#588CBC]"
                                        )}
                                        title={pendingFiles.length > 0 ? `${pendingFiles.length} file terlampir (Maks 5)` : "Lampirkan file (Maks 5)"}
                                      >
                                          <Paperclip size={20} />
                                          {pendingFiles.length > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white">
                                              {pendingFiles.length}
                                            </span>
                                          )}
                                      </button>
                                     <button type="button" onClick={() => setIsTemplatePopupOpen(true)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-full active:text-[#588CBC] transition-all">
                                         <LayoutGrid size={20} />
                                     </button>
                                 </div>
                                 <textarea 
                                     id="user-message-input"
                                     value={newMessage}
                                     onChange={(e) => {
                                         setNewMessage(e.target.value);
                                         e.target.style.height = 'auto';
                                         e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                     }}
                                     placeholder={pendingFiles.length > 0 ? "Tambahkan catatan file..." : "Tulis pesan..."}
                                     className="flex-1 min-w-0 py-2.5 px-2 text-[13px] font-medium text-slate-700 bg-transparent focus:outline-none resize-none max-h-30 scrollbar-hide wrap-anywhere"
                                     rows={1}
                                 />
                                 <button 
                                     type="submit" 
                                     disabled={!newMessage.trim() && !selectedResponse && pendingFiles.length === 0}
                                     className="w-10 h-10 mb-0.5 mr-0.5 bg-[#183449] hover:bg-[#588CBC] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#183449]/20 disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shrink-0"
                                 >
                                     <Send size={18} className="ml-0.5" />
                                 </button>
                               </div>
                           </form>
                      </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'home' ? (
          <motion.div
            key="home-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full bg-slate-50 overflow-hidden"
          >
            {/* Fixed Header - Higher Layer (z-30) */}
            <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[40px] px-8 pt-10 pb-12 shadow-2xl relative overflow-hidden shrink-0 z-30">
               <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#588CBC]/20 rounded-full blur-3xl animate-pulse"></div>
               <div className="absolute -bottom-5 -left-5 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

               <header className="relative z-10 flex flex-col gap-6">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        >
                            <Image 
                              src="/unj.png" 
                              alt="Logo UNJ" 
                              width={48} 
                              height={48} 
                              className="drop-shadow-2xl" 
                            />
                        </motion.div>
                        <div className="flex flex-col">
                          <h2 className="text-sm font-black text-white tracking-tighter leading-none uppercase">Admin  UNJ</h2>
                          <span className="text-[8px] font-black text-[#588CBC] uppercase tracking-widest mt-0.5">UNJ  2026</span>
                        </div>
                    </div>
                 </div>

                 <div className="mt-1">
                    <motion.h1 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-2xl font-black text-white tracking-tight leading-tight"
                    >
                      Halo, <span className="text-[#588CBC]">{userName}!</span>
                    </motion.h1>
                    <div className="flex items-center gap-2 mt-3">
                       <span className="w-1.5 h-1.5 bg-[#588CBC] rounded-full animate-pulse"></span>
                       <p className="text-[9px] font-black text-white/80 uppercase tracking-[0.15em]">Admin Siap Membantu</p>
                    </div>
                 </div>
               </header>
            </div>

            {/* Scrollable Content - Lower Layer (z-10) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 -mt-10 relative z-10 pb-32">
                <div className="flex flex-col gap-8">
                    {/* Chat Landing Section */}
                    <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-[40px] shadow-xl shadow-slate-200/30 border border-slate-100 mt-12 mb-2">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center max-w-sm"
                        >
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[#588CBC]/10 scale-0 group-hover:scale-100 transition-transform duration-700 rounded-full"></div>
                                <Image src="/unj.png" alt="Logo" width={50} height={50} className="relative z-10" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Admin  UNJ</h2>
                            {/* Jadwal Penmaba Card (di atas tombol chat) */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsJadwalModalOpen(true)}
                                className="w-full bg-white rounded-full shadow-xl shadow-slate-200/40 p-1 border-2 border-slate-100 hover:border-[#588CBC] focus:outline-none transition-all duration-300 flex items-center justify-between mb-6"
                            >
                                <div className="flex items-center gap-3 px-3 min-h-11 py-1">
                                    <Calendar size={18} className="text-[#183449] shrink-0" />
                                    <div className="flex flex-col text-left">
                                        <span className="text-[11px] font-black text-slate-800 leading-tight">Cek Jadwal Penting Penmaba 2026</span>
                                        <span className="text-[9px] font-bold text-[#588CBC] uppercase tracking-wider leading-tight mt-0.5">Info pendaftaran & ujian</span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#588CBC]/10 text-[#183449] flex items-center justify-center mr-1 shrink-0">
                                    <ChevronRight size={14} />
                                </div>
                            </motion.button>
                            <p className="text-[12px] font-medium text-slate-400 leading-relaxed mb-8 px-4">
                              Klik tombol dibawah ini untuk mulai berkonsultasi dengan petugas kami.
                            </p>
                            <button 
                              onClick={() => {
                                setIsChatStarted(true);
                                setActiveTab('chats');
                                setChatView('LIST');
                              }}
                              className="px-8 py-3.5 bg-[#183449] hover:bg-[#588CBC] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#183449]/30 hover:scale-105 active:scale-95 transition-all w-full relative"
                            >
                              BUKA CHAT SEKARANG
                              {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#588CBC] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                                  {unreadCount}
                                </span>
                              )}
                            </button>
                        </motion.div>
                    </div>

                    {/* Jam Layanan Section */}
                    <div className="p-6 bg-white border border-slate-100 rounded-[36px] shadow-xl shadow-slate-200/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#588CBC]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-5 px-1">Jam Operasional</h4>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-[#588CBC]/10 flex items-center justify-center shadow-inner ring-4 ring-white">
                                <Clock size={28} className="text-[#183449]" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Senin - Jumat</span>
                                <span className="text-lg font-black text-slate-800 leading-none">09:00 - 16:00 <span className="text-[10px] text-[#588CBC] font-black">WIB</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full mt-2 bg-white border border-slate-100/80 rounded-[36px] p-5 shadow-xl shadow-slate-200/20 mb-16 select-none">
  <div className="flex flex-col gap-4 text-left">
    {/* Header Section */}
    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <Building2 size={20} className="text-[#183449]" />
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Denah Gedung</h3>
      </div>
      <span className="px-3 py-1 bg-[#588CBC]/10 text-[#183449] text-[10px] font-black rounded-full uppercase tracking-widest">3 Gedung</span>
    </div>

    {/* List Container - Diubah jadi Grid 3 Kolom biar nyamping */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        // Urutan 1: Elektro (LE)
        { href: '/denah-le', code: 'LE', label: 'Gedung L Rumpun Elektro', desc: 'Eksplorasi denah lantai Gedung LE', icon: Cpu, border: 'border-blue-100 hover:border-blue-300', tile: 'bg-blue-50 text-blue-600', glow: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600', image: '/Lantai3.png' },
        // Urutan 2: SFD 
        { href: '/denah-sfd', code: 'SFD', label: 'Gedung SFD Tower A', desc: 'Eksplorasi denah lantai Gedung SFD', icon: Building2, border: 'border-[#588CBC]/30 hover:border-[#588CBC]', tile: 'bg-[#588CBC]/10 text-[#183449]', glow: 'bg-[#588CBC]', badge: 'bg-[#588CBC]/10 text-[#183449]', image: '/Lantai3.png' },
        // Urutan 3: Sipil (LS)
        { href: '/denah-ls', code: 'LS', label: 'Gedung L Rumpun Sipil', desc: 'Denah lantai Gedung LS (Segera Hadir)', icon: HardHat, border: 'border-orange-100 hover:border-orange-300', tile: 'bg-orange-50 text-orange-600', glow: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600', image: '/Lantai3.png' }
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
              "group relative flex flex-col w-full h-full gap-4 overflow-hidden rounded-[28px] border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 active:scale-[0.99]",
              gedung.border
            )}
          >
            {/* Efek Glow di Pojok Kanan Atas */}
            <div className={cn(
              "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20",
              gedung.glow
            )}></div>

            {/* Container Gambar Baru */}
            <div className="w-full h-32 rounded-2xl overflow-hidden relative flex items-center justify-center bg-slate-50 border border-slate-100/50">
              <img 
                src={gedung.image} 
                alt={gedung.label} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                loading="lazy"
              />
            </div>

            {/* Container Info Bawah (Tetap mempertahankan desain aslinya) */}
            <div className="relative z-10 flex items-center gap-3 w-full mt-auto">
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110",
                gedung.tile
              )}>
                <gedung.icon size={18} strokeWidth={1.75} />
              </div>
              
              <div className="min-w-0 flex-1">
                <span className={cn(
                  "mb-1 inline-block rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-widest",
                  gedung.badge
                )}>{gedung.code}</span>
                <p className="text-xs font-bold leading-snug text-slate-700 truncate">{gedung.label}</p>
                <p className="mt-0.5 text-[9px] font-medium text-slate-400 truncate">{gedung.desc}</p>
              </div>

              <span className={cn(
                "flex shrink-0 items-center justify-center h-6 w-6 rounded-full transition-colors",
                gedung.badge
              )}>
                <ChevronRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
</div>
                </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full bg-slate-50 p-10 items-center justify-center"
          >
             <div className="w-24 h-24 bg-[#588CBC]/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-white shadow-xl">
                <User size={48} className="text-[#183449]" />
             </div>
             <h2 className="text-2xl font-black text-slate-800">{userName}</h2>
             <p className="text-sm text-slate-400 font-medium">User Baru - 2026</p>
             
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
                className="mt-12 w-full max-w-50 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100 flex items-center justify-center gap-2 active:bg-rose-100 transition-all"
             >
                <LogOut size={16} />
                Keluar Akun
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV (Redesigned ala Admin) - Hidden in Room View */}
      <AnimatePresence>
        {!(activeTab === 'chats' && chatView === 'ROOM') && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 w-[92%] max-w-lg h-19 pointer-events-none"
          >
              <nav className="relative flex items-center justify-between px-10 h-full pointer-events-auto">
                  <NotchedBackground />
                  
                  {/* Home Tab */}
                  <button
                      onClick={() => setActiveTab('home')}
                      className="flex flex-col items-center gap-1 group relative"
                  >
                      <motion.div
                          animate={activeTab === 'home' ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
                          className={cn(
                              "p-2 transition-all relative",
                              activeTab === 'home' ? "text-[#183449]" : "text-slate-400"
                          )}
                      >
                          <Home size={24} />
                      </motion.div>
                      {activeTab === 'home' && (
                          <motion.span 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[8px] font-black uppercase tracking-widest text-[#183449]"
                          >
                              HOME
                          </motion.span>
                      )}
                  </button>

                  {/* Center Floating Chat Button */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                      <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setActiveTab('chats');
                            setChatView('LIST');
                          }}
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative",
                            activeTab === 'chats' 
                              ? "bg-[#183449] text-white shadow-[#183449]/30" 
                              : "bg-white text-[#183449] shadow-slate-200 border border-slate-100"
                          )}
                      >
                          <MessageCircle size={28} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#588CBC] text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                              {unreadCount}
                            </span>
                          )}
                      </motion.button>
                  </div>

                  {/* Logout Tab */}
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
                      className="flex flex-col items-center gap-1 group relative"
                  >
                      <div className="p-2 text-slate-400 group-active:text-rose-600 transition-all">
                          <LogOut size={24} />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-active:text-rose-600">
                          KELUAR
                      </span>
                  </button>
              </nav>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Template Popup Modal */}
      <AnimatePresence>
        {isTemplatePopupOpen && (
          <div className="fixed inset-0 z-999 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplatePopupOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-xl bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-linear-to-r from-[#183449] to-[#2B5474] text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Template Pertanyaan</h3>
                  <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">Pilih kategori bantuan</p>
                </div>
                <button 
                  onClick={() => setIsTemplatePopupOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Categories Tabs - Horizontal Scroll */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-hide flex gap-3 shrink-0">
                {Array.from(new Set(cannedResponses.map(r => r.category))).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                      activeCategory === cat 
                        ? "bg-[#183449] text-white shadow-lg shadow-[#183449]/20" 
                        : "bg-white text-slate-400 border border-slate-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Questions List */}
              <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col gap-4">
                  {cannedResponses.filter(r => r.category === activeCategory).map(resp => (
                    <motion.button
                      key={resp.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedResponse(resp);
                        setIsTemplatePopupOpen(false);
                      }}
                      className="p-5 bg-white border border-slate-100 rounded-[28px] text-left active:border-[#588CBC]/40 active:bg-[#588CBC]/5 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-[#588CBC]/15 text-[7px] font-black text-[#183449] rounded uppercase tracking-widest">{resp.keyword}</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 leading-tight mb-2">{resp.question}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{resp.response}</p>
                    </motion.button>
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

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-lg"
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage || undefined}
              alt="Enlarged"
              className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl object-contain border-4 border-white/10"
            />
            <button 
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20"
              onClick={() => setSelectedImage(null)}
            >
              Tutup Galeri
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jadwal Modal Popup */}
      <AnimatePresence>
        {isJadwalModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-[40px] w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative border-t border-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-linear-to-r from-[#183449] to-[#2B5474] p-6 flex justify-between items-center relative shrink-0">
                <div className="absolute -top-7.5 -right-7.5 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 text-white">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Calendar size={22} className="text-[#588CBC]" />
                    Kalender & Jadwal
                  </h3>
                  <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1">
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
              <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-slate-50">
                <div className="flex flex-col gap-4">
                  {jadwalPenmaba.map((event) => (
                    <motion.div
                      key={event.id}
                      whileTap={{ scale: 0.98 }}
                      className="p-5 bg-white border border-slate-100 rounded-[28px] text-left active:border-[#588CBC]/40 active:bg-[#588CBC]/5 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-2 justify-between">
                         <span className={cn(
                           "px-2.5 py-1 text-[8px] font-black rounded uppercase tracking-widest",
                           event.category === 'PENDAFTARAN' && "bg-blue-50 text-blue-600",
                           event.category === 'UJIAN' && "bg-amber-50 text-amber-600",
                           event.category === 'PENGUMUMAN' && "bg-[#588CBC]/15 text-[#183449]"
                         )}>
                           {event.category}
                         </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 leading-tight mb-2">
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

      {/* Excel Preview Modal */}
      {selectedExcelFile && (
        <FilePreviewModal
          isOpen={!!selectedExcelFile}
          onClose={() => setSelectedExcelFile(null)}
          fileData={selectedExcelFile.data}
          fileName={selectedExcelFile.name}
          onDownload={() => downloadFile(selectedExcelFile.data, selectedExcelFile.name)}
        />
      )}

      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({...alertConfig, show: false})} />
    </div>
  );
};

export default MobileLayout;

