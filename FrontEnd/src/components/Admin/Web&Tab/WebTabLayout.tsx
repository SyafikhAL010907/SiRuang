'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import CustomAlert from '@/components/Shared/CustomAlert';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';
import { renderHighlightedText, downloadFile } from '../Shared/utils';
import { useAdminChat } from '../Shared/hooks/useAdminChat';
import { useAdminTools } from '../Shared/hooks/useAdminTools';
import { useAttachments } from '../Shared/hooks/useAttachments';
import { useMessageSearch } from '../Shared/hooks/useMessageSearch';
import AIConfirmModal from '../Shared/Modals/AIConfirmModal';
import TemplatePopupModal from '../Shared/Modals/TemplatePopupModal';

import AdminSidebar from './components/AdminSidebar';
import AdminDashboardView from './components/AdminDashboardView';
import ChatHeader from './components/ChatHeader';
import ChatMessagesArea from './components/ChatMessagesArea';
import ChatInputArea from './components/ChatInputArea';

const WebTabLayout = () => {
  const [activeFilter, setActiveFilter] = useState<'unreading' | 'reading'>('unreading');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Pendaftaran');
  const [alertConfig, setAlertConfig] = useState<{ show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void }>({ show: false, type: 'alert', message: '' });
  const showAlert = (message: string, title?: string) => setAlertConfig({ show: true, type: 'alert', message, title });

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
  } = useAdminChat({ platform: 'web' });

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
    platform: 'web',
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
    platform: 'web',
    showAlert,
    alertConfig,
    setAlertConfig,
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
      fetchAIStatus(parsed.token); // Ambil status AI saat pertama load

      const interval = setInterval(() => {
        fetchRooms(parsed.token);
        fetchStats(parsed.token);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchRooms, fetchStats, fetchAllUsers, fetchAIStatus, setAdminName, setAdminGmail]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && selectedChat && adminGmail) {
      const { token } = JSON.parse(storedUser);
      fetchMessages(selectedChat.id, token);

      const interval = setInterval(() => fetchMessages(selectedChat.id, token), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id, adminGmail, fetchMessages]);

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
  }, [messages, selectedChat?.id, shouldAutoScroll, scrollToBottom, lastRoomIdRef, setShouldAutoScroll]);

  const handleSendMessage = (e: React.FormEvent) => {
    baseHandleSendMessage(e, pendingFiles, setPendingFiles);
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

  const handleBulkDelete = () => baseHandleBulkDelete(filteredRooms);
  const toggleSelectAll = () => baseToggleSelectAll(filteredRooms);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar - Chat List */}
      <AdminSidebar
        adminName={adminName}
        rooms={rooms}
        filteredRooms={filteredRooms}
        selectedChat={selectedChat}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        roomSearchQuery={roomSearchQuery}
        setRoomSearchQuery={setRoomSearchQuery}
        isDeleteMode={isDeleteMode}
        setIsDeleteMode={setIsDeleteMode}
        selectedRooms={selectedRooms}
        setSelectedRooms={setSelectedRooms}
        toggleSelectRoom={toggleSelectRoom}
        toggleSelectAll={toggleSelectAll}
        handleBulkDelete={handleBulkDelete}
        handleSelectRoom={handleSelectRoom}
        isInfoActive={isInfoActive}
        isAILoading={isAILoading}
        handleAIToggleRequest={handleAIToggleRequest}
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
            <ChatHeader
              selectedChat={selectedChat}
              setSelectedChat={setSelectedChat}
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
            />

            <ChatMessagesArea
              scrollContainerRef={scrollContainerRef}
              handleScroll={handleScroll}
              localSearchQuery={localSearchQuery}
              messages={messages}
              viewFile={viewFile}
              downloadFile={downloadFile}
              renderHighlightedText={renderHighlightedText}
              messagesEndRef={messagesEndRef}
            />

            <ChatInputArea
              setIsTemplatePopupOpen={setIsTemplatePopupOpen}
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
            />
          </div>
        ) : (
          <AdminDashboardView
            adminName={adminName}
            rooms={rooms}
            isInfoActive={isInfoActive}
            networkLatency={networkLatency}
            totalUsersCount={totalUsersCount}
          />
        )}
      </main>

      {/* Template Popup Modal */}
      <TemplatePopupModal
        variant="web"
        isTemplatePopupOpen={isTemplatePopupOpen}
        setIsTemplatePopupOpen={setIsTemplatePopupOpen}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onSelectResponse={(resp) => {
          setSelectedResponse(resp);
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

      {/* ── AI CONFIRMATION MODAL ─────────────────────────────────────────── */}
      <AIConfirmModal
        variant="web"
        showAIConfirm={showAIConfirm}
        setShowAIConfirm={setShowAIConfirm}
        pendingAIState={pendingAIState}
        handleToggleAI={handleToggleAI}
      />
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
