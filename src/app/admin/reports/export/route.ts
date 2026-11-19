import { NextResponse } from 'next/server';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getCurrentUser, can } from '@/server/auth';
import { audit } from '@/server/audit';
import { toCSV } from '@/lib/utils';

const rs = (p: number | null | undefined) => (p == null ? '' : (p / 100).toFixed(2));

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? '';
  const needs = ['inventory', 'stock-movements', 'products'].includes(type) ? 'inventory:view' : type === 'orders' || type === 'order-items' ? 'orders:view' : 'reports:view';
  if (!user || !can(user.role, needs)) return new NextResponse('Forbidden', { status: 403 });
  const from = url.searchParams.get('from'), to = url.searchParams.get('to');
  const rangeOf = (col: import('drizzle-orm/pg-core').PgColumn) => and(from ? gte(col, new Date(`${from}T00:00:00+05:30`)) : undefined, to ? lte(col, new Date(`${to}T23:59:59+05:30`)) : undefined);
  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case 'orders': {
      const list = await db.query.orders.findMany({ where: rangeOf(schema.orders.createdAt), orderBy: [desc(schema.orders.createdAt)], with: { items: true } });
      rows = list.map((o) => ({ order: o.number, date: o.createdAt.toISOString(), status: o.status, payment_status: o.paymentStatus, method: o.paymentMethod, customer: o.shippingAddress.fullName, email: o.email, phone: o.phone,
        city: o.shippingAddress.city, state: o.shippingAddress.state, pincode: o.shippingAddress.pincode, items: o.items.reduce((s, i) => s + i.quantity, 0),
        subtotal: rs(o.subtotal), discount: rs(o.discount), coupon: o.couponCode, shipping: rs(o.shipping), total: rs(o.total), razorpay_payment: o.razorpayPaymentId, courier: o.courier, tracking: o.trackingNumber }));
      break;
    }
    case 'order-items': {
      const list = await db.select({ i: schema.orderItems, o: schema.orders }).from(schema.orderItems).innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId)).where(rangeOf(schema.orders.createdAt)).orderBy(desc(schema.orders.createdAt));
      rows = list.map(({ i, o }) => ({ order: o.number, date: o.createdAt.toISOString(), status: o.status, payment_status: o.paymentStatus, product: i.productName, category: i.categoryName, sku: i.sku, pack: i.variantLabel, qty: i.quantity, unit_price: rs(i.unitPrice), unit_mrp: rs(i.unitMrp), line_total: rs(i.unitPrice * i.quantity), hsn: i.hsnCode, gst_rate: i.gstRate }));
      break;
    }
    case 'products': {
      const list = await db.select({ p: schema.products, v: schema.variants, c: schema.categories.name }).from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).innerJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId)).orderBy(asc(schema.products.name), asc(schema.variants.sortOrder));
      rows = list.map(({ p, v, c }) => ({ product: p.name, slug: p.slug, category: c, type: p.kind, status: p.status, demo: p.isDemo, sku: v.sku, pack: v.label, weight_g: v.weightGrams, price: rs(v.price), mrp: rs(v.mrp), cost: rs(v.cost), stock: v.stock, reorder_level: v.reorderLevel, active: v.isActive, hsn: p.hsnCode, gst_rate: p.gstRate }));
      break;
    }
    case 'inventory': {
      const list = await db.select({ v: schema.variants, p: schema.products.name, b: schema.batches }).from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).leftJoin(schema.batches, and(eq(schema.batches.variantId, schema.variants.id), sql`${schema.batches.quantity} > 0`)).orderBy(asc(schema.products.name));
      rows = list.map(({ v, p, b }) => ({ product: p, sku: v.sku, pack: v.label, sku_stock: v.stock, reorder_level: v.reorderLevel, batch: b?.batchNumber, batch_qty: b?.quantity, mfg_date: b?.mfgDate?.toISOString().slice(0, 10), best_before: b?.bestBefore?.toISOString().slice(0, 10), unit_cost: rs(b?.unitCost ?? v.cost) }));
      break;
    }
    case 'stock-movements': {
      const list = await db.select({ m: schema.stockMovements, sku: schema.variants.sku, batch: schema.batches.batchNumber }).from(schema.stockMovements).innerJoin(schema.variants, eq(schema.variants.id, schema.stockMovements.variantId)).leftJoin(schema.batches, eq(schema.batches.id, schema.stockMovements.batchId)).where(rangeOf(schema.stockMovements.createdAt)).orderBy(desc(schema.stockMovements.createdAt));
      rows = list.map(({ m, sku, batch }) => ({ date: m.createdAt.toISOString(), sku, batch, reason: m.reason, change: m.change, balance: m.balance, note: m.note, order_id: m.orderId, user_id: m.userId }));
      break;
    }
    case 'customers': {
      const list = await db.select({ u: schema.users, orders: sql<number>`(select count(*)::int from orders o where o.user_id = ${schema.users.id} and o.payment_status in ('PAID','PARTIALLY_REFUNDED'))`, spent: sql<number>`(select coalesce(sum(o.total),0)::int from orders o where o.user_id = ${schema.users.id} and o.payment_status in ('PAID','PARTIALLY_REFUNDED'))` }).from(schema.users).where(eq(schema.users.role, 'CUSTOMER')).orderBy(desc(schema.users.createdAt));
      rows = list.map(({ u, orders, spent }) => ({ name: u.name, email: u.email, phone: u.phone, joined: u.createdAt.toISOString().slice(0, 10), paid_orders: orders, total_spent: rs(spent), active: u.isActive }));
      break;
    }
    case 'newsletter': {
      rows = (await db.select().from(schema.newsletterSubscribers).orderBy(desc(schema.newsletterSubscribers.createdAt))).map((s) => ({ email: s.email, subscribed: s.createdAt.toISOString() }));
      break;
    }
    case 'refunds': {
      const list = await db.select({ r: schema.refunds, n: schema.orders.number }).from(schema.refunds).innerJoin(schema.orders, eq(schema.orders.id, schema.refunds.orderId)).where(rangeOf(schema.refunds.createdAt)).orderBy(desc(schema.refunds.createdAt));
      rows = list.map(({ r, n }) => ({ date: r.createdAt.toISOString(), order: n, amount: rs(r.amount), reason: r.reason, razorpay_refund: r.razorpayRefundId, status: r.status }));
      break;
    }
    default:
      return new NextResponse('Unknown export', { status: 400 });
  }
  await audit(user.id, 'export', type, null, { from, to, rows: rows.length });
  // Prefix cells that start with formula characters to prevent CSV injection in spreadsheet apps.
  const safe = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v])));
  const csv = '﻿' + toCSV(safe);
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="dryharvest-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
}
