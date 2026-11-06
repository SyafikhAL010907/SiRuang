'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  X,
  CheckCheck,
  Clock,
  FileText,
  Paperclip,
  LayoutGrid,
  Send
} from 'lucide-react';
import { Message, CannedResponse } from '@/constants/chatTypes';
import Avatar from '@/components/Shared/Avatar';
import FormattedText from '@/components/Shared/FormattedText';
import FileChatBubble, { isFileMessage } from '@/components/Shared/FileChatBubble';
import { cn } from '@/lib/utils';

export interface MobileChatRoomViewProps {
  selectedChat: any;
  handleBack: () => void;
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
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  messages: Message[];
  viewFile: (dataUrl: string, fileName?: string) => void;
  downloadFile: (dataUrl: string, fileName: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactNode;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  selectedResponse: CannedResponse | null;
  setSelectedResponse: (resp: CannedResponse | null) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  pendingFiles: any[];
  setPendingFiles: (files: any[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileClick: () => void;
  handleRemovePendingFile: (index: number) => void;
  manualNote: string;
  setManualNote: (note: string) => void;
  setIsTemplatePopupOpen: (open: boolean) => void;
}

export const MobileChatRoomView: React.FC<MobileChatRoomViewProps> = ({
  selectedChat,
  handleBack,
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
  scrollContainerRef,
  handleScroll,
  messages,
  viewFile,
  downloadFile,
  renderHighlightedText,
  messagesEndRef,
  selectedResponse,
  setSelectedResponse,
  handleSendMessage,
  pendingFiles,
  setPendingFiles,
  fileInputRef,
  handleFileChange,
  handleFileClick,
  handleRemovePendingFile,
  manualNote,
  setManualNote,
  setIsTemplatePopupOpen,
}) => {
  return (
    <motion.div
      key="room"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="flex flex-col h-full bg-slate-50"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Room Header (Glassy & Clean) */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 p-4 pt-12 flex items-center gap-3 z-30">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 active:bg-[#588CBC]/10 active:text-[#183449] transition-all"
        >
          <ArrowLeft size={24} />
        </button>

        {!isLocalSearchOpen && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#588CBC] border-2 border-white rounded-full shadow-sm"></span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-slate-800 text-sm tracking-tight truncate">
                {selectedChat?.user_name || selectedChat?.user_gmail}
              </h2>
              <p className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                selectedChat?.is_online ? "text-[#588CBC]" : "text-slate-400"
              )}>
                {selectedChat?.is_online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        )}

        <div className={cn("flex gap-1 relative items-center", isLocalSearchOpen ? "flex-1 ml-2" : "")}>
          {isLocalSearchOpen ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center bg-slate-50 border border-slate-200 rounded-[18px] px-3 py-1 h-9 ring-4 ring-[#588CBC]/5 focus-within:border-[#588CBC] focus-within:bg-white focus-within:ring-[#588CBC]/10 transition-all duration-300 gap-1.5 flex-1"
            >
              <Search size={14} className="text-[#588CBC] shrink-0" />
              <input
                type="text"
                autoFocus
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 h-full p-0 min-w-15"
              />
              {localSearchQuery.trim() && (
                <div className="flex items-center gap-1 shrink-0 bg-slate-100/80 px-1.5 py-0.5 rounded-lg">
                  <span className="text-[9px] font-black text-slate-500 select-none">
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
                    <ChevronUp size={12} />
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
                    <ChevronDown size={12} />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setLocalSearchQuery('');
                  setIsLocalSearchOpen(false);
                }}
                className="text-slate-300 hover:text-rose-500 shrink-0 ml-1 transition-colors duration-300"
              >
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setIsLocalSearchOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 active:bg-slate-100"
            >
              <Search size={18} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 active:bg-slate-100"
            >
              <MoreVertical size={18} />
            </button>
            <AnimatePresence>
              {isRoomMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRoomMenuOpen(false)}></div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 origin-top-right"
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
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide"
      >
        {(() => {
          const filteredMessages = localSearchQuery.trim()
            ? messages.filter((m: Message) => m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
            : messages;

          return filteredMessages.map((msg: Message, idx: number) => {
            const isMe = msg.sender === 'admin';
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id || idx}
                className={cn(
                  "w-fit max-w-[85%] min-w-0 px-5 py-3.5 rounded-3xl text-xs shadow-md relative wrap-anywhere",
                  isMe
                    ? "bg-linear-to-br from-[#183449] to-[#285577] text-white self-end rounded-tr-none border border-[#588CBC]/40 shadow-lg shadow-[#183449]/15"
                    : "bg-white text-[#2B2B2B] self-start rounded-tl-none border border-[#B3B3B3] shadow-sm"
                )}
              >
                {isFileMessage(msg) ? (
                  <FileChatBubble
                    messageText={msg.text}
                    messageType={msg.type}
                    isMe={isMe}
                    onViewFile={viewFile}
                    onDownloadFile={downloadFile}
                    isMobile
                  />
                ) : msg.type === 'image' ? (
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const parts = msg.text.split('|');
                      const imgData = parts.length > 1 ? parts[1] : msg.text;
                      const caption = parts.length > 2 ? parts.slice(2).join('|') : null;
                      return (
                        <div className="flex flex-col gap-2">
                          <img
                            src={imgData}
                            alt="Sent image"
                            onClick={() => viewFile(imgData, "Gambar_Lampiran.png")}
                            className="rounded-2xl max-w-50 h-auto shadow-sm border border-slate-100 cursor-zoom-in active:scale-95 transition-all"
                          />
                          {caption && (
                            <FormattedText text={caption} className="text-[13px] font-medium leading-relaxed mt-1 px-1" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  renderHighlightedText(msg.text, localSearchQuery)
                )}
                <div className="flex items-center justify-end gap-1.5 mt-2">
                  <span className={cn(
                    "text-[9px] font-bold",
                    msg.sender === 'admin' ? "text-slate-300" : "text-[#848484]"
                  )}>
                    {msg.timestamp}
                  </span>
                  {msg.sender === 'admin' && (
                    <CheckCheck size={12} className="text-[#588CBC]" />
                  )}
                </div>
              </motion.div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 pb-8">
        <div className="bg-slate-50 border border-slate-100 rounded-[28px] overflow-hidden shadow-2xl shadow-slate-200/50">
          {/* Selected Template Preview */}
          <AnimatePresence>
            {selectedResponse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-3 bg-[#588CBC]/10 border-b border-[#588CBC]/20 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0 flex gap-2">
                  <Clock size={14} className="text-[#183449] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-[#183449] uppercase tracking-widest">Draft:</p>
                    <p className="text-[11px] text-[#2B2B2B]/80 italic font-medium leading-relaxed whitespace-pre-wrap">&quot;{selectedResponse.response}&quot;</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResponse(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 text-slate-400 hover:text-red-500 shrink-0 shadow-sm"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendMessage} className="flex flex-col gap-2 p-3">
            {/* MULTI-ATTACHMENT PREVIEW TRAY */}
            <AnimatePresence>
              {pendingFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2 bg-slate-50/95 border border-slate-200/90 rounded-2xl mx-1 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      Lampiran ({pendingFiles.length}/5 file):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Hapus Semua
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative shrink-0 flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl max-w-42.5"
                      >
                        {file.type === 'image' ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                            <img src={file.data} alt="thumb" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#588CBC]/15 flex items-center justify-center text-[#588CBC] shrink-0 border border-[#588CBC]/20">
                            <FileText size={14} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-700 truncate leading-tight">
                            {file.name}
                          </p>
                          <p className="text-[8px] text-slate-400 font-medium">
                            {file.sizeStr || ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(idx)}
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors"
                          title="Hapus file ini"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 bg-slate-50/50 rounded-2xl p-1">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
              <div className="flex items-center gap-1 mb-1 ml-1">
                <button 
                  type="button" 
                  onClick={handleFileClick} 
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-all relative",
                    pendingFiles.length > 0
                      ? "bg-[#588CBC] text-white shadow-sm"
                      : "text-slate-400 hover:bg-white hover:shadow-sm active:text-[#588CBC]"
                  )}
                  title={pendingFiles.length > 0 ? `${pendingFiles.length} file terlampir (Maks 5)` : "Lampirkan file (Maks 5)"}
                >
                  <Paperclip size={20} />
                  {pendingFiles.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white">
                      {pendingFiles.length}
                    </span>
                  )}
                </button>
                <button type="button" onClick={() => setIsTemplatePopupOpen(true)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-full active:text-[#588CBC] transition-all">
                  <LayoutGrid size={20} />
                </button>
              </div>
              <textarea
                id="admin-message-input"
                value={manualNote}
                onChange={(e) => {
                  setManualNote(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                placeholder={pendingFiles.length > 0 ? "Tambahkan catatan file..." : "Tulis pesan..."}
                className="flex-1 min-w-0 py-2.5 px-2 text-[13px] font-medium text-slate-700 bg-transparent focus:outline-none resize-none max-h-30 scrollbar-hide wrap-anywhere"
                rows={1}
              />
              <button
                type="submit"
                disabled={!manualNote.trim() && !selectedResponse && pendingFiles.length === 0}
                className="w-10 h-10 mb-0.5 mr-0.5 bg-[#183449] hover:bg-[#588CBC] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#183449]/20 disabled:opacity-30 hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileChatRoomView;
