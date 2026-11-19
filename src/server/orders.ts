import 'server-only';
import { randomInt } from 'node:crypto';
import { and, asc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db, schema, type Tx } from '@/db';
import type { OrderStatus, ShippingAddress } from '@/db/schema';
import { moveStock, audit } from './audit';
import { loadCartLines } from './cart';
import { computeTotals, isPincodeServiceable } from './pricing';
import { getSetting } from './settings';
import { createRazorpayOrder, razorpayConfigured, refundPayment } from './razorpay';

export const PENDING_PAYMENT_TTL_MIN = 30;

function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `DH${ymd}-${randomInt(100000, 999999)}`;
}

/** FEFO: take stock from batches with the earliest best-before first. */
async function deductStockFEFO(tx: Tx, variantId: string, qty: number, orderId: string) {
  const bs = await tx
    .select()
    .from(schema.batches)
    .where(and(eq(schema.batches.variantId, variantId), gt(schema.batches.quantity, 0)))
    .orderBy(sql`${schema.batches.bestBefore} asc nulls last`, asc(schema.batches.createdAt));
  let remaining = qty;
  for (const b of bs) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    await moveStock(tx, { variantId, change: -take, reason: 'SALE', orderId, batchId: b.id });
    remaining -= take;
  }
  if (remaining > 0) await moveStock(tx, { variantId, change: -remaining, reason: 'SALE', orderId });
}

/** Put stock back (cancellation / expired payment). Restores to the batches it came from. */
async function restoreStock(tx: Tx, orderId: string, reason: 'CANCELLATION' | 'RETURN', userId?: string | null) {
  const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for('update');
  if (!order || order.stockReleased) return;
  const sales = await tx
    .select()
    .from(schema.stockMovements)
    .where(and(eq(schema.stockMovements.orderId, orderId), eq(schema.stockMovements.reason, 'SALE')));
  for (const m of sales) {
    await moveStock(tx, { variantId: m.variantId, change: -m.change, reason, orderId, batchId: m.batchId, userId, note: `Order ${order.number}` });
  }
  await tx.update(schema.orders).set({ stockReleased: true }).where(eq(schema.orders.id, orderId));
}

export type CheckoutInput = {
  cartId: string; userId: string | null; email: string; phone: string; address: ShippingAddress;
  paymentMethod: 'RAZORPAY' | 'COD'; couponCode: string | null; notes?: string | null;
};

export async function createOrderFromCart(input: CheckoutInput) {
  const lines = await loadCartLines(input.cartId);
  if (!lines.length) throw new Error('Your cart is empty.');
  const bad = lines.find((l) => l.problem);
  if (bad) throw new Error(`${bad.productName} (${bad.label}): ${bad.problem}. Please update your cart.`);
  if (!(await isPincodeServiceable(input.address.pincode))) throw new Error('Sorry, we do not deliver to this pincode yet.');

  const ship = await getSetting('shipping');
  if (input.paymentMethod === 'RAZORPAY' && !razorpayConfigured()) throw new Error('Online payment is not available yet.');
  if (input.paymentMethod === 'COD' && !ship.codEnabled) throw new Error('Cash on delivery is not available.');

  const totals = await computeTotals(lines, {
    couponCode: input.couponCode, userId: input.userId, email: input.email, paymentMethod: input.paymentMethod,
  });
  if (input.couponCode && totals.couponError) throw new Error(totals.couponError);
  if (input.paymentMethod === 'COD' && ship.codMaxOrder != null && totals.total > ship.codMaxOrder) {
    throw new Error('Cash on delivery is not available for this order value. Please pay online.');
  }
  if (totals.total < 100) throw new Error('Order total is too low.');

  const isCod = input.paymentMethod === 'COD';
  const order = await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(schema.orders)
      .values({
        number: newOrderNumber(), userId: input.userId, email: input.email.toLowerCase(), phone: input.phone,
        status: isCod ? 'PLACED' : 'PENDING_PAYMENT', paymentStatus: 'PENDING', paymentMethod: input.paymentMethod,
        subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping + totals.codFee, total: totals.total,
        couponCode: totals.coupon?.code ?? null, shippingAddress: input.address, notes: input.notes ?? null,
      })
      .returning();
    await tx.insert(schema.orderItems).values(
      lines.map((l) => ({
        orderId: o.id, variantId: l.variantId, productId: l.productId, productName: l.productName, productSlug: l.productSlug,
        categoryName: l.categoryName, variantLabel: l.label, sku: l.sku, unitPrice: l.price, unitMrp: l.mrp,
        quantity: l.quantity, gstRate: l.gstRate, hsnCode: l.hsnCode,
      })),
    );
    // Reserve stock now. If payment never completes, releaseStaleOrders() puts it back.
    for (const l of lines) {
      try {
        await deductStockFEFO(tx, l.variantId, l.quantity, o.id);
      } catch {
        throw new Error(`${l.productName} (${l.label}) just went out of stock. Please update your cart.`);
      }
    }
    await tx.insert(schema.orderEvents).values({
      orderId: o.id, status: o.status, message: isCod ? 'Order placed (cash on delivery).' : 'Order created, awaiting payment.',
    });
    if (isCod) {
      if (o.couponCode) await tx.update(schema.coupons).set({ usedCount: sql`${schema.coupons.usedCount} + 1` }).where(eq(schema.coupons.code, o.couponCode));
      await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, input.cartId));
      await tx.update(schema.carts).set({ couponCode: null }).where(eq(schema.carts.id, input.cartId));
    }
    return o;
  });

  if (isCod) return { order, razorpay: null };

  try {
    const rz = await createRazorpayOrder(order.total, order.number, { order_number: order.number });
    await db.update(schema.orders).set({ razorpayOrderId: rz.id }).where(eq(schema.orders.id, order.id));
    return { order, razorpay: { orderId: rz.id, amount: rz.amount, keyId: process.env.RAZORPAY_KEY_ID! } };
  } catch (e) {
    await cancelOrder(order.id, null, 'Could not start payment.', { skipRefund: true });
    throw e;
  }
}

