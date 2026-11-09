'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, CheckCheck } from 'lucide-react';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import { toLocalTime } from '../../Shared/utils';

export interface MobileChatListViewProps {
  filteredRooms: any[];
  isDeleteMode: boolean;
  selectedRooms: number[];
  toggleSelectRoom: (id: number) => void;
  handleOpenChat: (chat: any) => void;
  activeFilter?: 'unreading' | 'reading';
  setActiveFilter?: (filter: 'unreading' | 'reading') => void;
  readCount?: number;
  unreadCount?: number;
}

export const MobileChatListView: React.FC<MobileChatListViewProps> = ({
  filteredRooms,
  isDeleteMode,
  selectedRooms,
  toggleSelectRoom,
  handleOpenChat,
  activeFilter = 'unreading',
  setActiveFilter,
  readCount = 0,
  unreadCount = 0,
}) => {
  if (filteredRooms.length === 0) {
    return (
      <motion.div
        key="chat-list-empty"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-slate-100 shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#588CBC]/10 text-[#183449] flex items-center justify-center mb-3">
          {activeFilter === 'unreading' ? <CheckCheck size={26} /> : <MessageSquare size={26} />}
        </div>
        <h4 className="text-sm font-black text-slate-800">
          {activeFilter === 'unreading'
            ? 'Tidak Ada Pesan Unreading'
            : 'Tidak Ada Pesan Reading'}
        </h4>
        <p className="text-[11px] text-slate-400 font-medium mt-1 max-w-xs leading-relaxed">
          {activeFilter === 'unreading'
            ? readCount > 0
              ? `Semua pesan telah dibaca. Ada ${readCount} riwayat pesan pada tab Reading.`
              : 'Belum ada pesan masuk dari pengguna.'
            : unreadCount > 0
            ? `Semua pesan masuk belum dibaca. Silakan periksa tab Unreading (${unreadCount} pesan).`
            : 'Belum ada riwayat pesan yang telah dibaca.'}
        </p>

        {activeFilter === 'unreading' && readCount > 0 && setActiveFilter && (
          <button
            type="button"
            onClick={() => setActiveFilter('reading')}
            className="mt-4 px-4 py-2 bg-[#183449] hover:bg-[#204460] active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Buka Tab Reading ({readCount})
          </button>
        )}

        {activeFilter === 'reading' && unreadCount > 0 && setActiveFilter && (
          <button
            type="button"
            onClick={() => setActiveFilter('unreading')}
            className="mt-4 px-4 py-2 bg-[#183449] hover:bg-[#204460] active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Buka Tab Unreading ({unreadCount})
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="chat-list"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-3"
    >
      {filteredRooms.map((chat) => (
        <motion.div
          key={chat.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => isDeleteMode ? toggleSelectRoom(chat.id) : handleOpenChat(chat)}
          className={cn(
            "flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border transition-all",
            isDeleteMode && selectedRooms.includes(chat.id) ? "border-red-200 bg-red-50/30" : "border-slate-100 active:bg-slate-50"
          )}
        >
          {isDeleteMode && (
            <div className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
              selectedRooms.includes(chat.id) ? "bg-red-500 border-red-500 text-white" : "border-slate-200 bg-white"
            )}>
              {selectedRooms.includes(chat.id) && <Plus size={14} className="rotate-45" />}
            </div>
          )}
          <div className="relative">
            <Avatar
              size="md"
              src={chat.avatar_url && chat.avatar_url.startsWith('https://') ? chat.avatar_url : undefined}
              alt={chat.user_name || chat.user_gmail}
            />
            {chat.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm animate-pulse"></span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800 truncate text-sm">{chat.user_name || chat.user_gmail}</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {toLocalTime(chat.updated_at)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className={cn(
                "text-[11px] truncate pr-2 mt-1 flex-1",
                (chat.unread_count > 0 || chat.is_marked_unread) ? "text-slate-700 font-bold" : "text-slate-400 font-medium"
              )}>
                {chat.last_message}
              </p>
              {chat.unread_count > 0 ? (
                <div className="bg-[#588CBC] text-white text-[9px] font-bold h-4 min-w-4 px-1.5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                  {chat.unread_count}
                </div>
              ) : chat.is_marked_unread ? (
                <div className="bg-[#588CBC] w-2.5 h-2.5 rounded-full shadow-sm animate-pulse mr-1 mt-1"></div>
              ) : null}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default MobileChatListView;
