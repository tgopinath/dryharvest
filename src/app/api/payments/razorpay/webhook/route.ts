import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/server/razorpay';
import { markOrderPaid, markPaymentFailed } from '@/server/orders';

type Evt = { event: string; payload: { payment?: { entity: { id: string; order_id: string; amount: number; status: string; error_description?: string } } } };

/** Razorpay webhook (payment.captured / order.paid / payment.failed). Configure the secret in RAZORPAY_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ ok: false }, { status: 400 });
  const evt = JSON.parse(raw) as Evt;
  const p = evt.payload.payment?.entity;
  try {
    if (p && (evt.event === 'payment.captured' || evt.event === 'order.paid') && p.order_id) await markOrderPaid(p.order_id, p.id, p.amount);
    else if (p && evt.event === 'payment.failed' && p.order_id) await markPaymentFailed(p.order_id, p.error_description ?? 'failed');
  } catch (e) {
    console.error('[razorpay webhook]', evt.event, e);
    // 200 for unknown orders so Razorpay doesn't retry forever; 500 otherwise to trigger a retry.
    if ((e as Error).message === 'Order not found') return NextResponse.json({ ok: true });
    if ((e as Error).message.includes('does not match')) return NextResponse.json({ ok: true, flagged: true }); // logged; needs manual review
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
