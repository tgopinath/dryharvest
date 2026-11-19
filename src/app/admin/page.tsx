import Link from 'next/link';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { releaseStaleOrders } from '@/server/orders';
import { AdminHeader, Panel, Stat, Table, Td } from '@/components/admin/ui';
import { SalesTrend, CategoryBars } from '@/components/admin/Charts';
import { StatusBadge } from '@/components/store/OrderBits';
import { Alert, Badge } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

const PAID = sql`${schema.orders.paymentStatus} in ('PAID','PARTIALLY_REFUNDED')`;
const LIVE = sql`${schema.orders.status} not in ('PENDING_PAYMENT','CANCELLED')`;

export default async function Dashboard() {
  await requirePermission('dashboard:view');
  await releaseStaleOrders();
  const since30 = new Date(Date.now() - 30 * 864e5);
  const soon = new Date(Date.now() + 30 * 864e5);

  const [[totals], [pending], [refunded], trendRows, byCat, top, recent, low, expiring, [demo]] = await Promise.all([
    db.select({ orders: sql<number>`count(*) filter (where ${LIVE})::int`, revenue: sql<number>`coalesce(sum(${schema.orders.total}) filter (where ${PAID}),0)::int`, r30: sql<number>`coalesce(sum(${schema.orders.total}) filter (where ${PAID} and ${schema.orders.createdAt} >= ${since30}),0)::int`, o30: sql<number>`count(*) filter (where ${LIVE} and ${schema.orders.createdAt} >= ${since30})::int` }).from(schema.orders),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(inArray(schema.orders.status, ['PLACED', 'CONFIRMED', 'PACKED'])),
    db.select({ n: sql<number>`coalesce(sum(${schema.refunds.amount}),0)::int` }).from(schema.refunds),
    db.select({ day: sql<string>`to_char(date_trunc('day', ${schema.orders.createdAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`, revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int`, orders: sql<number>`count(*)::int` })
      .from(schema.orders).where(and(PAID, gte(schema.orders.createdAt, since30))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ name: sql<string>`coalesce(${schema.orderItems.categoryName}, 'Other')`, revenue: sql<number>`sum(${schema.orderItems.unitPrice} * ${schema.orderItems.quantity})::int` })
      .from(schema.orderItems).innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId)).where(PAID).groupBy(sql`1`).orderBy(sql`2 desc`).limit(12),
    db.select({ name: schema.orderItems.productName, slug: schema.orderItems.productSlug, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, revenue: sql<number>`sum(${schema.orderItems.unitPrice} * ${schema.orderItems.quantity})::int` })
      .from(schema.orderItems).innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId)).where(PAID).groupBy(schema.orderItems.productName, schema.orderItems.productSlug).orderBy(sql`3 desc`).limit(8),
    db.query.orders.findMany({ orderBy: [desc(schema.orders.createdAt)], limit: 8 }),
    db.select({ id: schema.variants.id, sku: schema.variants.sku, label: schema.variants.label, stock: schema.variants.stock, reorder: schema.variants.reorderLevel, name: schema.products.name, productId: schema.products.id })
      .from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .where(and(eq(schema.variants.isActive, true), sql`${schema.products.status} <> 'ARCHIVED'`, lte(schema.variants.stock, schema.variants.reorderLevel))).orderBy(asc(schema.variants.stock)).limit(10),
    db.select({ batch: schema.batches.batchNumber, qty: schema.batches.quantity, bb: schema.batches.bestBefore, sku: schema.variants.sku, name: schema.products.name })
      .from(schema.batches).innerJoin(schema.variants, eq(schema.variants.id, schema.batches.variantId)).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .where(and(sql`${schema.batches.quantity} > 0`, lte(schema.batches.bestBefore, soon))).orderBy(asc(schema.batches.bestBefore)).limit(10),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.isDemo, true)),
  ]);

  // fill missing days so the trend line is continuous
  const map = new Map(trendRows.map((r) => [r.day, r]));
  const trend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const r = map.get(d);
    return { day: new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 };
  });
  const [inventory] = await db.select({ units: sql<number>`coalesce(sum(${schema.variants.stock}),0)::int`, value: sql<number>`coalesce(sum(${schema.variants.stock} * coalesce(${schema.variants.cost}, 0)),0)::bigint`, skus: sql<number>`count(*)::int`, out: sql<number>`count(*) filter (where ${schema.variants.stock} = 0)::int` }).from(schema.variants).where(eq(schema.variants.isActive, true));

  return (
    <>
      <AdminHeader title="Dashboard" text={`Today is ${formatDate(new Date())}. Revenue counts paid orders only.`} />
      {demo.n > 0 && <Alert tone="warn" className="mb-6">The catalogue contains {demo.n} demo products with placeholder prices and no real photos. Replace them, or remove all demo data from <Link className="font-semibold underline" href="/admin/settings">Settings</Link> before launch.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total orders" value={totals.orders.toLocaleString('en-IN')} sub={`${totals.o30} in the last 30 days`} />
        <Stat label="Pending fulfilment" value={String(pending.n)} sub="Placed, confirmed or packed" tone={pending.n ? 'warn' : undefined} />
        <Stat label="Revenue (net of refunds)" value={formatINR(totals.revenue - refunded.n)} sub={`${formatINR(totals.r30)} in the last 30 days`} />
        <Stat label="Low-stock SKUs" value={String(low.length)} sub={`${inventory.out} out of stock`} tone={low.length ? 'warn' : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Sales trend · last 30 days">
          {trend.some((t) => t.revenue) ? <SalesTrend data={trend} /> : <p className="py-16 text-center text-sm text-brand-ink/55">No paid orders in the last 30 days yet.</p>}
        </Panel>
        <Panel title="Revenue by category">
          {byCat.length ? <CategoryBars data={byCat} /> : <p className="py-16 text-center text-sm text-brand-ink/55">Category revenue appears after the first paid order.</p>}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent orders" actions={<Link href="/admin/orders" className="text-xs font-semibold text-brand">All orders</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-brand-ink/6 text-sm">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-brand">{o.number}<span className="block text-xs font-normal text-brand-ink/55">{o.shippingAddress.fullName} · {formatDate(o.createdAt, true)}</span></Link>
                  <span className="flex items-center gap-3"><StatusBadge status={o.status} /><span className="w-20 text-right font-semibold">{formatINR(o.total)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="py-8 text-center text-sm text-brand-ink/55">No orders yet.</p>}
        </Panel>
        <Panel title="Top-selling products">
          {top.length ? (
            <Table compact head={['Product', 'Units', 'Revenue']}>
              {top.map((t) => <tr key={t.name}><Td>{t.name}</Td><Td>{t.qty}</Td><Td>{formatINR(t.revenue)}</Td></tr>)}
            </Table>
          ) : <p className="py-8 text-center text-sm text-brand-ink/55">Best sellers appear after the first paid order.</p>}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_.8fr]">
        <Panel title="Low-stock alerts" actions={<Link href="/admin/inventory?filter=low" className="text-xs font-semibold text-brand">Inventory</Link>}>
          {low.length ? (
            <ul className="divide-y divide-brand-ink/6 text-sm">
              {low.map((v) => <li key={v.id} className="flex justify-between gap-2 py-2"><Link href={`/admin/products/${v.productId}`} className="hover:text-brand">{v.name} <span className="text-brand-ink/55">{v.label}</span></Link><Badge tone={v.stock === 0 ? 'red' : 'yellow'}>{v.stock} left · reorder at {v.reorder}</Badge></li>)}
            </ul>
          ) : <p className="py-6 text-center text-sm text-brand-ink/55">All SKUs are above their reorder level.</p>}
        </Panel>
        <Panel title="Expiry alerts · next 30 days">
          {expiring.length ? (
            <ul className="divide-y divide-brand-ink/6 text-sm">
              {expiring.map((b) => { const past = b.bb! < new Date(); return <li key={b.batch + b.sku} className="flex justify-between gap-2 py-2"><span>{b.name} <span className="text-brand-ink/55">{b.sku} · {b.batch} · {b.qty} units</span></span><Badge tone={past ? 'red' : 'yellow'}>{past ? 'Expired' : 'BB'} {formatDate(b.bb)}</Badge></li>; })}
            </ul>
          ) : <p className="py-6 text-center text-sm text-brand-ink/55">No batches expire in the next 30 days.</p>}
        </Panel>
        <Panel title="Inventory overview">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-brand-ink/60">Active SKUs</dt><dd className="font-semibold">{inventory.skus}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-ink/60">Units in stock</dt><dd className="font-semibold">{inventory.units.toLocaleString('en-IN')}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-ink/60">Stock value at cost</dt><dd className="font-semibold">{formatINR(Number(inventory.value))}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-ink/60">Out of stock</dt><dd className="font-semibold">{inventory.out}</dd></div>
          </dl>
        </Panel>
      </div>
    </>
  );
}
