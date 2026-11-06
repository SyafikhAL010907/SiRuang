'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cannedResponses } from '@/constants/cannedResponses';
import { CannedResponse } from '@/constants/chatTypes';
import { cn } from '@/lib/utils';

export interface TemplatePopupModalProps {
  variant?: 'web' | 'mobile';
  isTemplatePopupOpen: boolean;
  setIsTemplatePopupOpen: (open: boolean) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  onSelectResponse: (resp: CannedResponse) => void;
}

export const TemplatePopupModal: React.FC<TemplatePopupModalProps> = ({
  variant = 'web',
  isTemplatePopupOpen,
  setIsTemplatePopupOpen,
  activeCategory,
  setActiveCategory,
  onSelectResponse,
}) => {
  const isMobile = variant === 'mobile';

  return (
    <AnimatePresence>
      {isTemplatePopupOpen && (
        <div
          className={
            isMobile
              ? "fixed inset-0 z-999 flex items-end sm:items-center justify-center p-0 sm:p-6"
              : "fixed inset-0 z-9999 flex items-center justify-center p-6"
          }
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTemplatePopupOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 100 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? 100 : 20 }}
            className={
              isMobile
                ? "relative w-full max-w-xl bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                : "relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            }
          >
            {/* Modal Header */}
            <div
              className={
                isMobile
                  ? "px-8 py-6 bg-[#183449] text-white flex items-center justify-between shrink-0"
                  : "px-8 py-6 bg-linear-to-r from-[#183449] to-[#2B5474] text-white flex items-center justify-between"
              }
            >
              <div>
                <h3 className={isMobile ? "text-lg font-black tracking-tight" : "text-xl font-black tracking-tight"}>
                  Template Balasan
                </h3>
                <p
                  className={
                    isMobile
                      ? "text-white/60 text-[9px] font-bold uppercase tracking-widest mt-1"
                      : "text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1"
                  }
                >
                  {isMobile ? "Pilih kategori bantuan" : "Pilih kategori dan pertanyaan"}
                </p>
              </div>
              <button
                onClick={() => setIsTemplatePopupOpen(false)}
                className={
                  isMobile
                    ? "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-all"
                    : "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                }
              >
                <X size={20} />
              </button>
            </div>

            {isMobile ? (
              /* Mobile Category Tabs & Questions */
              <>
                {/* Categories Tabs - Horizontal Scroll */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-hide flex gap-3 shrink-0">
                  {Array.from(new Set(cannedResponses.map((r) => r.category))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                        activeCategory === cat
                          ? "bg-[#183449] text-white shadow-lg shadow-[#183449]/20"
                          : "bg-white text-slate-400 border border-slate-100"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Questions List */}
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                  <div className="flex flex-col gap-4">
                    {cannedResponses
                      .filter((r) => r.category === activeCategory)
                      .map((resp) => (
                        <motion.button
                          key={resp.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            onSelectResponse(resp);
                            setIsTemplatePopupOpen(false);
                          }}
                          className="p-5 bg-white border border-slate-100 rounded-[28px] text-left active:border-[#588CBC] active:bg-[#588CBC]/10 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-[#588CBC]/10 text-[7px] font-black text-[#183449] rounded uppercase tracking-widest">
                              {resp.keyword}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-800 leading-tight mb-2">{resp.question}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{resp.response}</p>
                        </motion.button>
                      ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center shrink-0">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
              </>
            ) : (
              /* Web Sidebar & Grid Layout */
              <div className="flex flex-1 overflow-hidden">
                {/* Categories Sidebar */}
                <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-2 overflow-y-auto">
                  {Array.from(new Set(cannedResponses.map((r) => r.category))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-left text-[11px] font-black uppercase tracking-wider transition-all",
                        activeCategory === cat
                          ? "bg-[#183449] text-white shadow-lg shadow-[#183449]/20"
                          : "text-slate-400 hover:bg-white hover:text-[#588CBC]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Questions List */}
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                  <div className="grid grid-cols-1 gap-4">
                    {cannedResponses
                      .filter((r) => r.category === activeCategory)
                      .map((resp) => (
                        <motion.button
                          key={resp.id}
                          whileHover={{ x: 5 }}
                          onClick={() => {
                            onSelectResponse(resp);
                            setIsTemplatePopupOpen(false);
                          }}
                          className="p-5 bg-white border border-slate-100 rounded-3xl text-left hover:border-[#588CBC]/40 hover:shadow-xl hover:shadow-slate-100 transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-[#588CBC]/15 text-[8px] font-black text-[#183449] rounded uppercase tracking-widest">
                              {resp.keyword}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-800 leading-snug group-hover:text-[#183449] transition-colors">
                            {resp.question}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{resp.response}</p>
                        </motion.button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TemplatePopupModal;
