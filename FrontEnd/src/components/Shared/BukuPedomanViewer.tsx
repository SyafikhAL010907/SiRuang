'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bukuPedoman } from '@/constants/bukuPedoman';
import { ChevronDown, ChevronUp, BookOpen, ExternalLink, AlertTriangle } from 'lucide-react';

export default function BukuPedomanViewer() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  const renderFormLinks = (text: string) => {
    // Regex for urls
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        let cleanUrl = part.trim();
        while (['.', ',', ';', '?', '!', ')'].some(char => cleanUrl.endsWith(char))) {
          cleanUrl = cleanUrl.slice(0, -1);
        }
        if (!cleanUrl.toLowerCase().startsWith('http')) {
          cleanUrl = 'https://' + cleanUrl;
        }
        return (
          <a
            key={index}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#588CBC] hover:text-[#183449] font-bold underline break-all bg-[#588CBC]/10 px-1.5 py-0.5 rounded transition-all mt-1 select-all"
          >
            Lihat Link <ExternalLink size={12} />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 py-4 px-1 select-none">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="text-[#183449] shrink-0 animate-pulse" size={24} />
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
            Admin
          </h2>
        </div>
        <span className="text-[10px] font-black bg-[#588CBC]/15 text-[#183449] px-2.5 py-1 rounded-full uppercase tracking-widest border border-[#588CBC]/20">
          5 Halaman
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {bukuPedoman.map((item, index) => {
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md select-none ${
                isOpen ? 'border-[#588CBC] ring-4 ring-[#588CBC]/10' : 'border-slate-100/80 hover:border-[#588CBC]/40'
              }`}
            >
              {/* Header section / trigger */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left select-none outline-none focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  {/* Visual design resembling second image */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-3xl font-black text-[#183449] tracking-tighter leading-none select-none">
                      {item.number}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 select-none uppercase tracking-wider mt-1">
                      Hal {item.page}
                    </span>
                  </div>

                  {/* Divider line style */}
                  <div className="h-10 w-0.5 bg-[#B3B3B3] shrink-0"></div>

                  <div className="flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-slate-800 leading-snug select-none flex items-center justify-between">
                      <span>{item.title}</span>
                      <span className="text-xs font-black text-slate-400">&gt;</span>
                    </h3>
                  </div>
                </div>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isOpen ? 'bg-[#588CBC]/15 text-[#588CBC]' : 'bg-slate-50 text-slate-400'
                }`}>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expansion content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden bg-slate-50/40"
                  >
                    <div className="px-5 pb-5 pt-2 flex flex-col gap-4 border-t border-slate-100 select-none">
                      {/* Description / Introduction Text */}
                      <div className="text-[13px] font-medium leading-relaxed text-slate-600 italic select-none">
                        {renderFormLinks(item.description)}
                      </div>

                      {/* Numbered / Step Content */}
                      <div className="flex flex-col gap-2.5">
                        {item.steps.map((step, sIndex) => (
                          <div key={sIndex} className="flex gap-3 items-start select-none">
                            <span className="w-6 h-6 rounded-full bg-[#588CBC]/15 text-[#183449] text-xs font-black flex items-center justify-center shrink-0 mt-0.5 select-none">
                              {sIndex + 1}
                            </span>
                            <p className="text-[13px] text-slate-700 font-medium leading-relaxed flex-1 select-none">
                              {renderFormLinks(step)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Notes Section for step-01 */}
                      {item.notes && (
                        <div className="mt-2 bg-amber-50/60 border border-amber-100/80 rounded-xl p-3.5 flex gap-3 items-start select-none">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                          <div className="flex flex-col gap-1 select-none">
                            <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider select-none">
                              Penting &amp; Mohon Perhatian
                            </span>
                            <p className="text-xs font-semibold leading-relaxed text-amber-700/90 select-none">
                              {item.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
