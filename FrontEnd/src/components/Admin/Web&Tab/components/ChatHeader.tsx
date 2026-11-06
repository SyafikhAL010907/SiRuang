'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';
import { Message } from '@/constants/chatTypes';

export interface ChatHeaderProps {
  selectedChat: any;
  setSelectedChat: (chat: any | null) => void;
  isLocalSearchOpen: boolean;
  setIsLocalSearchOpen: (val: boolean) => void;
  localSearchQuery: string;
  setLocalSearchQuery: (query: string) => void;
  searchMatchIndex: number;
  setSearchMatchIndex: React.Dispatch<React.SetStateAction<number>>;
  searchMatches: Message[];
  scrollToMatch: (matchNumber: number) => void;
  isRoomMenuOpen: boolean;
  setIsRoomMenuOpen: (val: boolean) => void;
  handleMarkAsUnread: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedChat,
  setSelectedChat,
  isLocalSearchOpen,
  setIsLocalSearchOpen,
  localSearchQuery,
  setLocalSearchQuery,
  searchMatchIndex,
  setSearchMatchIndex,
  searchMatches,
  scrollToMatch,
  isRoomMenuOpen,
  setIsRoomMenuOpen,
  handleMarkAsUnread,
}) => {
  return (
    <header className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar size="md" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-800 tracking-tight">{selectedChat.user_name || selectedChat.user_gmail}</h2>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              selectedChat.is_online ? "bg-[#588CBC] animate-pulse" : "bg-slate-300"
            )}></span>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              selectedChat.is_online ? "text-[#588CBC]" : "text-slate-400"
            )}>
              {selectedChat.is_online ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 relative">
        {isLocalSearchOpen ? (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 340 }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-4 py-1.5 h-10 ring-4 ring-[#588CBC]/5 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/10 transition-all duration-300 gap-2"
          >
            <SearchIcon size={16} className="text-[#183449] shrink-0" />
            <input
              type="text"
              autoFocus
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="Cari pesan..."
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 h-full p-0 min-w-25"
            />
            {localSearchQuery.trim() && (
              <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 px-2 py-1 rounded-xl">
                <span className="text-[10px] font-black text-slate-500 min-w-7.5 text-center select-none">
                  {searchMatchIndex}/{searchMatches.length}
                </span>
                <button
                  onClick={() => {
                    if (searchMatches.length === 0) return;
                    const nextIdx = searchMatchIndex <= 1 ? searchMatches.length : searchMatchIndex - 1;
                    setSearchMatchIndex(nextIdx);
                    scrollToMatch(nextIdx);
                  }}
                  disabled={searchMatches.length === 0}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded-md transition-colors disabled:opacity-30"
                  title="Pesan Sebelumnya"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => {
                    if (searchMatches.length === 0) return;
                    const nextIdx = searchMatchIndex >= searchMatches.length ? 1 : searchMatchIndex + 1;
                    setSearchMatchIndex(nextIdx);
                    scrollToMatch(nextIdx);
                  }}
                  disabled={searchMatches.length === 0}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded-md transition-colors disabled:opacity-30"
                  title="Pesan Berikutnya"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setIsLocalSearchOpen(false);
                setLocalSearchQuery('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsLocalSearchOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#183449] transition-all"
          >
            <SearchIcon size={20} />
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <MoreVertical size={20} />
          </button>
          <AnimatePresence>
            {isRoomMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsRoomMenuOpen(false)}></div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 origin-top-right"
                >
                  <button
                    onClick={handleMarkAsUnread}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Tandai belum dibaca
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setSelectedChat(null)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
