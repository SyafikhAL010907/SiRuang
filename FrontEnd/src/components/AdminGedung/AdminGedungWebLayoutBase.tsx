'use client';

import React, { useState, useEffect } from 'react';
import CustomAlert from '@/components/Shared/CustomAlert';
import FilePreviewModal from '@/components/Shared/FilePreviewModal';
import { renderHighlightedText, downloadFile } from '../Admin/Shared/utils';
import { useAdminChat } from '../Admin/Shared/hooks/useAdminChat';
import { useAdminTools } from '../Admin/Shared/hooks/useAdminTools';
import { useAttachments } from '../Admin/Shared/hooks/useAttachments';
import { useMessageSearch } from '../Admin/Shared/hooks/useMessageSearch';
import AdminProfile from '@/components/Profile/Admin/AdminProfile';
import BookingManagementView from '../Admin/Web&Tab/components/BookingManagementView';
import ChatHeader from '../Admin/Web&Tab/components/ChatHeader';
import ChatMessagesArea from '../Admin/Web&Tab/components/ChatMessagesArea';
import ChatInputArea from '../Admin/Web&Tab/components/ChatInputArea';
import AdminGedungSidebarBase from './AdminGedungSidebarBase';
import AdminGedungLandingBase from './AdminGedungLandingBase';
import SearchChatUserModal from '@/components/Shared/SearchChatUserModal';
import { AdminGedungConfig } from './types';

export interface AdminGedungWebLayoutBaseProps {
  config: AdminGedungConfig;
}

export const AdminGedungWebLayoutBase: React.FC<AdminGedungWebLayoutBaseProps> = ({ config }) => {
  const [mainView, setMainView] = useState<'dashboard' | 'profile' | 'booking-management'>('dashboard');
  const [activeFilter, setActiveFilter] = useState<'unreading' | 'reading'>('unreading');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [isTemplatePopupOpen, setIsTemplatePopupOpen] = useState(false);
  const [isSearchUserOpen, setIsSearchUserOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    message: string;
    title?: string;
    onConfirm?: () => void;
  }>({ show: false, type: 'alert', message: '' });

  const showAlert = (message: string, title?: string) =>
    setAlertConfig({ show: true, type: 'alert', message, title });

  // Chat Hook
  const {
    adminName,
    setAdminName,
    adminGmail,
    setAdminGmail,
    rooms,
    setRooms,
    fetchRooms,
    selectedChat,
    setSelectedChat,
    messages,
    setMessages,
    fetchMessages,
    handleMarkAsUnread,
    isRoomMenuOpen,
    setIsRoomMenuOpen,
    selectedResponse,
    setSelectedResponse,
    manualNote,
    setManualNote,
    handleSendMessage: baseHandleSendMessage,
    selectedExcelFile,
    setSelectedExcelFile,
    viewFile,
    messagesEndRef,
    scrollContainerRef,
    handleScroll,
    fileInputRef,
  } = useAdminChat({ platform: 'web', showAlert });

  // Message Search Hook
  const {
    localSearchQuery,
    setLocalSearchQuery,
    isLocalSearchOpen,
    setIsLocalSearchOpen,
    searchMatchIndex,
    setSearchMatchIndex,
    searchMatches,
    scrollToMatch,
  } = useMessageSearch(messages);

  // Attachments Hook
  const {
    pendingFiles,
    setPendingFiles,
    handleFileClick,
    handleFileChange,
    handleRemovePendingFile,
  } = useAttachments({
    platform: 'web',
    showAlert,
    selectedChat,
    fileInputRef,
  });

  // Admin Tools Hook
  const {
    isInfoActive,
  } = useAdminTools({
    platform: 'web',
    showAlert,
    alertConfig,
    setAlertConfig,
    fetchRooms,
    rooms,
    setRooms,
    selectedChat,
    setSelectedChat,
    setMessages,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setAdminName(parsed.username || parsed.Username || 'Admin');
      setAdminGmail(parsed.identifier || parsed.gmail || '');
      fetchRooms(parsed.token);

      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        fetchRooms(parsed.token);
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [fetchRooms, setAdminName, setAdminGmail]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && selectedChat) {
      const { token } = JSON.parse(storedUser);
      fetchMessages(selectedChat.id, token);
    }
  }, [selectedChat, fetchMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    baseHandleSendMessage(e, pendingFiles, setPendingFiles);
  };

  const handleStartChatWithUser = async (targetUser: any) => {
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
          target_identifier: targetUser.identifier,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.room_id) {
          await fetchRooms(token);
          setSelectedChat({
            id: data.room_id,
            user_identifier: targetUser.identifier,
            user_name: targetUser.full_name || targetUser.username,
            avatar_url: targetUser.avatar_url,
            role: targetUser.role,
            room_type: 'user_to_building_admin',
          });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        showAlert(errJson.error || 'Gagal membuka room chat');
      }
    } catch {
      showAlert('Terjadi kesalahan saat membuka room chat');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const q = roomSearchQuery.toLowerCase();
    const matchesQuery =
      (r.user_name || '').toLowerCase().includes(q) ||
      (r.user_identifier || '').toLowerCase().includes(q) ||
      (r.last_message || '').toLowerCase().includes(q);
    if (!matchesQuery) return false;
    if (activeFilter === 'unreading') return (r.unread_count || 0) > 0;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F8FAFB] overflow-hidden">
      {/* SIDEBAR */}
      <AdminGedungSidebarBase
        config={config}
        adminName={adminName}
        currentView={mainView}
        onSelectView={(v) => {
          setMainView(v);
          setSelectedChat(null);
        }}
        onDeselectChat={() => setSelectedChat(null)}
        rooms={rooms}
        filteredRooms={filteredRooms}
        selectedChat={selectedChat}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        roomSearchQuery={roomSearchQuery}
        setRoomSearchQuery={setRoomSearchQuery}
        handleSelectRoom={(room) => setSelectedChat(room)}
        showAlert={showAlert}
        onOpenSearchUser={() => setIsSearchUserOpen(true)}
      />

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
        ) : mainView === 'profile' ? (
          <AdminProfile
            adminName={adminName}
            adminGmail={adminGmail}
            onBack={() => setMainView('dashboard')}
          />
        ) : mainView === 'booking-management' ? (
          <BookingManagementView
            userRole={config.role}
            onBack={() => setMainView('dashboard')}
          />
        ) : (
          <AdminGedungLandingBase
            config={config}
            adminName={adminName}
            adminGmail={adminGmail}
            rooms={rooms}
            isInfoActive={isInfoActive}
            onOpenProfile={() => setMainView('profile')}
            onOpenBookingManagement={() => setMainView('booking-management')}
          />
        )}
      </div>

      <CustomAlert
        config={alertConfig}
        onClose={() => setAlertConfig({ ...alertConfig, show: false })}
      />
      <FilePreviewModal
        isOpen={!!selectedExcelFile}
        onClose={() => setSelectedExcelFile(null)}
        fileData={selectedExcelFile?.data || ''}
        fileName={selectedExcelFile?.name || ''}
      />
      <SearchChatUserModal
        isOpen={isSearchUserOpen}
        onClose={() => setIsSearchUserOpen(false)}
        onSelectUser={handleStartChatWithUser}
        title="Mulai Chat Baru"
        subtitle="Cari PJ Kelas, Mahasiswa, Dosen, atau Admin Dev"
      />
    </div>
  );
};

export default AdminGedungWebLayoutBase;
