const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  console.log('Seeding dummy schedules for Gedung SFD...');
  const { data: rooms, error: rErr } = await supabase
    .from('rooms')
    .select('id, kode, nama, lantai, bookable')
    .eq('gedung', 'SFD');

  if (rErr) {
    console.error('Error fetching rooms:', rErr);
    return;
  }

  const roomMap = Object.fromEntries(rooms.map(r => [r.kode, r]));

  // Hapus dummy schedules lama agar tidak terjadi duplikasi
  const { error: delErr } = await supabase
    .from('official_schedules')
    .delete()
    .eq('is_dummy', true);

  if (delErr) {
    console.warn('Warning deleting old dummy schedules:', delErr);
  } else {
    console.log('Cleared previous dummy schedules.');
  }

  // Dosen id 3, PJ id 19 (Revani Khoirunnisa Azzahra)
  const dosenId = 3;
  const pjId = 19;

  const schedulesToInsert = [
    // --- HARI INI: MINGGU (agar user buka hari ini langsung kelihatan BIRU!) ---
    {
      room_kode: 'R.802',
      mata_kuliah: 'Pemrograman Web (Kelas Tambahan)',
      hari: 'minggu',
      jam_mulai: '08:00:00',
      jam_selesai: '10:00:00',
    },
    {
      room_kode: 'R.805',
      mata_kuliah: 'Jaringan Komputer & Cyber Security',
      hari: 'minggu',
      jam_mulai: '10:00:00',
      jam_selesai: '12:30:00',
    },
    {
      room_kode: 'R.302',
      mata_kuliah: 'Algoritma & Struktur Data',
      hari: 'minggu',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },
    {
      room_kode: 'R.303',
      mata_kuliah: 'Sistem Operasi Teori',
      hari: 'minggu',
      jam_mulai: '13:00:00',
      jam_selesai: '15:30:00',
    },

    // --- SENIN ---
    {
      room_kode: 'R.802',
      mata_kuliah: 'Pemrograman Web',
      hari: 'senin',
      jam_mulai: '08:00:00',
      jam_selesai: '09:40:00',
    },
    {
      room_kode: 'R.805',
      mata_kuliah: 'Kecerdasan Buatan & Data Science',
      hari: 'senin',
      jam_mulai: '10:00:00',
      jam_selesai: '12:30:00',
    },
    {
      room_kode: 'R.302',
      mata_kuliah: 'Matematika Diskrit',
      hari: 'senin',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },
    {
      room_kode: 'R.304',
      mata_kuliah: 'Basis Data Terdistribusi',
      hari: 'senin',
      jam_mulai: '13:00:00',
      jam_selesai: '15:30:00',
    },

    // --- SELASA ---
    {
      room_kode: 'R.805',
      mata_kuliah: 'Jaringan Komputer & Keamanan',
      hari: 'selasa',
      jam_mulai: '10:00:00',
      jam_selesai: '12:30:00',
    },
    {
      room_kode: 'R.802',
      mata_kuliah: 'Grafika Komputer & Animasi',
      hari: 'selasa',
      jam_mulai: '13:00:00',
      jam_selesai: '15:30:00',
    },
    {
      room_kode: 'R.303',
      mata_kuliah: 'Arsitektur Komputer',
      hari: 'selasa',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },

    // --- RABU ---
    {
      room_kode: 'R.303',
      mata_kuliah: 'Rapat Koordinasi Jurusan & Kurikulum',
      hari: 'rabu',
      jam_mulai: '13:00:00',
      jam_selesai: '14:40:00',
    },
    {
      room_kode: 'R.802',
      mata_kuliah: 'Interaksi Manusia dan Komputer',
      hari: 'rabu',
      jam_mulai: '10:00:00',
      jam_selesai: '12:00:00',
    },
    {
      room_kode: 'R.805',
      mata_kuliah: 'Sistem Informasi Manajemen',
      hari: 'rabu',
      jam_mulai: '08:00:00',
      jam_selesai: '10:00:00',
    },
    {
      room_kode: 'R.305',
      mata_kuliah: 'Pengantar Rekayasa Perangkat Lunak',
      hari: 'rabu',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },

    // --- KAMIS ---
    {
      room_kode: 'R.802',
      mata_kuliah: 'Desain Antarmuka Pengguna',
      hari: 'kamis',
      jam_mulai: '13:00:00',
      jam_selesai: '15:30:00',
    },
    {
      room_kode: 'R.805',
      mata_kuliah: 'Pemrograman Berorientasi Objek',
      hari: 'kamis',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },
    {
      room_kode: 'R.302',
      mata_kuliah: 'Statistika & Probabilitas',
      hari: 'kamis',
      jam_mulai: '10:00:00',
      jam_selesai: '12:00:00',
    },

    // --- JUMAT ---
    {
      room_kode: 'R.805',
      mata_kuliah: 'Sistem Basis Data Lanjut',
      hari: 'jumat',
      jam_mulai: '08:00:00',
      jam_selesai: '10:30:00',
    },
    {
      room_kode: 'R.802',
      mata_kuliah: 'Etika Profesi & Hukum Siber',
      hari: 'jumat',
      jam_mulai: '08:00:00',
      jam_selesai: '09:40:00',
    },
    {
      room_kode: 'R.305',
      mata_kuliah: 'Pengantar Teknologi Informasi',
      hari: 'jumat',
      jam_mulai: '13:30:00',
      jam_selesai: '15:10:00',
    },
  ];

  const payload = [];
  for (const s of schedulesToInsert) {
    const room = roomMap[s.room_kode];
    if (!room) {
      console.warn(`Room ${s.room_kode} not found in DB!`);
      continue;
    }
    payload.push({
      room_id: room.id,
      dosen_id: dosenId,
      pj_id: pjId,
      mata_kuliah: s.mata_kuliah,
      hari: s.hari,
      jam_mulai: s.jam_mulai,
      jam_selesai: s.jam_selesai,
      semester: 'Ganjil 2026/2027',
      is_active: true,
      is_dummy: true,
    });
  }

  const { data: inserted, error: inErr } = await supabase
    .from('official_schedules')
    .insert(payload)
    .select();

  if (inErr) {
    console.error('Error inserting dummy schedules:', inErr);
  } else {
    console.log(`Successfully inserted ${inserted.length} dummy schedules!`);
  }
}

run();
