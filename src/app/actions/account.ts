'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { getCurrentUser } from '@/server/auth';
import { cancelOrder } from '@/server/orders';
import { razorpayConfigured } from '@/server/razorpay';
import { addressSchema, phoneSchema, fieldErrors, formObject, type FormState } from '@/lib/validation';

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const parsed = z.object({ name: z.string().trim().min(2, 'Enter your name').max(100), phone: phoneSchema.or(z.literal('')) }).safeParse(formObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.update(schema.users).set({ name: parsed.data.name, phone: parsed.data.phone || null }).where(eq(schema.users.id, user.id));
  revalidatePath('/account');
  return { ok: true, message: 'Profile saved.' };
}

export async function saveAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const parsed = addressSchema.safeParse(formObject(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const id = fd.get('id') as string | null;
  const makeDefault = fd.get('isDefault') === 'on';
  await db.transaction(async (tx) => {
    const count = await tx.$count(schema.addresses, eq(schema.addresses.userId, user.id));
    const isDefault = makeDefault || count === 0;
    if (isDefault) await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
    if (id) await tx.update(schema.addresses).set({ ...parsed.data, ...(isDefault ? { isDefault: true } : {}) }).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
    else await tx.insert(schema.addresses).values({ ...parsed.data, userId: user.id, isDefault });
  });
  revalidatePath('/account/addresses');
  return { ok: true, message: 'Address saved.' };
}

export async function deleteAddress(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  revalidatePath('/account/addresses');
}

export async function setDefaultAddress(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, user.id));
    await tx.update(schema.addresses).set({ isDefault: true }).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  });
  revalidatePath('/account/addresses');
}

const RETURN_WINDOW_DAYS = 7;

/** Customers can cancel directly before packing; afterwards they raise a request for staff to review. */
export async function requestCancelOrReturn(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const number = String(fd.get('number') ?? '');
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 1000);
  if (reason.length < 5) return { fieldErrors: { reason: 'Tell us why (at least 5 characters).' } };
  const o = await db.query.orders.findFirst({ where: and(eq(schema.orders.number, number), eq(schema.orders.userId, user.id)), with: { requests: true, events: true } });
  if (!o) return { error: 'Order not found.' };
  if (o.requests.some((r) => r.status === 'OPEN')) return { error: 'You already have an open request for this order.' };

  if (['PENDING_PAYMENT', 'PLACED', 'CONFIRMED'].includes(o.status)) {
    try {
      await cancelOrder(o.id, user.id, `Customer: ${reason}`);
    } catch (e) {
      return { error: (e as Error).message };
    }
    await db.insert(schema.orderRequests).values({ orderId: o.id, userId: user.id, type: 'CANCEL', reason, status: 'COMPLETED' });
    revalidatePath(`/account/orders/${number}`);
    return { ok: true, message: o.paymentStatus === 'PAID' ? 'Order cancelled. Your refund has been initiated to the original payment method.' : 'Order cancelled.' };
  }
  if (o.status === 'PACKED') {
    await db.insert(schema.orderRequests).values({ orderId: o.id, userId: user.id, type: 'CANCEL', reason });
    await db.insert(schema.orderEvents).values({ orderId: o.id, message: 'Customer requested cancellation.', userId: user.id });
    revalidatePath(`/account/orders/${number}`);
    return { ok: true, message: 'Cancellation requested. Our team will confirm shortly.' };
  }
  if (o.status === 'DELIVERED') {
    const delivered = [...o.events].reverse().find((e) => e.status === 'DELIVERED')?.createdAt ?? o.updatedAt;
    if (Date.now() - delivered.getTime() > RETURN_WINDOW_DAYS * 864e5) return { error: `Returns can be requested within ${RETURN_WINDOW_DAYS} days of delivery.` };
    await db.transaction(async (tx) => {
      await tx.insert(schema.orderRequests).values({ orderId: o.id, userId: user.id, type: 'RETURN', reason });
      await tx.update(schema.orders).set({ status: 'RETURN_REQUESTED' }).where(eq(schema.orders.id, o.id));
      await tx.insert(schema.orderEvents).values({ orderId: o.id, status: 'RETURN_REQUESTED', message: 'Customer requested a return / replacement.', userId: user.id });
    });
    revalidatePath(`/account/orders/${number}`);
    return { ok: true, message: 'Return request received. We will contact you within 1–2 business days.' };
  }
  return { error: 'This order can no longer be cancelled or returned online. Please contact support.' };
}

/** Re-open Razorpay for an order still awaiting payment. */
export async function getRetryPayment(number: string) {
  const user = await getCurrentUser();
  if (!user || !razorpayConfigured()) return null;
  const o = await db.query.orders.findFirst({
    where: and(eq(schema.orders.number, number), eq(schema.orders.userId, user.id), eq(schema.orders.status, 'PENDING_PAYMENT'), inArray(schema.orders.paymentStatus, ['PENDING'])),
  });
  if (!o?.razorpayOrderId) return null;
  const a = o.shippingAddress;
  return { keyId: process.env.RAZORPAY_KEY_ID!, orderId: o.razorpayOrderId, amount: o.total, name: a.fullName, email: o.email, phone: o.phone, number: o.number };
}
