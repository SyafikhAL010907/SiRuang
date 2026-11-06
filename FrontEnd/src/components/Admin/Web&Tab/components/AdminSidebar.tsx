'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Settings,
  Trash2,
  Plus,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import BlessChatModal from '../../Shared/Modals/BlessChatModal';

export interface AdminSidebarProps {
  adminName: string;
  rooms: any[];
  filteredRooms: any[];
  selectedChat: any | null;
  activeFilter: 'unreading' | 'reading';
  setActiveFilter: (filter: 'unreading' | 'reading') => void;
  roomSearchQuery: string;
  setRoomSearchQuery: (query: string) => void;
  isDeleteMode: boolean;
  setIsDeleteMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  selectedRooms: number[];
  setSelectedRooms: (val: number[] | ((prev: number[]) => number[])) => void;
  toggleSelectRoom: (id: number) => void;
  toggleSelectAll: () => void;
  handleBulkDelete: () => void;
  handleSelectRoom: (room: any) => void;
  isInfoActive: boolean;
  isAILoading: boolean;
  handleAIToggleRequest: (state: boolean) => void;
  showBlessModal: boolean;
  setShowBlessModal: (show: boolean) => void;
  blessMessage: string;
  setBlessMessage: (msg: string) => void;
  blessFile: any;
  setBlessFile: (file: any) => void;
  blessTargetMode: 'waiting_room' | 'all_users' | 'specific_users';
  setBlessTargetMode: (mode: 'waiting_room' | 'all_users' | 'specific_users') => void;
  allUsers: { username: string; gmail: string }[];
  selectedBlessUsers: string[];
  setSelectedBlessUsers: React.Dispatch<React.SetStateAction<string[]>>;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  isBlasting: boolean;
  handleBlessChat: () => void;
  viewFile: (dataUrl: string, fileName?: string) => void;
  showAlert: (message: string, title?: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  adminName,
  rooms,
  filteredRooms,
  selectedChat,
  activeFilter,
  setActiveFilter,
  roomSearchQuery,
  setRoomSearchQuery,
  isDeleteMode,
  setIsDeleteMode,
  selectedRooms,
  setSelectedRooms,
  toggleSelectRoom,
  toggleSelectAll,
  handleBulkDelete,
  handleSelectRoom,
  isInfoActive,
  isAILoading,
  handleAIToggleRequest,
  showBlessModal,
  setShowBlessModal,
  blessMessage,
  setBlessMessage,
  blessFile,
  setBlessFile,
  blessTargetMode,
  setBlessTargetMode,
  allUsers,
  selectedBlessUsers,
  setSelectedBlessUsers,
  userSearchQuery,
  setUserSearchQuery,
  isBlasting,
  handleBlessChat,
  viewFile,
  showAlert,
}) => {
  return (
    <aside className="w-75 lg:w-95 bg-white border-r border-slate-100 flex flex-col z-20 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500">
      {/* TOP PREMIUM CARD (Floating Style) */}
      <div className="p-5 pt-8">
        <div className="bg-linear-to-br from-[#07111E] to-[#0F2238] rounded-[40px] p-8 text-white shadow-2xl shadow-[#0B192C]/50 relative overflow-hidden group">
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
      <BlessChatModal
        variant="web"
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
  );
};

export default AdminSidebar;
