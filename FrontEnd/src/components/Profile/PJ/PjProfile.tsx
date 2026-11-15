'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Trash2,
  User,
  Users,
  Save,
  CheckCircle2,
  ChevronRight,
  Building2,
  MessageCircle,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Lock,
  Loader2,
} from 'lucide-react';

import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  UserProfileData,
} from '@/lib/profileClient';
import {
  validateAvatarFile,
  getAvatarSrc,
} from '@/lib/avatarValidation';
import { useMyProfile, setMyProfile, patchMyProfile } from '@/lib/profileStore';

export interface PjProfileProps {
  pjName?: string;
  pjNim?: string;
  pjGmail?: string;
  onBack?: () => void;
  onSave?: (data: UserProfileData) => void;
}

/** 0812-xxxx / +62812 / 812xxx  ->  62812xxxx */
const normalizeWa = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
};

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#588CBC] focus:ring-4 focus:ring-[#588CBC]/10 transition-all';

const pjAccessItems = [
  { icon: CalendarCheck, title: 'Presensi & Check-in Ruangan', desc: 'Lakukan check-in kehadiran di Gedung SFD saat jam perkuliahan.' },
  { icon: CalendarDays, title: 'Pengajuan Booking Ruangan', desc: 'Ajukan ruangan kelas untuk mata kuliah Anda langsung ke Dosen Pengampu.' },
  { icon: Building2, title: 'Denah Visual Gedung SFD', desc: 'Pantau ketersediaan ruangan realtime di Lantai 3 dan Lantai 8.' },
  { icon: MessageCircle, title: 'Pusat Bantuan & Live Chat', desc: 'Konsultasikan kendala perkuliahan dan perizinan langsung ke Admin.' },
];

