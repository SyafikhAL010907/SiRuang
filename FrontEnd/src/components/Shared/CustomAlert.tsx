import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CustomAlertProps = {
  config: {
    show: boolean;
    type: 'alert' | 'confirm';
    message: string;
    title?: string;
    onConfirm?: () => void;
  };
  onClose: () => void;
};

const CustomAlert: React.FC<CustomAlertProps> = ({ config, onClose }) => {
  const isConfirm = config.type === 'confirm';
  const title = config.title || (isConfirm ? 'Konfirmasi' : 'Pemberitahuan');

  return (
    <AnimatePresence>
      {config.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-4xl overflow-hidden shadow-2xl"
          >
            {/* Header Gradient */}
            <div className={`p-6 ${isConfirm ? 'bg-linear-to-br from-amber-500 to-amber-700' : 'bg-linear-to-br from-[#183449] to-[#2B5474]'} relative overflow-hidden`}>
              <div className="absolute -top-5 -right-5 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                  <span className="text-2xl">{isConfirm ? '⚠️' : '🔔'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-0.5">Info System</p>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  {config.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2 pt-4 border-t border-slate-100">
                {isConfirm ? (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all uppercase tracking-widest"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (config.onConfirm) config.onConfirm();
                        onClose();
                      }}
                      className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all uppercase tracking-widest"
                    >
                      Yakin
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-[#183449] hover:bg-[#588CBC] shadow-lg shadow-[#183449]/20 transition-all uppercase tracking-widest"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomAlert;
