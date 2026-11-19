import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Razorpay is only "configured" when both server keys exist. Nothing is faked otherwise. */
export function razorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

async function rzp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, { ...init, headers: authHeader(), cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { description?: string } })?.error?.description ?? res.statusText;
    throw new Error(`Razorpay: ${msg}`);
  }
  return body as T;
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string; receipt: string };
export type RzpPayment = { id: string; order_id: string; amount: number; currency: string; status: string; method: string };
export type RzpRefund = { id: string; amount: number; status: string };

export const createRazorpayOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  rzp<RzpOrder>('/orders', { method: 'POST', body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }) });

export const fetchPayment = (paymentId: string) => rzp<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`);

export const capturePayment = (paymentId: string, amount: number) =>
  rzp<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: JSON.stringify({ amount, currency: 'INR' }) });

export const refundPayment = (paymentId: string, amount: number, notes: Record<string, string>) =>
  rzp<RzpRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: 'POST', body: JSON.stringify({ amount, notes }) });

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout signature: HMAC_SHA256(order_id|payment_id, key_secret) */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw_body, webhook_secret) */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
