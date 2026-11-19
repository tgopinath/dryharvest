import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL('/login', req.url));
  const next = new URL(req.url).searchParams.get('next') ?? '';
  const state = randomBytes(24).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${process.env.APP_URL}/api/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 };
  res.cookies.set('dh_oauth_state', state, opts);
  res.cookies.set('dh_oauth_next', next.startsWith('/') && !next.startsWith('//') ? next : '', opts);
  return res;
}
