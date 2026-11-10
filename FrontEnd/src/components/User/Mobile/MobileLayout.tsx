'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserChat } from '../Shared/hooks/useUserChat';
import { useUserMessageSearch } from '../Shared/hooks/useUserMessageSearch';
import { useUserAttachments } from '../Shared/hooks/useUserAttachments';
import MobileBottomNav from './MobileBottomNav';
import MobileHomeView from './components/MobileHomeView';
import MobileChatListView from './components/MobileChatListView';
import MobileChatRoomView from './components/MobileChatRoomView';
import MobileProfileView from './components/MobileProfileView';
import MobileDenahView from './components/MobileDenahView';
import MobileBookingView from './components/MobileBookingView';
import UserTemplatePopupModal from '../Shared/Modals/UserTemplatePopupModal';
import CustomAlert from '@/components/Shared/CustomAlert';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';
import { downloadFile } from '../Shared/utils';

const MobileLayout = () => {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'denah' | 'chats' | 'booking' | 'profile'>('home');
  const [chatView, setChatView] = useState<'LIST' | 'ROOM'>('LIST');

  // Modal / UI states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedExcelFile, setSelectedExcelFile] = useState<{ data: string; name: string } | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Informasi Umum');
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    message: string;
    title?: string;
    onConfirm?: () => void;
  }>({ show: false, type: 'alert', message: '' });

  const showAlert = (message: string, title?: string) =>
    setAlertConfig({ show: true, type: 'alert', message, title });

  const viewFile = (dataUrl: string, fileName?: string) => {
    setSelectedExcelFile({ data: dataUrl, name: fileName || 'Dokumen' });
  };

  // Shared hooks
  const chat = useUserChat({
    platform: 'mobile',
    isChatVisible: activeTab === 'chats' && chatView === 'ROOM',
  });
  const search = useUserMessageSearch(chat.messages);
  const attachments = useUserAttachments({
    platform: 'mobile',
    roomId: chat.roomId,
    showAlert,
    fileInputRef: chat.fileInputRef,
  });

  // Deep link support: buka chat jika URL param openChat=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openChat') === '1') {
      setActiveTab('chats');
      setChatView('ROOM');
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Listener postMessage dari service worker via navigator.serviceWorker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_ROOM') {
        setActiveTab('chats');
        setChatView('ROOM');
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const handleOpenChatFromHome = () => {
    setActiveTab('chats');
    setChatView('ROOM');
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
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Logout API failed:', err);
      }
    }
    localStorage.removeItem('user');
    try {
      sessionStorage.removeItem('user_chat_room_id');
      sessionStorage.removeItem('user_chat_messages');
    } catch {}
    window.location.href = '/login';
  };

  const handleClearPendingFiles = () => {
    attachments.setPendingFiles([]);
    if (chat.fileInputRef.current) chat.fileInputRef.current.value = '';
  };

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
                <MobileChatListView
                  key="chat-list"
                  onOpenRoom={() => setChatView('ROOM')}
                />
              ) : (
                <MobileChatRoomView
                  key="chat-room"
                  messages={chat.messages}
                  manualNote={chat.manualNote}
                  setManualNote={chat.setManualNote}
                  selectedResponse={chat.selectedResponse}
                  setSelectedResponse={chat.setSelectedResponse}
                  localSearchQuery={search.localSearchQuery}
                  isLocalSearchOpen={search.isLocalSearchOpen}
                  setIsLocalSearchOpen={search.setIsLocalSearchOpen}
                  setLocalSearchQuery={search.setLocalSearchQuery}
                  searchMatchIndex={search.searchMatchIndex}
                  setSearchMatchIndex={search.setSearchMatchIndex}
                  searchMatches={search.searchMatches}
                  scrollToMatch={search.scrollToMatch}
                  onBack={() => setChatView('LIST')}
                  onSend={(e) => chat.handleSendMessage(e, attachments.pendingFiles, attachments.setPendingFiles)}
                  onOpenTemplate={() => setIsTemplatePopupOpen(true)}
                  pendingFiles={attachments.pendingFiles}
                  onFileClick={attachments.handleFileClick}
                  onFileChange={attachments.handleFileChange}
                  onRemovePendingFile={attachments.handleRemovePendingFile}
                  onClearPendingFiles={handleClearPendingFiles}
                  fileInputRef={chat.fileInputRef}
                  scrollContainerRef={chat.scrollContainerRef}
                  messagesEndRef={chat.messagesEndRef}
                  handleScroll={chat.handleScroll}
                  onViewFile={viewFile}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'home' ? (
          <MobileHomeView
            key="home-view"
            userName={chat.userName}
            userGmail={chat.userGmail}
            unreadCount={chat.unreadCount}
            onOpenChat={handleOpenChatFromHome}
            onOpenProfile={() => setActiveTab('profile')}
          />
        ) : activeTab === 'denah' ? (
          <MobileDenahView
            key="denah-view"
            onBackToHome={() => setActiveTab('home')}
          />
        ) : activeTab === 'booking' ? (
          <MobileBookingView
            key="booking-view"
            onGoToDenah={() => setActiveTab('denah')}
          />
        ) : (
          <MobileProfileView
            key="profile-view"
            userName={chat.userName}
            userGmail={chat.userGmail}
            onBack={() => setActiveTab('home')}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* BOTTOM NAV - Hidden in Room View */}
      <AnimatePresence>
        {!(activeTab === 'chats' && chatView === 'ROOM') && (
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'chats') setChatView('LIST');
            }}
            unreadCount={chat.unreadCount}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* Template Popup Modal */}
      <UserTemplatePopupModal
        variant="mobile"
        isOpen={isTemplatePopupOpen}
        onClose={() => setIsTemplatePopupOpen(false)}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onSelectResponse={(resp) => chat.setSelectedResponse(resp)}
      />

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

      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
    </div>
  );
};

export { MobileLayout };
export default MobileLayout;
