'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  User,
  ArrowRight,
  LogOut,
  Building2,
  Cpu,
  HardHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminChat } from '../Admin/Shared/hooks/useAdminChat';
import { useAdminTools } from '../Admin/Shared/hooks/useAdminTools';
import { useAttachments } from '../Admin/Shared/hooks/useAttachments';
import { useMessageSearch } from '../Admin/Shared/hooks/useMessageSearch';
import { renderHighlightedText, downloadFile } from '../Admin/Shared/utils';
import StatGrid from '../Admin/Shared/Cards/StatGrid';
import BookingManagementView from '../Admin/Web&Tab/components/BookingManagementView';
import AdminProfile from '@/components/Profile/Admin/AdminProfile';
import MobileChatListView from '../Admin/Mobile/components/MobileChatListView';
import MobileChatRoomView from '../Admin/Mobile/components/MobileChatRoomView';
import CustomAlert from '@/components/Shared/CustomAlert';
import { clearMyProfile } from '@/lib/profileStore';
import { AdminGedungConfig } from './types';

export interface AdminGedungMobileLayoutBaseProps {
  config: AdminGedungConfig;
}

export const AdminGedungMobileLayoutBase: React.FC<AdminGedungMobileLayoutBaseProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'booking' | 'chat' | 'profile'>('home');
  const [view, setView] = useState<'LIST' | 'ROOM'>('LIST');
  const [activeFilter, setActiveFilter] = useState<'unreading' | 'reading'>('unreading');
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; type: 'alert' | 'confirm'; message: string; title?: string }>({
    show: false,
    type: 'alert',
    message: '',
  });

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
    markAsRead,
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
  } = useAdminChat({ platform: 'mobile' });

  // Message Search
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

  // Attachments
  const {
    pendingFiles,
    setPendingFiles,
    handleFileClick,
    handleFileChange,
    handleRemovePendingFile,
  } = useAttachments({
    platform: 'mobile',
    showAlert,
    selectedChat,
    fileInputRef,
  });

  // Admin Tools
  const {
    isInfoActive,
    isDeleteMode,
    setIsDeleteMode,
    selectedRooms,
    setSelectedRooms,
    toggleSelectRoom,
    toggleSelectAll,
    handleBulkDelete,
  } = useAdminTools({
    platform: 'mobile',
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
    }
  }, [fetchRooms, setAdminName, setAdminGmail]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && selectedChat) {
      const { token } = JSON.parse(storedUser);
      fetchMessages(selectedChat.id, token);
      markAsRead(selectedChat.id);
    }
  }, [selectedChat, fetchMessages, markAsRead]);

  const handleSendMessage = (e: React.FormEvent) => {
    baseHandleSendMessage(e, pendingFiles, setPendingFiles);
  };

  const handleOpenChat = (room: any) => {
    setSelectedChat(room);
    setView('ROOM');
  };

  const handleBackFromRoom = () => {
    setSelectedChat(null);
    setView('LIST');
  };

  const handleLogout = () => {
    clearMyProfile();
    localStorage.clear();
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  const BuildingIcon =
    config.gedung === 'SFD' ? Building2 : config.gedung === 'LE' ? Cpu : HardHat;

  const readRoomsCount = rooms.filter((r) => (r.unread_count || 0) === 0).length;
  const unreadRoomsCount = rooms.filter((r) => (r.unread_count || 0) > 0).length;

  const filteredRooms = rooms.filter((room) => {
    if (activeFilter === 'unreading') return (room.unread_count || 0) > 0;
    return true;
  });

  if (view === 'ROOM' && selectedChat) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <MobileChatRoomView
          selectedChat={selectedChat}
          handleBack={handleBackFromRoom}
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
          setIsTemplatePopupOpen={() => {}}
        />
        <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFB]">
      {/* MOBILE HEADER */}
      <header className="px-5 py-4 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/LogoSiRuangPolos.png" alt="Logo SiRuang" width={32} height={32} className="object-contain" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-800 leading-tight">Admin Gedung {config.gedung}</span>
            <span className="text-[10px] text-slate-400 font-semibold">{adminName}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
          title="Keluar"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* MOBILE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && (
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-[#588CBC] uppercase tracking-widest">
                Panel Kontrol
              </span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Selamat Datang, {adminName}!
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Pantau seluruh aktivitas bantuan dan sistem user secara real-time dari panel kendali utama Anda.
              </p>
            </div>

            {/* STAT GRID */}
            <StatGrid variant="mobile" rooms={rooms} isInfoActive={isInfoActive} />

            {/* DENAH GEDUNG */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BuildingIcon size={14} className="text-[#588CBC]" />
                  Denah Gedung Terkelola
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                  {config.gedung}
                </span>
              </div>
              <div className="w-full h-32 rounded-2xl overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.denahImage} alt={config.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-3 text-white font-black text-xs">
                  {config.label}
                </span>
              </div>
              <Link
                href={config.denahHref}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-between px-3"
              >
                <span>Buka Denah Visual {config.gedung}</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* SHORTCUT ACC PENGAJUAN */}
            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              className="bg-white p-4 rounded-3xl border-2 border-[#588CBC]/30 shadow-sm flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#183449] text-white flex items-center justify-center">
                  <CalendarCheck size={18} className="text-[#38BDF8]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">ACC Pengajuan Ruangan</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Tinjau permohonan booking di {config.gedung}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#588CBC]" />
            </button>
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="p-3">
            <BookingManagementView userRole={config.role} onBack={() => setActiveTab('home')} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-3">
            <MobileChatListView
              filteredRooms={filteredRooms}
              isDeleteMode={isDeleteMode}
              selectedRooms={selectedRooms}
              toggleSelectRoom={toggleSelectRoom}
              handleOpenChat={handleOpenChat}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              readCount={readRoomsCount}
              unreadCount={unreadRoomsCount}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-3">
            <AdminProfile adminName={adminName} adminGmail={adminGmail} onBack={() => setActiveTab('home')} />
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-100 py-2 px-6 flex justify-around items-center z-20">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all",
            activeTab === 'home' ? "text-[#183449] font-black" : "text-slate-400 font-semibold"
          )}
        >
          <LayoutDashboard size={20} className={activeTab === 'home' ? "text-[#588CBC]" : ""} />
          <span className="text-[9px]">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all",
            activeTab === 'booking' ? "text-[#183449] font-black" : "text-slate-400 font-semibold"
          )}
        >
          <CalendarCheck size={20} className={activeTab === 'booking' ? "text-[#588CBC]" : ""} />
          <span className="text-[9px]">ACC Booking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all",
            activeTab === 'chat' ? "text-[#183449] font-black" : "text-slate-400 font-semibold"
          )}
        >
          <MessageSquare size={20} className={activeTab === 'chat' ? "text-[#588CBC]" : ""} />
          <span className="text-[9px]">Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all",
            activeTab === 'profile' ? "text-[#183449] font-black" : "text-slate-400 font-semibold"
          )}
        >
          <User size={20} className={activeTab === 'profile' ? "text-[#588CBC]" : ""} />
          <span className="text-[9px]">Profil</span>
        </button>
      </nav>

      <CustomAlert config={alertConfig} onClose={() => setAlertConfig({ ...alertConfig, show: false })} />
    </div>
  );
};

export default AdminGedungMobileLayoutBase;
