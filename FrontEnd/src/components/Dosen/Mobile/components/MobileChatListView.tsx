'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Avatar from '@/components/Shared/Avatar';

export interface MobileChatListViewProps {
  onOpenRoom: () => void;
  onOpenPjRoom?: (room: any) => void;
}

export const MobileChatListView: React.FC<MobileChatListViewProps> = ({
  onOpenRoom,
  onOpenPjRoom,
}) => {
  const [pjRooms, setPjRooms] = useState<any[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const { token } = JSON.parse(storedUser);
        const res = await fetch('/api/chat/dosen-room', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.rooms) setPjRooms(json.rooms);
        }
      } catch {}
    };
    fetchRooms();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full bg-[#F8FAFB] select-none"
    >
      {/* List Header */}
      <div className="bg-linear-to-br from-[#183449] to-[#2B5474] rounded-b-[36px] px-6 pt-10 pb-7 shadow-xl relative overflow-hidden shrink-0 z-20">
        <div className="absolute -top-5 -right-5 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <header className="relative z-10">
          <h2 className="text-xl font-black text-white tracking-tight leading-none">Pesan Bantuan &amp; Konsultasi</h2>
          <p className="text-sky-200 text-[10px] font-bold uppercase tracking-widest mt-2">Daftar Room Chat Tersedia</p>
        </header>
      </div>

      {/* Room Items */}
      <main className="flex-1 px-4 sm:px-6 overflow-y-auto scrollbar-hide pt-4 pb-36">
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2 mt-1">
            Saluran Chat Aktif
          </h4>

          {/* ROOM 1: ADMIN HELPDESK */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onOpenRoom}
            className="w-full bg-white p-4.5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group active:bg-slate-50 transition-all text-left cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-13 h-13 bg-[#588CBC]/10 rounded-2xl flex items-center justify-center text-[#588CBC] ring-2 ring-slate-100/80">
                <Image
                  src="/LogoSiRuangPolos.png"
                  alt="SiRuang"
                  width={34}
                  height={34}
                  className="drop-shadow-xs object-contain"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">Admin UNJ</h4>
                  <span className="px-1.5 py-0.2 bg-[#588CBC]/15 text-[#183449] text-[8px] font-black rounded uppercase">
                    Helpdesk
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                Layanan konsultasi ruangan &amp; bantuan teknis
              </p>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#183449] group-hover:text-white transition-all shrink-0">
              <ChevronRight size={18} />
            </div>
          </motion.button>

          {/* PJ Kelas Rooms */}
          {pjRooms.length > 0 && (
            <>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2 mt-2">
                PJ Kelas
              </h4>
              {pjRooms.map((room) => (
                <motion.button
                  key={room.room_id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenPjRoom && onOpenPjRoom(room)}
                  className="w-full bg-white p-4.5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group active:bg-slate-50 transition-all text-left cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 bg-slate-100 rounded-2xl flex items-center justify-center ring-2 ring-slate-100/80 overflow-hidden">
                      <Avatar size="md" src={room.pj_avatar} alt={room.pj_name} />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">{room.pj_name}</h4>
                        <span className="px-1.5 py-0.2 bg-[#588CBC]/15 text-[#183449] text-[8px] font-black rounded uppercase">
                          PJ Kelas
                        </span>
                      </div>
                      {room.unread_count > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                          {room.unread_count} baru
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium truncate">
                      {room.mata_kuliah}{room.kelas ? ` (${room.kelas})` : ''}
                    </p>
                    {room.last_message && (
                      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        {room.last_message}
                      </p>
                    )}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#183449] group-hover:text-white transition-all shrink-0">
                    <ChevronRight size={18} />
                  </div>
                </motion.button>
              ))}
            </>
          )}

          {/* Info Card */}
          <div className="p-5 bg-linear-to-br from-[#183449] to-[#2B5474] rounded-3xl text-white relative overflow-hidden shadow-xl shadow-[#183449]/15 mt-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#588CBC]/15 rounded-full blur-3xl pointer-events-none" />
            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-200 mb-1.5">Info Layanan</h5>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
              Petugas Admin UNJ akan segera merespon pesan Anda. Chat dengan PJ Kelas tersedia berdasarkan relasi mata kuliah.
            </p>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default MobileChatListView;
