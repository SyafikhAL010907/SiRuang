export type GedungCode = 'SFD' | 'LE' | 'LS';

export interface AdminGedungConfig {
  gedung: GedungCode;
  role: 'admin_sfd' | 'admin_le' | 'admin_ls';
  label: string;
  buildingName: string;
  denahHref: string;
  denahImage: string;
  glowColor: string;
  borderColor: string;
  tileColor: string;
}

export const GEDUNG_CONFIGS: Record<GedungCode, AdminGedungConfig> = {
  SFD: {
    gedung: 'SFD',
    role: 'admin_sfd',
    label: 'Gedung SFD Tower A',
    buildingName: 'Gedung SFD Tower A',
    denahHref: '/denah-sfd',
    denahImage: '/PilihGedung/GedungSFD.png',
    glowColor: 'bg-[#588CBC]',
    borderColor: 'border-[#588CBC]/30 hover:border-[#588CBC]',
    tileColor: 'bg-[#588CBC]/10 text-[#183449]',
  },
  LE: {
    gedung: 'LE',
    role: 'admin_le',
    label: 'Gedung L Rumpun Elektro',
    buildingName: 'Gedung L Rumpun Elektro',
    denahHref: '/denah-le',
    denahImage: '/PilihGedung/GedungLElektro.png',
    glowColor: 'bg-blue-400',
    borderColor: 'border-blue-100 hover:border-blue-400',
    tileColor: 'bg-blue-50 text-blue-600',
  },
  LS: {
    gedung: 'LS',
    role: 'admin_ls',
    label: 'Gedung L Rumpun Sipil',
    buildingName: 'Gedung L Rumpun Sipil',
    denahHref: '/denah-ls',
    denahImage: '/PilihGedung/GedungLSipil.png',
    glowColor: 'bg-orange-400',
    borderColor: 'border-orange-100 hover:border-orange-400',
    tileColor: 'bg-orange-50 text-orange-600',
  },
};

