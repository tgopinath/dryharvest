import { NextResponse, type NextRequest } from 'next/server';

// Static demo: everything that buys, signs in, pays or changes data is switched off.
const BLOCKED = ['/admin', '/login', '/register', '/account', '/cart', '/checkout', '/order', '/invoice', '/api/auth', '/api/payments', '/api/cron'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new NextResponse('This is a demo store. Nothing can be submitted.', { status: 403 });
  }
  if (BLOCKED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (pathname.startsWith('/api/')) return new NextResponse('Not available in the demo store.', { status: 404 });
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon|icon).*)'] };
