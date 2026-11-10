'use client';

import React, { useState, useEffect } from 'react';
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

  // Deep link support: buka chat jika URL param openChat=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openChat') === '1') {
      setIsChatOpen(true);
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Listener postMessage dari service worker via navigator.serviceWorker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_ROOM') {
        setIsChatOpen(true);
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
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
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
        onOpenChat={() => setIsChatOpen(true)}
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
    </div>
  );
};

export default WebTabLayout;