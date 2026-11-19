import { NextResponse } from 'next/server';
import { suggest } from '@/server/catalog';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.slice(0, 60) ?? '';
  const items = await suggest(q);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}
