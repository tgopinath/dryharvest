'use server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { createSession, destroySession, hashPassword, verifyPassword, getCurrentUser } from '@/server/auth';
import { mergeGuestCart } from '@/server/cart';
import { rateLimit } from '@/server/ratelimit';
import { emailSchema, passwordSchema, phoneSchema, fieldErrors, formObject, type FormState } from '@/lib/validation';

function safeNext(n: string | null | undefined) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/account';
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  password: passwordSchema,
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit('register', 10, 60 * 60_000))) return { error: 'Too many attempts. Try again later.' };
  const parsed = registerSchema.safeParse(formObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, phone, password } = parsed.data;
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (exists) return { fieldErrors: { email: 'An account with this email already exists. Log in instead.' } };
  const [u] = await db.insert(schema.users).values({ name, email, phone: phone || null, passwordHash: await hashPassword(password) }).returning();
  await createSession(u.id);
  await mergeGuestCart(u.id);
  redirect(safeNext(fd.get('next') as string));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!(await rateLimit(`login:${email}`, 8, 15 * 60_000))) return { error: 'Too many login attempts. Wait 15 minutes and try again.' };
  const u = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  const ok = u?.passwordHash ? await verifyPassword(password, u.passwordHash) : false;
  if (!u || !ok) return { error: u && !u.passwordHash ? 'This account uses Google sign-in. Continue with Google.' : 'Email or password is incorrect.' };
  if (!u.isActive) return { error: 'This account has been disabled. Contact support.' };
  await createSession(u.id);
  await mergeGuestCart(u.id);
  const next = fd.get('next') as string;
  redirect(next ? safeNext(next) : u.role === 'CUSTOMER' ? '/account' : '/admin');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const current = String(fd.get('current') ?? '');
  const parsed = passwordSchema.safeParse(fd.get('password'));
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (fd.get('password') !== fd.get('confirm')) return { fieldErrors: { confirm: 'Passwords do not match' } };
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (u?.passwordHash && !(await verifyPassword(current, u.passwordHash))) return { fieldErrors: { current: 'Current password is incorrect' } };
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(schema.users.id, user.id));
  // sign out other sessions
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  await createSession(user.id);
  return { ok: true, message: 'Password updated. Other devices have been signed out.' };
}
