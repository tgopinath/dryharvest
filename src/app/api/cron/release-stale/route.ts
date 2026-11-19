import { NextResponse } from 'next/server';
import { releaseStaleOrders } from '@/server/orders';

/** Call every 10–15 min from a scheduler (Vercel Cron, GitHub Actions, cron + curl) with header  Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const released = await releaseStaleOrders();
  return NextResponse.json({ ok: true, released });
}