/** Idempotent: safe to call from both the checkout callback and the webhook. */
export async function markOrderPaid(razorpayOrderId: string, paymentId: string, amount: number) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.razorpayOrderId, razorpayOrderId)).for('update');
    if (!o) throw new Error('Order not found');
    if (o.paymentStatus === 'PAID') return o;
    if (amount !== o.total) throw new Error('Paid amount does not match the order total.');
    if (o.status === 'CANCELLED' || o.stockReleased) {
      // Payment arrived after the reservation expired. Record it; staff must confirm stock or refund.
      await tx.update(schema.orders).set({ paymentStatus: 'PAID', razorpayPaymentId: paymentId }).where(eq(schema.orders.id, o.id));
      await tx.insert(schema.orderEvents).values({
        orderId: o.id, message: `Payment ${paymentId} received after the order expired. Review: re-open or refund.`,
      });
      return o;
    }
    const [updated] = await tx
      .update(schema.orders)
      .set({ paymentStatus: 'PAID', status: 'PLACED', razorpayPaymentId: paymentId })
      .where(eq(schema.orders.id, o.id))
      .returning();
    await tx.insert(schema.orderEvents).values({ orderId: o.id, status: 'PLACED', message: `Payment received (${paymentId}).` });
    if (o.couponCode) await tx.update(schema.coupons).set({ usedCount: sql`${schema.coupons.usedCount} + 1` }).where(eq(schema.coupons.code, o.couponCode));
    if (o.userId) {
      const cart = await tx.query.carts.findFirst({ where: eq(schema.carts.userId, o.userId) });
      if (cart) {
        await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
        await tx.update(schema.carts).set({ couponCode: null }).where(eq(schema.carts.id, cart.id));
      }
    }
    return updated;
  });
}

export async function markPaymentFailed(razorpayOrderId: string, reason: string) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.razorpayOrderId, razorpayOrderId) });
  if (!o || o.paymentStatus !== 'PENDING') return;
  await db.insert(schema.orderEvents).values({ orderId: o.id, message: `Payment attempt failed: ${reason}` });
}

export async function cancelOrder(orderId: string, userId: string | null, reason: string, opts: { skipRefund?: boolean } = {}) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!o) throw new Error('Order not found');
  if (['SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'].includes(o.status)) throw new Error(`Cannot cancel an order that is ${o.status.toLowerCase()}.`);
  await db.transaction(async (tx) => {
    await restoreStock(tx, orderId, 'CANCELLATION', userId);
    await tx.update(schema.orders).set({ status: 'CANCELLED', paymentStatus: o.paymentStatus === 'PENDING' ? 'FAILED' : o.paymentStatus }).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, status: 'CANCELLED', message: `Cancelled: ${reason}`, userId });
    await audit(userId, 'order.cancel', 'order', orderId, { reason }, tx);
  });
  if (!opts.skipRefund && o.paymentStatus === 'PAID' && o.razorpayPaymentId) {
    await issueRefund(orderId, o.total, `Cancellation: ${reason}`, userId);
  }
}

