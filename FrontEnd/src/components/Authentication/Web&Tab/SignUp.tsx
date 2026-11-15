'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  User,
  Hash,
  Lock,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Mail,
  BookOpen,
  School,
  Calendar,
  Phone,
  Building2,
} from 'lucide-react';

interface SignUpProps {
  onNavigate: () => void;
  onSignUp: (payload: any) => void;
  loading: boolean;
}

const WebSignUp = ({ onNavigate, onSignUp, loading }: SignUpProps) => {
  const [username, setUsername] = useState('');
  const [roleType, setRoleType] = useState<'mahasiswa' | 'pj_kelas' | 'dosen'>('mahasiswa');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [kelas, setKelas] = useState('');
  const [prodi, setProdi] = useState('');
  const [fakultas, setFakultas] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [departemen, setDepartemen] = useState('');
  const [phone, setPhone] = useState('');

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    onSignUp({
      username: username.trim(),
      identifier: identifier.trim(),
      role_type: roleType,
      password,
      ...(roleType === 'mahasiswa'
        ? {
            identifier_type: 'nim',
            email: email.trim() || undefined,
          }
        : roleType === 'pj_kelas'
        ? {
            identifier_type: 'nim',
            email: email.trim(),
            kelas: kelas.trim(),
            prodi: prodi.trim(),
            fakultas: fakultas.trim(),
            angkatan: angkatan.trim(),
          }
        : {
            identifier_type: 'nip',
            email: email.trim(),
            departemen: departemen.trim() || undefined,
            prodi: prodi.trim() || undefined,
            fakultas: fakultas.trim() || undefined,
            phone: phone.trim() || undefined,
          }),
    });
  };

  return (
    <div className="min-h-screen bg-[#07111E] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#588CBC]/20 selection:text-[#183449]">
      {/* FULL BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/BackgroundLogSign.png')`,
          filter: 'brightness(0.6) contrast(1.15)',
        }}
      />

      {/* Dark Overlay Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-slate-950/75" />

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-150 h-150 bg-[#588CBC]/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-150 h-150 bg-[#183449]/10 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-5xl flex bg-white/60 backdrop-blur-3xl rounded-[48px] shadow-[0_32px_80px_rgba(24,52,73,0.12)] border border-white relative z-10 overflow-hidden">
        {/* LEFT PANEL - BRANDING */}
        <div
          className="hidden lg:flex flex-1 bg-[#000000] p-16 flex-col justify-center items-center relative overflow-hidden"
          style={{ background: '#000000' }}
        >
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#588CBC]/15 rounded-full blur-[100px] -ml-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#0d1d2a]/50 rounded-full blur-[90px] -mr-20 -mb-20 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <div className="-mt-8 lg:-mt-12 drop-shadow-2xl">
              <Image
                src="/LogoSiRuang.png"
                alt="Logo SiRuang"
                width={340}
                height={340}
                priority
                className="w-64 h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl"
              />
            </div>

            <div className="-mt-4 lg:-mt-6 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-slate-300 tracking-wider">Sudah memiliki akun?</p>
              <button
                type="button"
                onClick={onNavigate}
                className="px-8 py-3.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xs tracking-widest uppercase transition-all backdrop-blur-md shadow-lg shadow-black/20 hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 cursor-pointer group"
              >
                <span>Masuk ke Akun</span>
                <ArrowRight size={16} className="text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* RIGHT PANEL - SIGNUP FORM */}
        <div className="flex-[0.8] p-8 lg:p-14 flex flex-col justify-center bg-slate-50/60 relative overflow-hidden max-h-[90vh] overflow-y-auto">
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-80"
            style={{
              backgroundImage: `url('/Batik.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto w-full relative z-10">
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Daftar Akun</h2>
              <p className="text-slate-500 font-medium text-xs mt-1">Pendaftaran akun baru memerlukan persetujuan admin.</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-3.5">
              {/* SELECTOR ROLE: MAHASISWA / PJ KELAS / DOSEN */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daftar Sebagai</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoleType('mahasiswa')}
                    className={`py-2.5 px-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleType === 'mahasiswa'
                        ? 'bg-[#183449] text-white shadow-md shadow-[#183449]/20'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-[#588CBC]'
                    }`}
                  >
                    <GraduationCap size={14} />
                    <span>Mahasiswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleType('pj_kelas')}
                    className={`py-2.5 px-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleType === 'pj_kelas'
                        ? 'bg-[#183449] text-white shadow-md shadow-[#183449]/20'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-[#588CBC]'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>PJ Kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleType('dosen')}
                    className={`py-2.5 px-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleType === 'dosen'
                        ? 'bg-[#183449] text-white shadow-md shadow-[#183449]/20'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-[#588CBC]'
                    }`}
                  >
                    <Briefcase size={14} />
                    <span>Dosen</span>
                  </button>
                </div>
              </div>

              {/* USERNAME / NAMA */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={roleType === 'dosen' ? 'Nama Lengkap & Gelar' : 'Nama Lengkap Mahasiswa'}
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* NIM / NIP */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {roleType === 'dosen' ? 'NIP (Nomor Induk Pegawai)' : 'NIM (Nomor Induk Mahasiswa)'}
                </label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={50}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={roleType === 'dosen' ? 'Contoh: 198501012010121001' : 'Contoh: 1313620001 (Angka)'}
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* EMAIL (HANYA UNTUK PJ KELAS & DOSEN) */}
              {roleType !== 'mahasiswa' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      maxLength={150}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kata Sandi (Min 8 Karakter)</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                  />
                </div>
              </div>

              {roleType === 'pj_kelas' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                      <div className="relative group">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={kelas}
                          onChange={(e) => setKelas(e.target.value)}
                          placeholder="Contoh: TE-3A"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Angkatan</label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          maxLength={4}
                          value={angkatan}
                          onChange={(e) => setAngkatan(e.target.value)}
                          placeholder="Contoh: 2024"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Studi</label>
                      <div className="relative group">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={prodi}
                          onChange={(e) => setProdi(e.target.value)}
                          placeholder="Contoh: PVTE"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fakultas</label>
                      <div className="relative group">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          required
                          maxLength={150}
                          value={fakultas}
                          onChange={(e) => setFakultas(e.target.value)}
                          placeholder="Contoh: FT"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {roleType === 'dosen' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departemen (Opsional)</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          maxLength={100}
                          value={departemen}
                          onChange={(e) => setDepartemen(e.target.value)}
                          placeholder="Departemen"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. HP/WA (Opsional)</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="tel"
                          maxLength={20}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0812xxxx"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Studi (Opsional)</label>
                      <div className="relative group">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          maxLength={100}
                          value={prodi}
                          onChange={(e) => setProdi(e.target.value)}
                          placeholder="Program Studi"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fakultas (Opsional)</label>
                      <div className="relative group">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#588CBC] transition-colors" size={18} />
                        <input
                          type="text"
                          maxLength={150}
                          value={fakultas}
                          onChange={(e) => setFakultas(e.target.value)}
                          placeholder="Fakultas"
                          className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-100 rounded-3xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#588CBC]/15 focus:border-[#588CBC] transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-linear-to-br from-[#07111E] to-[#0F2238] text-white py-4 rounded-3xl font-black text-sm shadow-xl shadow-[#183449]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'MEMPROSES...' : 'AJUKAN PENDAFTARAN'}</span>
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WebSignUp;
