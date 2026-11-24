'use client';

import React, { useState } from 'react';
import { Search, Building2, X, Loader2 } from 'lucide-react';
import Avatar from '@/components/Shared/Avatar';
import { cn } from '@/lib/utils';

export interface SearchAdminGedungModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAdmin: (admin: any) => void;
}

export const SearchAdminGedungModal: React.FC<SearchAdminGedungModalProps> = ({
  isOpen,
  onClose,
  onSelectAdmin,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const storedUser = localStorage.getItem('user');
      const token = storedUser ? JSON.parse(storedUser).token : '';
      const res = await fetch(`/api/chat/search-admin-gedung?q=${encodeURIComponent(val.trim())}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setResults(json.admins || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#183449] text-white flex items-center justify-center shadow-sm">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#183449]">Cari Admin Gedung</h3>
              <p className="text-[10px] text-slate-400">Hubungi petugas gedung SFD, LE, atau LS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ketik SFD, LE, LS, atau nama admin..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-[#588CBC] focus:bg-white transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Daftar Hasil */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin text-[#588CBC]" />
              <span className="text-xs">Mencari admin gedung...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((adm) => (
              <div
                key={adm.user_id}
                onClick={() => {
                  onSelectAdmin(adm);
                  onClose();
                }}
                className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-[#588CBC]/5 hover:border-[#588CBC]/30 cursor-pointer transition-all flex items-center gap-3 group"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={adm.avatar_url}
                    alt={adm.full_name}
                    size="md"
                    className="border border-white shadow-xs group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-[#183449]">
                      {adm.full_name}
                    </h4>
                    {adm.gedung_kode && (
                      <span className="px-2 py-0.5 bg-[#183449] text-white text-[9px] font-black rounded-md uppercase tracking-wider shrink-0 ml-1">
                        Gedung {adm.gedung_kode}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    Role: {adm.role}
                  </p>
                </div>
              </div>
            ))
          ) : hasSearched ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs font-semibold">Tidak ditemukan admin gedung</p>
              <p className="text-[10px] mt-1 text-slate-400">Coba kata kunci: SFD, LE, atau LS</p>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Building2 size={28} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-500">Mulai Pencarian</p>
              <p className="text-[10px] mt-0.5 text-slate-400">Ketik kode gedung atau nama petugas untuk chat langsung</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchAdminGedungModal;

