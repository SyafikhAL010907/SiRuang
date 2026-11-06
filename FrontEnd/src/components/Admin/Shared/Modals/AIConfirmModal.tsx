'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AIConfirmModalProps {
  variant?: 'web' | 'mobile';
  showAIConfirm: boolean;
  setShowAIConfirm: (show: boolean) => void;
  pendingAIState: boolean;
  handleToggleAI: (newState: boolean) => void;
}

export const AIConfirmModal: React.FC<AIConfirmModalProps> = ({
  variant = 'web',
  showAIConfirm,
  setShowAIConfirm,
  pendingAIState,
  handleToggleAI,
}) => {
  const isMobile = variant === 'mobile';

  return (
    <AnimatePresence>
      {showAIConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={
            isMobile
              ? "fixed inset-0 z-200 flex items-end justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              : "fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          }
          onClick={() => setShowAIConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: isMobile ? 80 : 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 80 : 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-4xl overflow-hidden shadow-2xl"
          >
            {/* Header Gradient */}
            <div
              className={`p-6 ${
                isMobile
                  ? pendingAIState
                    ? 'bg-linear-to-br from-[#183449] to-[#285577]'
                    : 'bg-linear-to-br from-[#2B2B2B] to-[#565656]'
                  : pendingAIState
                    ? 'bg-linear-to-br from-[#183449] to-[#2B5474]'
                    : 'bg-linear-to-br from-[#2B2B2B] to-[#565656]'
              } relative overflow-hidden`}
            >
              <div className="absolute -top-5 -right-5 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <span className="text-2xl">{pendingAIState ? '🤖' : '🔕'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-0.5">Konfirmasi</p>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {pendingAIState ? 'Aktifkan AI?' : 'Matikan AI?'}
                  </h3>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              {pendingAIState ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Fitur{' '}
                    <span className={isMobile ? "text-[#183449]" : "text-[#588CBC]"}>
                      Auto-Response AI
                    </span>{' '}
                    akan diaktifkan untuk semua chat yang masuk.
                  </p>
                  <div className="bg-[#588CBC]/10 rounded-2xl p-4 flex flex-col gap-2 border border-[#588CBC]/20">
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">✅</span>
                      <p className="text-xs font-semibold text-slate-600">
                        AI akan otomatis menjawab pertanyaan user berdasarkan template yang sudah dilatih
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">✅</span>
                      <p className="text-xs font-semibold text-slate-600">
                        Respons akan muncul dalam hitungan detik
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">⚠️</span>
                      <p className="text-xs font-semibold text-slate-500">
                        Pastikan ML Service sudah berjalan sebelum mengaktifkan
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">
                    Fitur <span className="text-slate-600">Auto-Response AI</span> akan dinonaktifkan.
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2 border border-slate-100">
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">ℹ️</span>
                      <p className="text-xs font-semibold text-slate-600">
                        Semua chat selanjutnya harus dijawab secara manual oleh admin
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">ℹ️</span>
                      <p className="text-xs font-semibold text-slate-600">
                        Chat yang sedang berjalan tidak terpengaruh
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => setShowAIConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleToggleAI(pendingAIState)}
                  className={`flex-1 py-3.5 rounded-2xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${
                    isMobile
                      ? pendingAIState
                        ? 'bg-[#183449] hover:bg-[#588CBC] shadow-[#183449]/20'
                        : 'bg-[#565656] hover:bg-[#2B2B2B] shadow-slate-200'
                      : pendingAIState
                        ? 'bg-[#183449] hover:bg-[#588CBC] shadow-[#183449]/20'
                        : 'bg-slate-700 hover:bg-slate-800 shadow-slate-200'
                  }`}
                >
                  {pendingAIState ? '🚀 Ya, Aktifkan!' : '🔕 Ya, Matikan'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIConfirmModal;
