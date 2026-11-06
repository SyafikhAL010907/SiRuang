'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Clock,
  X,
  FileText,
  Paperclip,
  Send
} from 'lucide-react';
import { CannedResponse } from '@/constants/chatTypes';
import { cn } from '@/lib/utils';

export interface ChatInputAreaProps {
  setIsTemplatePopupOpen: (open: boolean) => void;
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
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  setIsTemplatePopupOpen,
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
}) => {
  return (
    <div className="px-4 lg:px-8 pb-8 pt-2">
      <div className="bg-white border border-slate-100 rounded-4xl shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-stretch gap-4">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setIsTemplatePopupOpen(true)}
              className="shrink-0 px-6 bg-white border border-[#588CBC]/30 text-[#183449] rounded-[28px] shadow-lg flex flex-col items-center justify-center hover:border-[#588CBC] hover:text-[#588CBC] hover:shadow-xl hover:shadow-slate-200 transition-all group gap-1 min-w-30"
            >
              <div className="w-8 h-8 rounded-xl bg-[#588CBC]/10 flex items-center justify-center group-hover:bg-[#183449] group-hover:text-white transition-all">
                <LayoutGrid size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Template</span>
            </motion.button>

            <AnimatePresence mode="wait">
              {selectedResponse ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 p-4 bg-[#588CBC]/10 border border-[#588CBC]/20 rounded-[28px] flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#588CBC]/20 flex items-center justify-center shrink-0">
                      <Clock size={18} className="text-[#183449]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#183449] uppercase tracking-widest mb-0.5">Selected Draft:</p>
                      <p className="text-sm text-[#2B2B2B]/80 italic font-medium leading-relaxed whitespace-pre-wrap">&quot;{selectedResponse.response}&quot;</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedResponse(null)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                  >
                    <X size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 p-4 border-2 border-dashed border-slate-100 rounded-[28px] flex items-center justify-center bg-slate-50/30"
                >
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Silakan pilih template untuk mempercepat balasan</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
            {/* MULTI-ATTACHMENT TRAY (Up to 5 files) */}
            <AnimatePresence>
              {pendingFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="p-3 bg-slate-50/95 border border-slate-200/90 rounded-2xl flex flex-col gap-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Lampiran ({pendingFiles.length}/5 File)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-wider"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 max-w-60"
                      >
                        {file.type === 'image' ? (
                          <img
                            src={file.data}
                            alt="Preview"
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[#588CBC]/15 flex items-center justify-center text-[#588CBC] shrink-0 border border-[#588CBC]/20">
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {file.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-semibold">{file.sizeStr}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingFile(idx)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                          title="Hapus file ini"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-3">
              {/* Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,video/*"
                multiple
                className="hidden"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleFileClick}
                className={cn(
                  "w-12 h-12 mb-1 rounded-2xl flex items-center justify-center transition-all shrink-0",
                  pendingFiles.length > 0
                    ? "bg-[#588CBC] text-white shadow-md shadow-[#588CBC]/30"
                    : "text-slate-400 hover:bg-[#588CBC]/10 hover:text-[#183449]"
                )}
                title={pendingFiles.length > 0 ? `${pendingFiles.length} file terlampir (klik untuk tambah)` : "Lampirkan file (Maks 5)"}
              >
                <Paperclip size={24} />
              </motion.button>

              <div className="flex-1 relative">
                <textarea
                  id="admin-web-message-input"
                  value={manualNote}
                  onChange={(e) => {
                    setManualNote(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  placeholder={
                    pendingFiles.length > 0
                      ? "Tambahkan catatan/keterangan file (opsional)..."
                      : selectedResponse
                      ? "Add personal notes..."
                      : "Type your message or select template..."
                  }
                  className="w-full min-w-0 px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] transition-all resize-none font-medium max-h-37.5 scrollbar-hide wrap-anywhere"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!manualNote.trim() && !selectedResponse && pendingFiles.length === 0}
                className="w-14 h-14 bg-[#183449] text-white rounded-3xl flex items-center justify-center shadow-xl shadow-[#183449]/20 hover:bg-[#588CBC] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 disabled:shadow-none shrink-0"
              >
                <Send size={24} className="ml-1" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInputArea;
