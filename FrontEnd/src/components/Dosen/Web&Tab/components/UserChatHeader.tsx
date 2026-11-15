'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Message } from '@/constants/chatTypes';
import Avatar from '@/components/Shared/Avatar';

export interface UserChatHeaderProps {
  localSearchQuery: string;
  isLocalSearchOpen: boolean;
  setIsLocalSearchOpen: (v: boolean) => void;
  setLocalSearchQuery: (v: string) => void;
  searchMatchIndex: number;
  setSearchMatchIndex: (v: number) => void;
  searchMatches: Message[];
  scrollToMatch: (index: number) => void;
  onClose: () => void;
  /** Foto profil Admin UNJ. Kosong = logo SiRuang. */
  adminAvatarSrc?: string;
}

export const UserChatHeader: React.FC<UserChatHeaderProps> = ({
  localSearchQuery,
  isLocalSearchOpen,
  setIsLocalSearchOpen,
  setLocalSearchQuery,
  searchMatchIndex,
  setSearchMatchIndex,
  searchMatches,
  scrollToMatch,
  onClose,
  adminAvatarSrc,
}) => {
  return (
    <header className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar src={adminAvatarSrc || '/LogoSiRuangPolos.png'} size="md" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-800 tracking-tight">Admin  UNJ</h2>
            <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-md tracking-tighter uppercase">OFFICIAL</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 relative">
        {isLocalSearchOpen ? (
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 340 }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center bg-slate-50 border border-slate-200 rounded-3xl px-4 py-1.5 h-10 ring-4 ring-[#588CBC]/10 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/20 transition-all duration-300 gap-2"
          >
            <SearchIcon size={16} className="text-[#588CBC] shrink-0" />
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
                  className="text-slate-400 hover:text-[#588CBC] transition-colors"
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
                  className="text-slate-400 hover:text-[#588CBC] transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                setLocalSearchQuery('');
                setIsLocalSearchOpen(false);
              }}
              className="text-slate-400 hover:text-rose-500 shrink-0 ml-1 transition-colors duration-300"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <button 
            onClick={() => setIsLocalSearchOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#588CBC] transition-all"
          >
            <SearchIcon size={20} />
          </button>
        )}
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
};

export default UserChatHeader;