export const PjProfile: React.FC<PjProfileProps> = ({
  pjName = 'PJ Kelas UNJ',
  pjNim,
  pjGmail,
  onBack,
  onSave,
}) => {
  // Ambil profil yang dicache di store agar render awal instan
  const { profile: cached } = useMyProfile();

  const [username, setUsername] = useState<string>(() => {
    if (cached?.username) return cached.username;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.username || parsed.Username || pjName;
        }
      } catch {}
    }
    return pjName;
  });

  const [fullName, setFullName] = useState(cached?.fullName || pjName);
  const [email, setEmail] = useState(cached?.email || pjGmail || '');
  const [faculty, setFaculty] = useState(cached?.faculty || 'Fakultas Teknik');
  const [phone, setPhone] = useState(cached?.phone || '');
  const [whatsapp, setWhatsapp] = useState(cached?.whatsapp || cached?.phone || '');
  const [kelas, setKelas] = useState(cached?.kelas || '');
  const [prodi, setProdi] = useState(cached?.prodi || '');
  const [angkatan, setAngkatan] = useState(cached?.angkatan || '');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(cached?.avatarUrl || null);
  const [isDefaultAvatar, setIsDefaultAvatar] = useState<boolean>(cached?.isDefaultAvatar ?? true);
  const [avatarReady, setAvatarReady] = useState<boolean>(!!cached);

  const [loadingProfile, setLoadingProfile] = useState<boolean>(!cached);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [deletingAvatar, setDeletingAvatar] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveIdentifier = cached?.identifier || pjNim || pjGmail || '1512625039';
  const waNumber = useMemo(() => normalizeWa(whatsapp || phone), [whatsapp, phone]);
  const waLink = waNumber ? `https://wa.me/${waNumber}` : '';

  // 1. Ambil data profil dari Backend / Supabase
  useEffect(() => {
    let isMounted = true;
    async function fetchServerProfile() {
      try {
        if (!cached) setLoadingProfile(true);
        const data = await getProfile();
        if (isMounted && data) {
          if (data.username) setUsername(data.username);
          if (data.fullName) setFullName(data.fullName);
          if (data.email) setEmail(data.email);
          if (data.faculty) setFaculty(data.faculty);
          if (data.phone) setPhone(data.phone);
          if (data.whatsapp) {
            setWhatsapp(data.whatsapp);
          } else if (data.phone) {
            setWhatsapp(data.phone);
          }
          if (data.kelas) setKelas(data.kelas);
          if (data.prodi) setProdi(data.prodi);
          if (data.angkatan) setAngkatan(data.angkatan);

          setAvatarUrl(data.avatarUrl);
          setIsDefaultAvatar(data.isDefaultAvatar);
          setMyProfile(data);
        }
      } catch (err: any) {
        console.warn('[PjProfile] Menggunakan data lokal/prop fallback:', err.message);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
          setAvatarReady(true);
        }
      }
    }

    fetchServerProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Upload Foto Avatar
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateAvatarFile(file);
    if (!validation.valid) {
      alert(validation.error);
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    try {
      const res = await uploadAvatar(file);
      setAvatarUrl(res.avatarUrl);
      setIsDefaultAvatar(false);
      patchMyProfile({ avatarUrl: res.avatarUrl, isDefaultAvatar: false });
      e.target.value = '';
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah foto profil');
      e.target.value = '';
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Hapus Foto Avatar
  const handleDeletePhoto = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus foto profil dan kembali ke avatar default?')) {
      setDeletingAvatar(true);
      setError(null);
      try {
        const updated = await deleteAvatar();
        setAvatarUrl(updated.avatarUrl);
        setIsDefaultAvatar(true);
        patchMyProfile({ avatarUrl: updated.avatarUrl, isDefaultAvatar: true });
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus foto profil');
      } finally {
        setDeletingAvatar(false);
      }
    }
  };

  // 4. Simpan Profil (Email, Phone, WhatsApp, FullName)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const finalWa = normalizeWa(whatsapp || phone);
      const payload = {
        fullName: fullName || username,
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: finalWa,
        faculty: faculty.trim(),
      };

      const updated = await updateProfile(payload);
      setFullName(updated.fullName);
      setEmail(updated.email);
      setPhone(updated.phone);
      setWhatsapp(updated.whatsapp);
      setFaculty(updated.faculty);
      patchMyProfile({
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        whatsapp: updated.whatsapp,
        faculty: updated.faculty,
      });

      await onSave?.(updated);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const delegasiText = [kelas ? `Kelas ${kelas}` : '', prodi, angkatan ? `Angkatan ${angkatan}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 min-w-0 overflow-y-auto bg-[#F8FAFB]"
      style={{
        backgroundImage: `url('/Batik.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto px-5 md:px-8 py-6 space-y-6">
        {/* HEADER */}
        <div className="space-y-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#588CBC] hover:text-[#183449] transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              Kembali ke Dashboard
            </button>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Setting Profil PJ Kelas</h1>
              <p className="text-sm text-slate-500 mt-1">
                Kelola email kontak aktif, nomor WhatsApp, dan identitas Penanggung Jawab Kelas Anda.
              </p>
            </div>
            {loadingProfile && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/70 px-3 py-1.5 rounded-full border border-slate-200">
                <Loader2 size={13} className="animate-spin text-[#588CBC]" />
                Sinkronisasi profil...
              </div>
            )}
          </div>
        </div>

        {/* 2 KOLOM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_1fr] gap-6 items-start">
          {/* KOLOM KIRI: FORM EDIT PROFIL */}
          <div className="space-y-6">
            <form
              onSubmit={handleSave}
              className="bg-white/95 backdrop-blur rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black text-slate-800">Informasi Kontak & Delegasi</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Email &amp; nomor telepon ini digunakan sistem untuk mengirimkan notifikasi booking &amp; check-in.
                </p>
              </div>

              {/* Avatar Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-[#588CBC]/15 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                      {avatarReady ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getAvatarSrc(avatarUrl)}
                          alt="Foto profil"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/LogoSiRuangPolos.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 animate-pulse" aria-label="Memuat foto profil" />
                      )}
                    </div>
                    {uploadingAvatar ? (
                      <span className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-[#588CBC] text-white">
                        <Loader2 size={10} className="animate-spin" />
                      </span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 p-1 rounded-full bg-[#183449] text-white">
                        <Camera size={10} />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
                      {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                      <span>{uploadingAvatar ? 'Mengunggah...' : 'Ubah Foto'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handlePhoto}
                        disabled={uploadingAvatar || deletingAvatar}
                        className="sr-only"
                      />
                    </label>

                    {!isDefaultAvatar && avatarUrl && avatarUrl !== '/LogoSiRuangPolos.png' && (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        disabled={deletingAvatar || uploadingAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        title="Reset ke avatar default"
                      >
                        {deletingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Format: PNG, JPG, JPEG (Maksimal 1 MB).
                </p>
              </div>

              {/* INPUT FIELDS */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="pj-name" className="text-xs font-bold text-slate-700">
                    Nama Lengkap PJ Kelas
                  </label>
                  <input
                    id="pj-name"
                    type="text"
                    required
                    maxLength={150}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="Nama Lengkap PJ"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pj-email" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Email Aktif (Google / Gmail)</span>
                    <span className="text-[10px] font-normal text-emerald-600">Menerima Notifikasi</span>
                  </label>
                  <input
                    id="pj-email"
                    type="email"
                    maxLength={150}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="contoh: pj.kelas@gmail.com"
                  />
                  <p className="text-[11px] text-slate-400">
                    Pastikan email aktif untuk menerima konfirmasi ACC/Tolak dari Dosen &amp; pengingat Check-in.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pj-nim" className="text-xs font-bold text-slate-700">
                    Nomor Induk Mahasiswa (NIM)
                  </label>
                  <div className="relative">
                    <input
                      id="pj-nim"
                      type="text"
                      value={effectiveIdentifier}
                      readOnly
                      className={`${inputClass} pr-10 bg-slate-50 text-slate-500 cursor-not-allowed`}
                    />
                    <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Identitas login resmi Anda dan tidak dapat diubah di sini.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pj-faculty" className="text-xs font-bold text-slate-700">
                    Fakultas / Jurusan
                  </label>
                  <input
                    id="pj-faculty"
                    type="text"
                    maxLength={150}
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className={inputClass}
                    placeholder="Fakultas Teknik"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pj-phone" className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Nomor WhatsApp / HP</span>
                    <span className="text-[10px] font-normal text-slate-400">Terhubung ke WhatsApp</span>
                  </label>
                  <input
                    id="pj-phone"
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      setWhatsapp(val);
                    }}
                    className={inputClass}
                    placeholder="0812 3456 7890"
                  />
                  <p className="text-[11px] text-slate-400">
                    Dapat diawali 08, +62, atau 62.
                  </p>

                  {/* Auto-generated Link WhatsApp */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 mt-2 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageCircle size={12} className="text-emerald-500" />
                        Link WhatsApp Aktif
                      </span>
                      {waNumber && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Aktif
                        </span>
                      )}
                    </div>
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 text-xs font-semibold text-[#588CBC] hover:text-[#183449] hover:underline transition-colors break-all mt-0.5"
                      >
                        <span>{waLink}</span>
                        <ExternalLink size={13} className="shrink-0 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Ketik nomor HP untuk membuat link WhatsApp otomatis (https://wa.me/...)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#183449] hover:bg-[#204561] disabled:opacity-60 text-white text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <Save size={15} />
                )}
                <span>{saving ? 'Menyimpan...' : saved ? 'Profil Berhasil Disimpan!' : 'Simpan Perubahan'}</span>
              </button>
            </form>
          </div>

          {/* KOLOM KANAN: PERAN & AKSES PJ KELAS */}
          <div className="space-y-6">
            {/* PERAN PJ KELAS */}
            <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-100 p-6 shadow-sm flex gap-4">
              <div className="w-12 h-12 rounded-full bg-[#183449] text-white flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-800">Peran Anda</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                    PJ Kelas
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sebagai Penanggung Jawab (PJ) Kelas, Anda memiliki wewenang untuk memesan ruangan perkuliahan,
                  meminta persetujuan Dosen Pengampu, dan melakukan check-in kehadiran di Gedung SFD.
                </p>
                {delegasiText && (
                  <p className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">
                    {delegasiText}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Login dengan NIM <span className="font-bold text-slate-600">{effectiveIdentifier}</span>
                </p>
              </div>
            </div>

            {/* AKSES & FITUR PJ KELAS */}
            <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-black text-slate-800">Wewenang &amp; Fitur PJ Kelas</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Layanan utama yang dikhususkan untuk PJ Kelas.</p>
              </div>

              <ul className="divide-y divide-slate-100">
                {pjAccessItems.map(({ icon: Icon, title, desc }) => (
                  <li key={title}>
                    <div className="w-full flex items-center gap-3.5 py-3.5 text-left rounded-xl px-2 -mx-2 transition-colors">
                      <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold text-slate-800">{title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{desc}</span>
                      </span>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PjProfile;
