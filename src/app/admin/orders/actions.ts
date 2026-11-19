'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { audit } from '@/server/audit';
import { updateOrderStatus, issueRefund, cancelOrder } from '@/server/orders';
import { rupeesToPaise } from '@/lib/utils';
import type { OrderStatus } from '@/db/schema';

type R = { ok: boolean; error?: string; message?: string };
const wrap = async (fn: () => Promise<unknown>, msg: string, id: string): Promise<R> => {
  try { await fn(); revalidatePath(`/admin/orders/${id}`); revalidatePath('/admin/orders'); return { ok: true, message: msg }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
};

export async function changeStatus(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('orders:edit');
  const id = String(fd.get('id'));
  const next = String(fd.get('status')) as OrderStatus;
  const note = String(fd.get('note') ?? '').trim() || null;
  if (next === 'CANCELLED') {
    await requirePermission('orders:refund');
    return wrap(() => cancelOrder(id, user.id, note || 'Cancelled by store'), 'Order cancelled. Stock returned; paid orders were refunded.', id);
  }
  return wrap(() => updateOrderStatus(id, next, user.id, note), 'Status updated.', id);
}

export async function saveTracking(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('orders:edit');
  const parsed = z.object({ id: z.string(), courier: z.string().trim().max(60), trackingNumber: z.string().trim().max(80), trackingUrl: z.string().trim().url().or(z.literal('')) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: 'Check the tracking URL (must start with https://).' };
  const { id, ...t } = parsed.data;
  const cur = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (cur && (cur.courier ?? '') === t.courier && (cur.trackingNumber ?? '') === t.trackingNumber && (cur.trackingUrl ?? '') === t.trackingUrl) return { ok: true, message: 'No changes.' };
  return wrap(async () => {
    await db.update(schema.orders).set({ courier: t.courier || null, trackingNumber: t.trackingNumber || null, trackingUrl: t.trackingUrl || null }).where(eq(schema.orders.id, id));
    await db.insert(schema.orderEvents).values({ orderId: id, message: `Tracking updated: ${t.courier} ${t.trackingNumber}`.trim(), userId: user.id });
    await audit(user.id, 'order.tracking', 'order', id, t);
  }, 'Tracking saved.', id);
}

export async function addNote(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('orders:edit');
  const id = String(fd.get('id'));
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000);
  if (!note) return { ok: false, error: 'Write a note first.' };
  return wrap(() => db.insert(schema.orderEvents).values({ orderId: id, message: `Note: ${note}`, userId: user.id }), 'Note added.', id);
}

export async function refund(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('orders:refund');
  const id = String(fd.get('id'));
  const amount = rupeesToPaise(String(fd.get('amount') ?? ''));
  const reason = String(fd.get('reason') ?? '').trim();
  if (!amount || amount <= 0) return { ok: false, error: 'Enter a refund amount.' };
  if (reason.length < 3) return { ok: false, error: 'Enter a reason.' };
  return wrap(() => issueRefund(id, amount, reason, user.id), 'Refund issued.', id);
}

export async function resolveRequest(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('orders:edit');
  const reqId = String(fd.get('requestId'));
  const decision = String(fd.get('decision')) as 'APPROVED' | 'REJECTED';
  const note = String(fd.get('adminNote') ?? '').trim() || null;
  const r = await db.query.orderRequests.findFirst({ where: eq(schema.orderRequests.id, reqId), with: { order: true } });
  if (!r || r.status !== 'OPEN') return { ok: false, error: 'Request not found or already handled.' };
  try {
    if (decision === 'APPROVED' && r.type === 'CANCEL') {
      await requirePermission('orders:refund');
      await cancelOrder(r.orderId, user.id, `Customer request approved${note ? `: ${note}` : ''}`);
    }
    if (decision === 'REJECTED' && r.type === 'RETURN' && r.order.status === 'RETURN_REQUESTED') {
      await updateOrderStatus(r.orderId, 'DELIVERED', user.id, `Return request declined${note ? `: ${note}` : ''}`);
    }
    // Approved returns: staff arrange pickup, then mark the order RETURNED and refund from the order page.
    await db.update(schema.orderRequests).set({ status: decision === 'APPROVED' && r.type === 'CANCEL' ? 'COMPLETED' : decision, adminNote: note }).where(eq(schema.orderRequests.id, reqId));
    await db.insert(schema.orderEvents).values({ orderId: r.orderId, message: `${r.type === 'CANCEL' ? 'Cancellation' : 'Return'} request ${decision.toLowerCase()}${note ? `: ${note}` : ''}.`, userId: user.id });
    await audit(user.id, `request.${decision.toLowerCase()}`, 'order', r.orderId, { type: r.type });
    revalidatePath('/admin/requests');
    return { ok: true, message: 'Request updated.' };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function completeRequest(fd: FormData) {
  const user = await requirePermission('orders:edit');
  const reqId = String(fd.get('requestId'));
  await db.update(schema.orderRequests).set({ status: 'COMPLETED' }).where(eq(schema.orderRequests.id, reqId));
  await audit(user.id, 'request.complete', 'order_request', reqId);
  revalidatePath('/admin/requests');
}
