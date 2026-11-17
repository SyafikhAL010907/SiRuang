-- ========================================================
-- UPDATE AKUN ADMIN & USER (NIM: 1512625004)
-- ========================================================

-- 1. Reset Admin: NIP 198501012010121001, Password: AdminDev1
UPDATE authentication 
SET password = '$2b$10$HndUXj.XT5QVZX6TlXPHCOGMywskxp/xmst30Lg6vN4AiXygI46JS'
WHERE role = 'admin';

-- 2. Pastikan Akun User NIM 1512625004 ada dengan Password: 123
DELETE FROM authentication WHERE identifier = '1512625004';

INSERT INTO authentication (username, identifier, identifier_type, password, role)
VALUES (
    'Syafikh (Mahasiswa)',
    '1512625004',
    'nim',
    '$2b$10$yRdS.Khgp3HHtXcV9zUXjue9mMTVFlLQzgszEOcFczDsLgFMW2vP2',
    'user'
);

-- 3. Bersihkan sesi aktif lama
DELETE FROM active_sessions;

