import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import { cache } from 'react';
import { db, schema } from '@/db';
import type { Role } from '@/db/schema';

export const SESSION_COOKIE = 'dh_session';
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string; email: string; name: string; phone: string | null; role: Role; hasPassword: boolean;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id, email: schema.users.email, name: schema.users.name, phone: schema.users.phone,
      role: schema.users.role, isActive: schema.users.isActive, passwordHash: schema.users.passwordHash,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  if (!u || !u.isActive) return null;
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, hasPassword: !!u.passwordHash };
});

export async function requireUser(next = '/account') {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

// ---------------- Role-based access control ----------------
export const PERMISSIONS = {
  'dashboard:view': ['STAFF', 'MANAGER', 'ADMIN'],
  'products:view': ['STAFF', 'MANAGER', 'ADMIN'],
  'products:edit': ['MANAGER', 'ADMIN'],
  'categories:edit': ['MANAGER', 'ADMIN'],
  'orders:view': ['STAFF', 'MANAGER', 'ADMIN'],
  'orders:edit': ['STAFF', 'MANAGER', 'ADMIN'],
  'orders:refund': ['MANAGER', 'ADMIN'],
  'inventory:view': ['STAFF', 'MANAGER', 'ADMIN'],
  'inventory:edit': ['STAFF', 'MANAGER', 'ADMIN'],
  'customers:view': ['MANAGER', 'ADMIN'],
  'suppliers:edit': ['MANAGER', 'ADMIN'],
  'coupons:edit': ['MANAGER', 'ADMIN'],
  'cms:edit': ['MANAGER', 'ADMIN'],
  'reviews:moderate': ['STAFF', 'MANAGER', 'ADMIN'],
  'reports:view': ['MANAGER', 'ADMIN'],
  'users:manage': ['ADMIN'],
  'settings:edit': ['ADMIN'],
  'audit:view': ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, perm: Permission) {
  return !!role && (PERMISSIONS[perm] as readonly Role[]).includes(role);
}

export async function requirePermission(perm: Permission) {
  const u = await getCurrentUser();
  if (!u) redirect('/login?next=/admin');
  if (!can(u.role, perm)) {
    if (u.role === 'CUSTOMER') redirect('/');
    throw new Error('FORBIDDEN: you do not have permission for this action.');
  }
  return u;
}

export async function requireStaff() {
  const u = await getCurrentUser();
  if (!u) redirect('/login?next=/admin');
  if (u.role === 'CUSTOMER') redirect('/');
  return u;
}
