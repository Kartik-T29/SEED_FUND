import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

let cachedJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;
  const rawJwtSecret = process.env.JWT_SECRET;
  if (!rawJwtSecret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
  }
  cachedJwtSecret = new TextEncoder().encode(rawJwtSecret);
  return cachedJwtSecret;
}

function getCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'ideapad_session';
}

export interface SessionPayload {
  userId: string;
  role: Role;
  mustChangePassword: boolean;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(getCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
}

export function requireRole(session: SessionPayload | null, ...roles: Role[]): SessionPayload {
  if (!session) throw new Error('Unauthorized');
  if (!roles.includes(session.role)) throw new Error('Forbidden');
  return session;
}
