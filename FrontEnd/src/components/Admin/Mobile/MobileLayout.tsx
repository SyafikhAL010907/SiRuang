'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { downloadFile, renderHighlightedText } from '../Shared/utils';
import { useAdminChat } from '../Shared/hooks/useAdminChat';
import { useAdminTools } from '../Shared/hooks/useAdminTools';
import { useAttachments } from '../Shared/hooks/useAttachments';
import { useMessageSearch } from '../Shared/hooks/useMessageSearch';
import AIConfirmModal from '../Shared/Modals/AIConfirmModal';
import BlessChatModal from '../Shared/Modals/BlessChatModal';
import TemplatePopupModal from '../Shared/Modals/TemplatePopupModal';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';

import MobileHeader from './components/MobileHeader';
import MobileDashboardView from './components/MobileDashboardView';
import MobileChatListView from './components/MobileChatListView';
import MobileBottomNav from './components/MobileBottomNav';
import MobileChatRoomView from './components/MobileChatRoomView';

const MobileLayout = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState<'LIST' | 'ROOM'>('LIST');
  const [activeFilter, setActiveFilter] = useState<'unreading' | 'reading'>('unreading');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Pendaftaran');

  const showAlert = (message: string, title?: string) => {
    alert(title ? `${title}\n\n${message}` : message);
  };

  // ── Chat Hook ──
  const {
    adminName, setAdminName,
    adminGmail, setAdminGmail,
    rooms,
    fetchRooms,
    selectedChat, setSelectedChat,
    messages, setMessages,
    fetchMessages,
    markAsRead,
    handleMarkAsUnread,
    isRoomMenuOpen, setIsRoomMenuOpen,
    selectedResponse, setSelectedResponse,
    manualNote, setManualNote,
    handleSendMessage: baseHandleSendMessage,
    selectedExcelFile, setSelectedExcelFile,
    viewFile,
    messagesEndRef,
    scrollContainerRef,
    lastRoomIdRef,
    shouldAutoScroll, setShouldAutoScroll,
    scrollToBottom,
    handleScroll,
    fileInputRef,
  } = useAdminChat({ platform: 'mobile' });

  // ── Message Search Hook ──
  const {
    localSearchQuery, setLocalSearchQuery,
    isLocalSearchOpen, setIsLocalSearchOpen,
    searchMatchIndex, setSearchMatchIndex,
    searchMatches,
    scrollToMatch,
  } = useMessageSearch(messages);

  // ── Attachments Hook ──
  const {
    pendingFiles, setPendingFiles,
    handleFileClick,
    handleFileChange,
    handleRemovePendingFile,
  } = useAttachments({
    platform: 'mobile',
    showAlert,
    selectedChat,
    fileInputRef,
  });

  // ── Admin Tools Hook ──
  const {
    totalUsersCount,
    networkLatency,
    fetchStats,
    isInfoActive,
    isAILoading,
    showAIConfirm, setShowAIConfirm,
    pendingAIState,
    handleToggleAI,
    handleAIToggleRequest,
    fetchAIStatus,
    showBlessModal, setShowBlessModal,
    blessMessage, setBlessMessage,
    blessFile, setBlessFile,
    blessTargetMode, setBlessTargetMode,
    allUsers,
    selectedBlessUsers, setSelectedBlessUsers,
    userSearchQuery, setUserSearchQuery,
    isBlasting,
    handleBlessChat,
    fetchAllUsers,
    isDeleteMode, setIsDeleteMode,
    selectedRooms, setSelectedRooms,
    handleBulkDelete: baseHandleBulkDelete,
    toggleSelectRoom,
    toggleSelectAll: baseToggleSelectAll,
  } = useAdminTools({
    platform: 'mobile',
    showAlert,
    fetchRooms,
    rooms,
    selectedChat,
    setSelectedChat,
    setMessages,
  });

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
      fetchAIStatus(parsed.token);

      const interval = setInterval(() => {
        fetchRooms(parsed.token);
        fetchStats(parsed.token);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchRooms, fetchStats, fetchAllUsers, fetchAIStatus, setAdminName, setAdminGmail]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && selectedChat && view === 'ROOM' && adminGmail) {
      const { token } = JSON.parse(storedUser);
      fetchMessages(selectedChat.id, token);

      const interval = setInterval(() => fetchMessages(selectedChat.id, token), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id, view, adminGmail, fetchMessages]);

  useEffect(() => {
    if (selectedChat && messages.length > 0 && view === 'ROOM') {
      if (lastRoomIdRef.current !== selectedChat.id) {
        scrollToBottom('auto');
        lastRoomIdRef.current = selectedChat.id;
        setShouldAutoScroll(true);
      } else if (shouldAutoScroll) {
        scrollToBottom('smooth');
      }
    }
  }, [messages, selectedChat?.id, shouldAutoScroll, scrollToBottom, view, lastRoomIdRef, setShouldAutoScroll]);

  const handleSendMessage = (e: React.FormEvent) => {
    baseHandleSendMessage(e, pendingFiles, setPendingFiles);
  };

  const handleOpenChat = (chat: any) => {
    setSelectedChat(chat);
    setView('ROOM');
    setPendingFiles([]);
    markAsRead(chat.id);
  };

  const handleBack = () => {
    if (view === 'ROOM') {
      setView('LIST');
      setSelectedChat(null);
      setMessages([]);
      setPendingFiles([]);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = roomSearchQuery.trim()
      ? (room.user_name || '').toLowerCase().includes(roomSearchQuery.toLowerCase()) || (room.user_gmail || '').toLowerCase().includes(roomSearchQuery.toLowerCase())
      : true;

    if (!matchesSearch) return false;

    if (activeTab === 'unreading') return room.unread_count > 0 || room.is_marked_unread;
    if (activeTab === 'reading') return room.unread_count === 0 && !room.is_marked_unread;

    if (activeTab === 'chat') {
      if (activeFilter === 'unreading') return room.unread_count > 0 || room.is_marked_unread;
      if (activeFilter === 'reading') return room.unread_count === 0 && !room.is_marked_unread;
    }

    return true;
  });

  const handleBulkDelete = () => baseHandleBulkDelete(filteredRooms);
  const toggleSelectAll = () => baseToggleSelectAll(filteredRooms);

  return (
  <div className="flex h-dvh w-full max-w-full bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased select-none">
      <AnimatePresence mode="wait">
        {view === 'LIST' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full bg-slate-50 w-full"
          >
            {/* FIXED HEADER SECTION */}
            <MobileHeader
              adminName={adminName}
              rooms={rooms}
              activeTab={activeTab}
              isInfoActive={isInfoActive}
              isAILoading={isAILoading}
              handleAIToggleRequest={handleAIToggleRequest}
              roomSearchQuery={roomSearchQuery}
              setRoomSearchQuery={setRoomSearchQuery}
              isDeleteMode={isDeleteMode}
              setIsDeleteMode={setIsDeleteMode}
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
              filteredRooms={filteredRooms}
              toggleSelectAll={toggleSelectAll}
              handleBulkDelete={handleBulkDelete}
            />

            {/* SCROLLABLE CONTENT AREA */}
            <main className="flex-1 overflow-y-auto px-4 relative z-10 pb-32 pt-2 scrollbar-hide">
              <AnimatePresence mode="wait">
                {activeTab === 'home' ? (
                  <MobileDashboardView
                    rooms={rooms}
                    isInfoActive={isInfoActive}
                    networkLatency={networkLatency}
                    totalUsersCount={totalUsersCount}
                  />
                ) : (
                  <MobileChatListView
                    filteredRooms={filteredRooms}
                    isDeleteMode={isDeleteMode}
                    selectedRooms={selectedRooms}
                    toggleSelectRoom={toggleSelectRoom}
                    handleOpenChat={handleOpenChat}
                  />
                )}
              </AnimatePresence>
            </main>

            {/* OVERLAY for FAB Speed Dial */}
            <AnimatePresence>
              {isFABOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFABOpen(false)}
                  className="fixed inset-0 z-55 bg-slate-900/40 backdrop-blur-sm"
                />
              )}
            </AnimatePresence>

            {/* BOTTOM NAV */}
            <MobileBottomNav
              showBlessModal={showBlessModal}
              setShowBlessModal={setShowBlessModal}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setActiveFilter={setActiveFilter}
            />
          </motion.div>
        ) : (
          <MobileChatRoomView
            selectedChat={selectedChat}
            handleBack={handleBack}
            isLocalSearchOpen={isLocalSearchOpen}
            setIsLocalSearchOpen={setIsLocalSearchOpen}
            localSearchQuery={localSearchQuery}
            setLocalSearchQuery={setLocalSearchQuery}
            searchMatchIndex={searchMatchIndex}
            setSearchMatchIndex={setSearchMatchIndex}
            searchMatches={searchMatches}
            scrollToMatch={scrollToMatch}
            isRoomMenuOpen={isRoomMenuOpen}
            setIsRoomMenuOpen={setIsRoomMenuOpen}
            handleMarkAsUnread={handleMarkAsUnread}
            scrollContainerRef={scrollContainerRef}
            handleScroll={handleScroll}
            messages={messages}
            viewFile={viewFile}
            downloadFile={downloadFile}
            renderHighlightedText={renderHighlightedText}
            messagesEndRef={messagesEndRef}
            selectedResponse={selectedResponse}
            setSelectedResponse={setSelectedResponse}
            handleSendMessage={handleSendMessage}
            pendingFiles={pendingFiles}
            setPendingFiles={setPendingFiles}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            handleFileClick={handleFileClick}
            handleRemovePendingFile={handleRemovePendingFile}
            manualNote={manualNote}
            setManualNote={setManualNote}
            setIsTemplatePopupOpen={setIsTemplatePopupOpen}
          />
        )}
      </AnimatePresence>

      {/* Bless Chat Modal Mobile */}
      <BlessChatModal
        variant="mobile"
        showBlessModal={showBlessModal}
        setShowBlessModal={setShowBlessModal}
        blessMessage={blessMessage}
        setBlessMessage={setBlessMessage}
        blessFile={blessFile}
        setBlessFile={setBlessFile}
        blessTargetMode={blessTargetMode}
        setBlessTargetMode={setBlessTargetMode}
        allUsers={allUsers}
        selectedBlessUsers={selectedBlessUsers}
        setSelectedBlessUsers={setSelectedBlessUsers}
        userSearchQuery={userSearchQuery}
        setUserSearchQuery={setUserSearchQuery}
        isBlasting={isBlasting}
        handleBlessChat={handleBlessChat}
        viewFile={viewFile}
        showAlert={showAlert}
      />

      {/* Template Popup Modal */}
      <TemplatePopupModal
        variant="mobile"
        isTemplatePopupOpen={isTemplatePopupOpen}
        setIsTemplatePopupOpen={setIsTemplatePopupOpen}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onSelectResponse={(resp) => setSelectedResponse(resp)}
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
              src={selectedImage}
              alt="Enlarged"
              className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain border border-white/10"
            />
            <button
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-xs font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full backdrop-blur-md"
              onClick={() => setSelectedImage(null)}
            >
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI CONFIRMATION MODAL ─────────────────────────────────────────── */}
      <AIConfirmModal
        variant="mobile"
        showAIConfirm={showAIConfirm}
        setShowAIConfirm={setShowAIConfirm}
        pendingAIState={pendingAIState}
        handleToggleAI={handleToggleAI}
      />

      {selectedExcelFile && (
        <FilePreviewModal
          isOpen={!!selectedExcelFile}
          onClose={() => setSelectedExcelFile(null)}
          fileData={selectedExcelFile.data}
          fileName={selectedExcelFile.name}
          onDownload={() => downloadFile(selectedExcelFile.data, selectedExcelFile.name)}
        />
      )}
    </div>
  );
};

export default MobileLayout;
