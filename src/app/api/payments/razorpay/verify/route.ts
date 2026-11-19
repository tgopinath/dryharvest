import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { getCurrentUser } from '@/server/auth';
import { verifyCheckoutSignature, fetchPayment, capturePayment, razorpayConfigured } from '@/server/razorpay';
import { markOrderPaid } from '@/server/orders';

const body = z.object({ razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().min(1) });

/**
 * Called by the browser after Razorpay checkout. We never trust the client:
 * 1) verify the HMAC signature, 2) fetch the payment from Razorpay and check status/amount/order,
 * 3) only then mark the order paid. The webhook does the same independently.
 */
export async function POST(req: Request) {
  if (!razorpayConfigured()) return NextResponse.json({ ok: false, error: 'Payments not configured' }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorised' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  const { razorpay_order_id: rzOrder, razorpay_payment_id: payId, razorpay_signature: sig } = parsed.data;

  const order = await db.query.orders.findFirst({ where: eq(schema.orders.razorpayOrderId, rzOrder) });
  if (!order || order.userId !== user.id) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (!verifyCheckoutSignature(rzOrder, payId, sig)) return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });

  try {
    let payment = await fetchPayment(payId);
    if (payment.order_id !== rzOrder || payment.currency !== 'INR' || payment.amount !== order.total) {
      return NextResponse.json({ ok: false, error: 'Payment does not match order' }, { status: 400 });
    }
    if (payment.status === 'authorized') payment = await capturePayment(payId, order.total);
    if (payment.status !== 'captured') return NextResponse.json({ ok: false, pending: true, status: payment.status }, { status: 202 });
    await markOrderPaid(rzOrder, payId, payment.amount);
    return NextResponse.json({ ok: true, orderNumber: order.number });
  } catch (e) {
    console.error('[razorpay verify]', e);
    return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 502 });
  }
}
