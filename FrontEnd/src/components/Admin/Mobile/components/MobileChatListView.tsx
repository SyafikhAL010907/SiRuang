'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import { toLocalTime } from '../../Shared/utils';

export interface MobileChatListViewProps {
  filteredRooms: any[];
  isDeleteMode: boolean;
  selectedRooms: number[];
  toggleSelectRoom: (id: number) => void;
  handleOpenChat: (chat: any) => void;
}

export const MobileChatListView: React.FC<MobileChatListViewProps> = ({
  filteredRooms,
  isDeleteMode,
  selectedRooms,
  toggleSelectRoom,
  handleOpenChat,
}) => {
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
            <Avatar size="md" />
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
