import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { createSession } from '@/server/auth';
import { mergeGuestCart } from '@/server/cart';

const fail = (req: Request, code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, process.env.APP_URL || req.url));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const state = jar.get('dh_oauth_state')?.value;
  const next = jar.get('dh_oauth_next')?.value || '/account';
  jar.delete('dh_oauth_state');
  jar.delete('dh_oauth_next');
  if (!state || state !== url.searchParams.get('state')) return fail(req, 'google_state');
  const code = url.searchParams.get('code');
  if (!code) return fail(req, 'google');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`, grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return fail(req, 'google');
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  // Fetch identity from Google directly over TLS (no need to verify the id_token signature ourselves).
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return fail(req, 'google');
  const info = (await infoRes.json()) as { sub: string; email: string; email_verified: boolean; name?: string };
  if (!info.email_verified) return fail(req, 'google_unverified');

  const email = info.email.toLowerCase();
  let user = await db.query.users.findFirst({ where: eq(schema.users.googleId, info.sub) })
    ?? await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (user && !user.isActive) return fail(req, 'disabled');
  if (user && !user.googleId) await db.update(schema.users).set({ googleId: info.sub }).where(eq(schema.users.id, user.id));
  if (!user) [user] = await db.insert(schema.users).values({ email, name: info.name || email.split('@')[0], googleId: info.sub }).returning();

  await createSession(user.id);
  await mergeGuestCart(user.id);
  return NextResponse.redirect(new URL(next, process.env.APP_URL || req.url));
}
