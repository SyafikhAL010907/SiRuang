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

export async function getUserFromRequest(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : authHeader.trim();
  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Cek apakah session aktif masih ada di Supabase
  const { data: session } = await supabaseServer
    .from('active_sessions')
    .select('id')
    .eq('identifier', decoded.identifier)
    .eq('session_id', token)
    .maybeSingle();

  if (!session) return null;

  return decoded;
}

