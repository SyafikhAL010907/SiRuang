-- push_subscriptions.sql
-- Jalankan di Supabase SQL Editor setelah schema utama sudah ada.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id            SERIAL PRIMARY KEY,
    user_identifier VARCHAR(50) NOT NULL,     -- NIM/NIP pemilik subscription
    endpoint      TEXT NOT NULL UNIQUE,       -- URL endpoint browser
    p256dh        TEXT NOT NULL,              -- public key DH
    auth          TEXT NOT NULL,              -- auth secret
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_identifier)
        REFERENCES authentication(identifier) ON DELETE CASCADE
        -- Aman: authentication.identifier adalah UNIQUE (baris 26 schema)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_identifier);

-- RLS: AKTIFKAN tanpa policy (tidak ada akses anon/authenticated langsung).
-- Next.js API Route menggunakan supabaseServer dengan service_role key
-- yang bypass RLS, jadi table tetap terlindungi dari akses publik.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cabut akses anon dan authenticated langsung ke tabel ini:
REVOKE ALL ON push_subscriptions FROM anon;
REVOKE ALL ON push_subscriptions FROM authenticated;
GRANT ALL ON push_subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE push_subscriptions_id_seq TO service_role;

