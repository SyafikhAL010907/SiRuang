import jwt from 'jsonwebtoken';
import { supabaseServer } from './supabaseServer';

const JWT_SECRET = process.env.JWT_SECRET || 'siruang_super_secret_jwt_key_unj_2026';

export interface TokenPayload {
  identifier: string;
  identifier_type: string;
  role: string;
  username: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Cache in-memory ber-TTL pendek (15 detik) untuk meredam frekuensi query ke active_sessions saat polling
const sessionCache = new Map<string, number>();
const SESSION_CACHE_TTL_MS = 15_000;

export function invalidateSessionCache(identifier: string, token?: string) {
  if (token) {
    sessionCache.delete(`${identifier}:${token}`);
  } else {
    for (const key of sessionCache.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        sessionCache.delete(key);
      }
    }
  }
}

export async function getUserFromRequest(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) {
    console.warn('[authHelper] Header Authorization tidak disertakan');
    return null;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : authHeader.trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    console.warn('[authHelper] Verifikasi token JWT gagal (token expired atau signature tidak cocok)');
    return null;
  }

  // Cek cache in-memory terlebih dahulu untuk menghemat DB egress selama polling
  const cacheKey = `${decoded.identifier}:${token}`;
  const cachedExpiry = sessionCache.get(cacheKey);
  if (cachedExpiry && cachedExpiry > Date.now()) {
    return decoded;
  }

  // Cek apakah session aktif masih ada di Supabase (kolom minimal: id)
  const { data: session, error: sessErr } = await supabaseServer
    .from('active_sessions')
    .select('id')
    .eq('identifier', decoded.identifier)
    .eq('session_id', token)
    .maybeSingle();

  if (sessErr) {
    console.error('[authHelper] Error query active_sessions:', sessErr.message);
  }

  if (!session) {
    console.warn(`[authHelper] Sesi tidak ditemukan di tabel active_sessions untuk user '${decoded.identifier}' (kemungkinan sesi lama terhapus/login di perangkat lain).`);
    sessionCache.delete(cacheKey);
    return null;
  }

  // Simpan ke cache 15 detik
  sessionCache.set(cacheKey, Date.now() + SESSION_CACHE_TTL_MS);

  return decoded;
}

