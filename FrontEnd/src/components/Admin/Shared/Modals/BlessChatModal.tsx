'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCheck, Paperclip, FileText, Eye } from 'lucide-react';
import { blastTemplates } from '@/constants/blastTemplates';
import { cn } from '@/lib/utils';

export interface BlessChatModalProps {
  variant?: 'web' | 'mobile';
  showBlessModal: boolean;
  setShowBlessModal: (show: boolean) => void;
  blessMessage: string;
  setBlessMessage: (msg: string) => void;
  blessFile: { name: string; data: string; type: string } | null;
  setBlessFile: (file: { name: string; data: string; type: string } | null) => void;
  blessTargetMode: 'waiting_room' | 'all_users' | 'specific_users';
  setBlessTargetMode: (mode: 'waiting_room' | 'all_users' | 'specific_users') => void;
  allUsers: { username: string; gmail: string }[];
  selectedBlessUsers: string[];
  setSelectedBlessUsers: React.Dispatch<React.SetStateAction<string[]>>;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  isBlasting: boolean;
  handleBlessChat: () => void;
  viewFile: (dataUrl: string, fileName?: string) => void;
  showAlert: (message: string, title?: string) => void;
}

export const BlessChatModal: React.FC<BlessChatModalProps> = ({
  variant = 'web',
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
  const isMobile = variant === 'mobile';

  return (
    <AnimatePresence>
      {showBlessModal && (
        <div
          className={
            isMobile
              ? "fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
              : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          }
        >
          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 0.9 : 0.95, y: isMobile ? 40 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isMobile ? 0.9 : 0.95, y: isMobile ? 40 : 20 }}
            className={
              isMobile
                ? "bg-white rounded-[40px] w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100"
                : "bg-white rounded-4xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            }
          >
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              <div
                className={
                  isMobile
                    ? "w-14 h-14 bg-[#588CBC]/20 rounded-2xl flex items-center justify-center mb-6"
                    : "w-16 h-16 bg-[#588CBC]/20 rounded-2xl flex items-center justify-center mb-6"
                }
              >
                <span className={isMobile ? "text-2xl" : "text-3xl"}>📢</span>
              </div>
              <h3
                className={
                  isMobile
                    ? "text-xl font-black text-slate-800 mb-2 tracking-tight"
                    : "text-2xl font-black text-slate-800 mb-2"
                }
              >
                Bless Chat
              </h3>
              <p
                className={
                  isMobile
                    ? "text-slate-500 text-xs mb-6 font-medium leading-relaxed"
                    : "text-slate-500 text-sm mb-6 font-medium leading-relaxed"
                }
              >
                Kirim pengumuman penting ke pengguna. Pilih target penerima di bawah ini.
              </p>

              {/* Target Selector */}
              <div
                className={
                  isMobile
                    ? "mb-6 bg-slate-50 p-1 rounded-2xl border border-slate-100 flex gap-1"
                    : "mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 flex gap-1.5"
                }
              >
                <button
                  onClick={() => setBlessTargetMode('waiting_room')}
                  className={cn(
                    isMobile
                      ? "flex-1 py-2 px-2 rounded-xl text-[10px] font-black transition-all duration-300"
                      : "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                    blessTargetMode === 'waiting_room'
                      ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  Active Room
                </button>
                <button
                  onClick={() => setBlessTargetMode('all_users')}
                  className={cn(
                    isMobile
                      ? "flex-1 py-2 px-2 rounded-xl text-[10px] font-black transition-all duration-300"
                      : "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                    blessTargetMode === 'all_users'
                      ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  Semua Akun
                </button>
                <button
                  onClick={() => setBlessTargetMode('specific_users')}
                  className={cn(
                    isMobile
                      ? "flex-1 py-2 px-2 rounded-xl text-[10px] font-black transition-all duration-300"
                      : "flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all duration-300",
                    blessTargetMode === 'specific_users'
                      ? "bg-white text-[#183449] shadow-sm ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  Pilih User
                </button>
              </div>

              <AnimatePresence mode="wait">
                {blessTargetMode === 'specific_users' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden flex flex-col gap-3"
                  >
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#588CBC]/20 focus:border-[#588CBC] outline-none transition-all"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-xl border border-slate-100 p-2 flex flex-col gap-1 scrollbar-hide">
                      {allUsers
                        .filter(
                          (u) =>
                            u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.gmail.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((user) => (
                          <label
                            key={user.gmail}
                            className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded shadow-inner flex items-center justify-center transition-colors border shrink-0",
                                selectedBlessUsers.includes(user.gmail)
                                  ? "bg-[#183449] border-[#183449] text-white"
                                  : "bg-white border-slate-300"
                              )}
                            >
                              {selectedBlessUsers.includes(user.gmail) && <CheckCheck size={10} />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedBlessUsers.includes(user.gmail)}
                              onChange={() => {
                                setSelectedBlessUsers((prev) =>
                                  prev.includes(user.gmail)
                                    ? prev.filter((g) => g !== user.gmail)
                                    : [...prev, user.gmail]
                                );
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-700 truncate">{user.username}</span>
                              <span className="text-[10px] font-medium text-slate-400 truncate">{user.gmail}</span>
                            </div>
                          </label>
                        ))}
                      {allUsers.length === 0 && (
                        <p className="text-center text-[10px] font-bold text-slate-400 p-4">Memuat data user...</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Pilih Templat:
                </p>
                <div className="flex flex-wrap gap-2">
                  {blastTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setBlessMessage(template.content)}
                      className="px-3 py-2 bg-[#588CBC]/10 hover:bg-[#588CBC]/20 text-[#183449] text-[10px] font-black rounded-xl border border-[#588CBC]/20 transition-all active:scale-95"
                    >
                      {template.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setBlessMessage('')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 transition-all active:scale-95"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <textarea
                value={blessMessage}
                onChange={(e) => setBlessMessage(e.target.value)}
                placeholder={blessFile ? "Tambahkan keterangan file..." : "Tulis pengumuman di sini..."}
                className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#588CBC]/20 transition-all resize-none font-medium"
              />

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="bless-file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            showAlert(
                              `Waduh bro! Ukuran file lu (${(file.size / (1024 * 1024)).toFixed(
                                2
                              )} MB) kegedean. Maksimal cuma boleh 1 MB biar server tetep ngebut!`,
                              'Ukuran File Kegedean'
                            );
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBlessFile({
                              name: file.name,
                              data: reader.result as string,
                              type: file.type.startsWith('image/') ? 'image' : 'file',
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="bless-file"
                      className="flex items-center gap-2 px-4 py-2 bg-[#588CBC]/10 hover:bg-[#588CBC]/20 text-[#183449] rounded-xl text-xs font-bold cursor-pointer transition-all border border-[#588CBC]/20"
                    >
                      <Paperclip size={14} />
                      {blessFile ? 'Ganti File' : 'Lampirkan File'}
                    </label>
                    {blessFile && (
                      <button
                        onClick={() => setBlessFile(null)}
                        className="text-rose-500 text-xs font-bold hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  {/* Preview Section */}
                  {blessFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      {blessFile.type === 'image' ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Preview Gambar:
                          </p>
                          <img
                            src={blessFile.data}
                            alt="Preview"
                            onClick={() => viewFile(blessFile.data, blessFile.name || "Gambar_Preview.png")}
                            className="w-full max-h-48 object-contain rounded-xl cursor-zoom-in hover:opacity-90 transition-all border border-slate-200 bg-slate-100/50"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 bg-[#588CBC]/20 rounded-lg flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-[#183449]" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 truncate">{blessFile.name}</p>
                          </div>
                          <button
                            onClick={() => viewFile(blessFile.data, blessFile.name)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] font-black text-slate-600 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1"
                          >
                            <Eye size={12} />
                            Lihat Isi
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => {
                  setShowBlessModal(false);
                  setBlessFile(null);
                  setBlessMessage('');
                  setSelectedBlessUsers([]);
                }}
                className={
                  isMobile
                    ? "flex-1 py-4 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-100 transition-all"
                    : "flex-1 py-3.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all"
                }
              >
                Batal
              </button>
              <button
                onClick={handleBlessChat}
                disabled={isBlasting || (!blessMessage.trim() && !blessFile)}
                className={
                  isMobile
                    ? "flex-2 py-4 bg-[#183449] text-white rounded-2xl text-xs font-black shadow-lg shadow-[#183449]/20 hover:bg-[#588CBC] transition-all disabled:opacity-50"
                    : "flex-2 py-3.5 bg-[#183449] text-white rounded-xl text-sm font-black shadow-lg shadow-[#183449]/20 hover:bg-[#588CBC] transition-all disabled:opacity-50 disabled:shadow-none"
                }
              >
                {isBlasting ? 'Mengirim...' : isMobile ? 'Bless Now!' : 'Kirim Sekarang'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BlessChatModal;
