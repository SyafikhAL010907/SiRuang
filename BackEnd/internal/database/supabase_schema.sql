-- ========================================================
-- SIRUANG SUPABASE (POSTGRESQL) SCHEMA MIGRATION
-- Project: SiRuang (UNJ)
-- Region: Asia Pacific (Singapore)
-- ========================================================

-- 1. Bersihkan tabel lama jika ada
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS active_sessions CASCADE;
DROP TABLE IF EXISTS authentication CASCADE;
DROP TABLE IF EXISTS captcha CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;

-- 2. ENUM Types
-- Role mencakup: admin, user (mahasiswa), dosen, pj_kelas
CREATE TYPE user_role AS ENUM ('admin', 'user', 'dosen', 'pj_kelas');
CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'multi_file');

-- 3. Tabel: authentication (NIM / NIP based)
CREATE TABLE authentication (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    identifier VARCHAR(50) NOT NULL UNIQUE,          -- NIM atau NIP
    identifier_type VARCHAR(10) NOT NULL DEFAULT 'nim'
        CHECK (identifier_type IN ('nim', 'nip')),
    password VARCHAR(255) NOT NULL,                  -- Bcrypt hash
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_identifier ON authentication(identifier);
CREATE INDEX idx_auth_role ON authentication(role);

-- 4. Tabel: active_sessions (Device Tracking)
CREATE TABLE active_sessions (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(50) NOT NULL,
    session_id TEXT NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_identifier ON active_sessions(identifier);

-- 5. Tabel: captcha (Verifikasi Matematika)
CREATE TABLE captcha (
    kode VARCHAR(10) PRIMARY KEY,
    pertanyaan VARCHAR(50) NOT NULL,
    jawaban VARCHAR(10) NOT NULL
);

-- 6. Tabel: chat_rooms
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    user_identifier VARCHAR(50) NOT NULL,           -- NIM / NIP pemilik room
    last_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_marked_unread BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_rooms_user_identifier ON chat_rooms(user_identifier);

-- 7. Tabel: chat_messages
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_identifier VARCHAR(50) NOT NULL,          -- NIM / NIP pengirim
    message TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_messages_sender_identifier ON chat_messages(sender_identifier);

-- ========================================================
-- DATA AWAL (SEED DATA)
-- ========================================================

-- Soal Matematika Captcha
INSERT INTO captcha (kode, pertanyaan, jawaban) VALUES
('C001', '2 + 3 = ?', '5'),
('C002', '7 - 4 = ?', '3'),
('C003', '3 x 2 = ?', '6'),
('C004', '8 / 2 = ?', '4'),
('C005', '5 + 1 = ?', '6'),
('C006', '9 - 5 = ?', '4'),
('C007', '4 x 3 = ?', '12'),
('C008', '6 / 3 = ?', '2'),
('C009', '1 + 7 = ?', '8'),
('C010', '10 - 6 = ?', '4');

-- Akun Administrator Default
-- NIP: 198501012010121001
-- Password: AdminDev1
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
    'Admin UNJ',
    '198501012010121001',
    'nip',
    '$2a$10$XLxJ1t0Hoh3gk.wjM2bOzu4hVS.GqkJk0bYcJTz6bSOsPmhSxJGRK',
    'admin'
);

-- Akun Sampel Mahasiswa (User)
-- NIM: 1313620001
-- Password: User1234
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
    'Mahasiswa Demo',
    '1313620001',
    'nim',
    '$2a$10$0zT5zR.qfO6lEceWqZlUreF/rA781Hj6Vb44Qp51kX5JcTjV0/lWC',
    'user'
);

-- Akun Sampel Dosen (Role Persiapan)
-- NIP: 197805152005011002
-- Password: User1234
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
    'Dosen Demo',
    '197805152005011002',
    'nip',
    '$2a$10$0zT5zR.qfO6lEceWqZlUreF/rA781Hj6Vb44Qp51kX5JcTjV0/lWC',
    'dosen'
);

-- Akun Sampel PJ Kelas (Role Persiapan)
-- NIM: 1313620099
-- Password: User1234
INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
    'PJ Kelas Demo',
    '1313620099',
    'nim',
    '$2a$10$0zT5zR.qfO6lEceWqZlUreF/rA781Hj6Vb44Qp51kX5JcTjV0/lWC',
    'pj_kelas'
);

-- ========================================================
-- PERMISSIONS & HAK AKSES UNTUK SUPABASE API
-- ========================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Disable RLS agar seluruh API Route Next.js leluasa membaca dan menulis data
ALTER TABLE authentication DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE captcha DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
