'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserChat } from '../Shared/hooks/useUserChat';
import { useUserMessageSearch } from '../Shared/hooks/useUserMessageSearch';
import { useUserAttachments } from '../Shared/hooks/useUserAttachments';
import { useAdminInfo } from '../Shared/hooks/useAdminInfo';
import UserSidebar from './components/UserSidebar';
import UserLandingView from './components/UserLandingView';
import UserProfile from '@/components/Profile/User/UserProfile';
import UserChatHeader from './components/UserChatHeader';
import UserChatMessages from './components/UserChatMessages';
import UserChatInput from './components/UserChatInput';
import UserTemplatePopupModal from '../Shared/Modals/UserTemplatePopupModal';
import CustomAlert from '@/components/Shared/CustomAlert';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';
import SearchAdminGedungModal from '@/components/Shared/SearchAdminGedungModal';

export const WebTabLayout = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mainView, setMainView] = useState<'dashboard' | 'profile'>('dashboard');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Informasi Umum');
  const [alertConfig, setAlertConfig] = useState<{show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void}>({show: false, type: 'alert', message: ''});

  const showAlert = (message: string, title?: string) => setAlertConfig({show: true, type: 'alert', message, title});

  const viewFile = (dataUrl: string, fileName?: string) => {
    setSelectedExcelFile({ data: dataUrl, name: fileName || 'Dokumen' });
  };

  // Shared Hooks
  const chat = useUserChat({ platform: 'web', isChatVisible: isChatOpen, showAlert });
  const search = useUserMessageSearch(chat.messages);
  const adminAvatarSrc = useAdminInfo(); // foto profil Admin UNJ (ikut berubah kalau admin ganti foto)
  const attachments = useUserAttachments({
    platform: 'web',
    roomId: chat.roomId,
    showAlert,
    fileInputRef: chat.fileInputRef,
  });

  const [buildingAdminRooms, setBuildingAdminRooms] = useState<any[]>([]);
  const [isSearchBuildingAdminOpen, setIsSearchBuildingAdminOpen] = useState(false);
  const [activeRoomType, setActiveRoomType] = useState<'admin' | 'building_admin'>('admin');
  const [selectedBuildingAdminRoomId, setSelectedBuildingAdminRoomId] = useState<number | null>(null);
  const [chatPartner, setChatPartner] = useState<{
    name: string;
    role: string;
    avatar?: string;
  }>({ name: 'Admin UNJ', role: 'Official Helpdesk', avatar: '/LogoSiRuangPolos.png' });
  const [adminRoomId, setAdminRoomId] = useState<number | null>(null);

  const loadBuildingAdminRooms = useCallback(async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!storedUser) return;
      const { token } = JSON.parse(storedUser);
      const res = await fetch('/api/chat/my-rooms', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.rooms && Array.isArray(json.rooms)) {
          const bgRooms = json.rooms.filter((r: any) => r.room_type === 'user_to_building_admin');
          setBuildingAdminRooms(bgRooms);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat room admin gedung:', err);
    }
  }, []);

  useEffect(() => {
    loadBuildingAdminRooms();
  }, [loadBuildingAdminRooms]);

  useEffect(() => {
    if (chat.roomId && !adminRoomId && activeRoomType === 'admin') {
      setAdminRoomId(chat.roomId);
    }
  }, [chat.roomId, adminRoomId, activeRoomType]);

  const handleSelectAdminRoom = () => {
    setActiveRoomType('admin');
    setSelectedBuildingAdminRoomId(null);
    chat.setMessages([]);
    if (adminRoomId) {
      chat.setRoomId(adminRoomId);
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) {
        try {
          const { token } = JSON.parse(stored);
          chat.fetchMessages(adminRoomId, token, chat.userGmail);
        } catch {}
      }
    }
    setChatPartner({ name: 'Admin UNJ', role: 'Official Helpdesk', avatar: '/LogoSiRuangPolos.png' });
    setIsChatOpen(true);
  };

  const handleSelectBuildingAdminRoom = (room: any) => {
    setActiveRoomType('building_admin');
    setSelectedBuildingAdminRoomId(room.room_id);
    chat.setMessages([]);
    chat.setRoomId(room.room_id);
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      try {
        const { token } = JSON.parse(stored);
        chat.fetchMessages(room.room_id, token, chat.userGmail);
      } catch {}
    }
    setChatPartner({
      name: room.partner_name,
      role: `Admin Gedung ${room.partner_role ? room.partner_role.replace('admin_', '').toUpperCase() : ''}`,
      avatar: room.partner_avatar,
    });
    setIsChatOpen(true);
  };

  const handleStartChatWithBuildingAdmin = async (admin: any) => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = storedUser ? JSON.parse(storedUser).token : '';
      const res = await fetch('/api/chat/open-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target_identifier: admin.identifier,
          room_type: 'user_to_building_admin',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.room_id) {
          await loadBuildingAdminRooms();
          handleSelectBuildingAdminRoom({
            room_id: json.room_id,
            partner_name: admin.full_name,
            partner_role: admin.role,
            partner_avatar: admin.avatar_url,
          });
        }
      } else {
        showAlert('Gagal membuka room chat dengan admin gedung');
      }
    } catch {
      showAlert('Terjadi kesalahan saat membuka room');
    }
  };

  // Deep link support: buka chat jika URL param openChat=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openChat') === '1') {
      setIsChatOpen(true);
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Ref untuk melacak apakah user sedang aktif di room chat (bukan di dashboard/profil)
  const isChatRoomOpenRef = useRef(false);
  useEffect(() => {
    isChatRoomOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Listener postMessage dari service worker via navigator.serviceWorker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_ROOM') {
        setIsChatOpen(true);
      } else if (event.data?.type === 'CHECK_CHAT_ACTIVE') {
        // Balas ke Service Worker apakah user sedang aktif membuka room chat
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ isChatOpen: isChatRoomOpenRef.current });
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Tombol "Buka chat sekarang" di dashboard (persis seperti aslinya)
  const handleOpenChatFromDashboard = () => {
    setIsChatOpen(true);
    if (chat.roomId) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const { token } = JSON.parse(storedUser);
          chat.markAsRead(chat.roomId, token);
        } catch {}
      }
      chat.setUnreadCount(0);
    }
  };

  const handleLogout = async () => { 
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const { token } = JSON.parse(storedUser);

        // Cabut subscription push SEBELUM logout (token masih aktif, tidak boleh memblokir logout)
        try {
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            const reg = await navigator.serviceWorker.getRegistration('/sw.js');
            if (reg) {
              const sub = await reg.pushManager.getSubscription();
              if (sub) {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
                await fetch(`${apiUrl}/push/unsubscribe`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ endpoint: sub.endpoint }),
                  signal: AbortSignal.timeout(3000),
                });
                await sub.unsubscribe();
              }
            }
          }
        } catch (err) {
          console.warn('[Push] Gagal cabut subscription saat logout:', err);
        }

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
    // Bersihin cache chat biar akun berikutnya nggak kebawa room/pesan akun ini
    try {
      sessionStorage.removeItem('user_chat_room_id');
      sessionStorage.removeItem('user_chat_messages');
    } catch {}
    window.location.href = '/login';
  };

  const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar (bisa dibuka / ditutup, sama seperti Admin) */}
      <UserSidebar
        userName={chat.userName}
        unreadCount={chat.unreadCount}
        isChatOpen={isChatOpen}
        lastMessage={lastMessage}
        activeRoom={activeRoomType}
        onSelectRoom={handleSelectAdminRoom}
        buildingAdminRooms={buildingAdminRooms}
        onSelectBuildingAdminRoom={handleSelectBuildingAdminRoom}
        selectedRoomId={selectedBuildingAdminRoomId}
        onOpenSearchBuildingAdmin={() => setIsSearchBuildingAdminOpen(true)}
        onOpenChat={handleSelectAdminRoom}
        onOpenTemplate={() => setIsTemplatePopupOpen(true)}
        onLogout={handleLogout}
        adminAvatarSrc={adminAvatarSrc}
      />

      {isChatOpen ? (
        /* Main Chat Area */
        <main 
          className="flex-1 min-w-0 flex flex-col bg-slate-50 relative overflow-hidden"
          style={{
            backgroundImage: `url('/Batik.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <UserChatHeader
            partnerName={chatPartner.name}
            partnerRole={chatPartner.role}
            partnerAvatar={chatPartner.avatar}
            localSearchQuery={search.localSearchQuery}
            isLocalSearchOpen={search.isLocalSearchOpen}
            setIsLocalSearchOpen={search.setIsLocalSearchOpen}
            setLocalSearchQuery={search.setLocalSearchQuery}
            searchMatchIndex={search.searchMatchIndex}
            setSearchMatchIndex={search.setSearchMatchIndex}
            searchMatches={search.searchMatches}
            scrollToMatch={search.scrollToMatch}
            onClose={() => setIsChatOpen(false)}
            adminAvatarSrc={adminAvatarSrc}
          />

          <UserChatMessages
            messages={chat.messages}
            localSearchQuery={search.localSearchQuery}
            scrollContainerRef={chat.scrollContainerRef}
            messagesEndRef={chat.messagesEndRef}
            handleScroll={chat.handleScroll}
            onViewFile={viewFile}
          />

          <UserChatInput
            manualNote={chat.manualNote}
            setManualNote={chat.setManualNote}
            selectedResponse={chat.selectedResponse}
            setSelectedResponse={chat.setSelectedResponse}
            pendingFiles={attachments.pendingFiles}
            setPendingFiles={attachments.setPendingFiles}
            onFileClick={attachments.handleFileClick}
            onFileChange={attachments.handleFileChange}
            onRemovePendingFile={attachments.handleRemovePendingFile}
            fileInputRef={chat.fileInputRef}
            onSend={(e) => chat.handleSendMessage(e, attachments.pendingFiles, attachments.setPendingFiles)}
          />
        </main>
      ) : mainView === 'profile' ? (
        <UserProfile
          userName={chat.userName}
          userGmail={chat.userGmail}
          onBack={() => setMainView('dashboard')}
        />
      ) : (
        <UserLandingView
          userName={chat.userName}
          userGmail={chat.userGmail}
          unreadCount={chat.unreadCount}
          onOpenChat={handleOpenChatFromDashboard}
          onOpenProfile={() => setMainView('profile')}
        />
      )}

      {/* Template Popup Modal */}
      <UserTemplatePopupModal
        variant="web"
        isOpen={isTemplatePopupOpen}
        onClose={() => setIsTemplatePopupOpen(false)}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onSelectResponse={(resp) => {
          chat.setSelectedResponse(resp);
          setIsChatOpen(true);
        }}
      />

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

      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({...alertConfig, show: false})} />
      <FilePreviewModal
        isOpen={!!selectedExcelFile}
        onClose={() => setSelectedExcelFile(null)}
        fileData={selectedExcelFile?.data || ''}
        fileName={selectedExcelFile?.name || ''}
      />
      <SearchAdminGedungModal
        isOpen={isSearchBuildingAdminOpen}
        onClose={() => setIsSearchBuildingAdminOpen(false)}
        onSelectAdmin={handleStartChatWithBuildingAdmin}
      />
    </div>
  );
};

export default WebTabLayout;