export async function issueRefund(orderId: string, amount: number, reason: string, userId: string | null) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { refunds: true } });
  if (!o) throw new Error('Order not found');
  if (o.paymentStatus !== 'PAID' && o.paymentStatus !== 'PARTIALLY_REFUNDED') throw new Error('Only paid orders can be refunded.');
  const already = o.refunds.reduce((s, r) => s + r.amount, 0);
  if (amount <= 0 || already + amount > o.total) throw new Error('Refund amount exceeds what was paid.');
  let razorpayRefundId: string | null = null;
  if (o.paymentMethod === 'RAZORPAY') {
    if (!o.razorpayPaymentId) throw new Error('No Razorpay payment on this order.');
    const r = await refundPayment(o.razorpayPaymentId, amount, { order_number: o.number, reason: reason.slice(0, 200) });
    razorpayRefundId = r.id;
  }
  const full = already + amount >= o.total;
  await db.transaction(async (tx) => {
    await tx.insert(schema.refunds).values({ orderId, amount, reason, razorpayRefundId, userId, status: razorpayRefundId ? 'processed' : 'manual' });
    await tx.update(schema.orders).set({ paymentStatus: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' }).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, message: `Refund of ₹${(amount / 100).toFixed(2)} ${razorpayRefundId ? `issued (${razorpayRefundId})` : 'recorded (manual / COD)'}.`, userId });
    await audit(userId, 'order.refund', 'order', orderId, { amount, razorpayRefundId }, tx);
  });
}

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED', 'RETURNED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: [],
  CANCELLED: [],
};
export const allowedNextStatuses = (s: OrderStatus) => FLOW[s];

export async function updateOrderStatus(orderId: string, next: OrderStatus, userId: string, note?: string | null) {
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!o) throw new Error('Order not found');
  if (!FLOW[o.status].includes(next)) throw new Error(`Cannot move from ${o.status} to ${next}.`);
  if (next === 'CANCELLED') return cancelOrder(orderId, userId, note || 'Cancelled by store');
  await db.transaction(async (tx) => {
    if (next === 'RETURNED') await restoreStock(tx, orderId, 'RETURN', userId);
    const patch: Partial<typeof schema.orders.$inferInsert> = { status: next };
    if (next === 'DELIVERED' && o.paymentMethod === 'COD' && o.paymentStatus === 'PENDING') patch.paymentStatus = 'PAID';
    await tx.update(schema.orders).set(patch).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, status: next, message: note || `Status changed to ${next}.`, userId });
    await audit(userId, 'order.status', 'order', orderId, { from: o.status, to: next }, tx);
  });
}

/** Cancels unpaid online orders older than the TTL and returns their stock. Safe to run often. */
export async function releaseStaleOrders() {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MIN * 60_000);
  const stale = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.status, 'PENDING_PAYMENT'), eq(schema.orders.paymentStatus, 'PENDING'), lt(schema.orders.createdAt, cutoff)))
    .limit(200);
  for (const s of stale) {
    try { await cancelOrder(s.id, null, 'Payment not completed in time', { skipRefund: true }); } catch { /* ignore */ }
  }
  return stale.length;
}

export async function getOrderForViewer(number: string, viewer: { id: string; role: string } | null) {
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.number, number),
    with: { items: true, events: { orderBy: (e, { asc }) => [asc(e.createdAt)] }, refunds: true, requests: true },
  });
  if (!o) return null;
  if (viewer && (viewer.role !== 'CUSTOMER' || o.userId === viewer.id)) return o;
  return null;
}

export async function hasPurchased(userId: string, productId: string) {
  const r = await db
    .select({ id: schema.orderItems.id })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .where(and(eq(schema.orders.userId, userId), eq(schema.orderItems.productId, productId), inArray(schema.orders.status, ['DELIVERED', 'SHIPPED', 'PACKED', 'CONFIRMED', 'PLACED'])))
    .limit(1);
  return r.length > 0;
}
