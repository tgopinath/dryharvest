import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader, Panel, Stat, Table, Td } from '@/components/admin/ui';
import { formatINR } from '@/lib/utils';

export const metadata = { title: 'Reports & exports' };
const ist = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requirePermission('reports:view');
  const sp = await searchParams;
  const from = sp.from || ist(new Date(Date.now() - 29 * 864e5));
  const to = sp.to || ist(new Date());
  const range = and(gte(schema.orders.createdAt, new Date(`${from}T00:00:00+05:30`)), lte(schema.orders.createdAt, new Date(`${to}T23:59:59+05:30`)));
  const paid = and(range, sql`${schema.orders.paymentStatus} in ('PAID','PARTIALLY_REFUNDED')`);
  const [[sum], [ref], byProduct, byCategory, byMethod] = await Promise.all([
    db.select({ orders: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int`, discount: sql<number>`coalesce(sum(${schema.orders.discount}),0)::int`, shipping: sql<number>`coalesce(sum(${schema.orders.shipping}),0)::int` }).from(schema.orders).where(paid),
    db.select({ n: sql<number>`coalesce(sum(${schema.refunds.amount}),0)::int` }).from(schema.refunds).where(and(gte(schema.refunds.createdAt, new Date(`${from}T00:00:00+05:30`)), lte(schema.refunds.createdAt, new Date(`${to}T23:59:59+05:30`)))),
    db.select({ name: schema.orderItems.productName, sku: schema.orderItems.sku, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, revenue: sql<number>`sum(${schema.orderItems.unitPrice}*${schema.orderItems.quantity})::int`,
      cost: sql<number>`sum(coalesce(${schema.variants.cost},0)*${schema.orderItems.quantity})::int` })
      .from(schema.orderItems).innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId)).leftJoin(schema.variants, eq(schema.variants.id, schema.orderItems.variantId))
      .where(paid).groupBy(schema.orderItems.productName, schema.orderItems.sku).orderBy(sql`4 desc`).limit(50),
    db.select({ name: sql<string>`coalesce(${schema.orderItems.categoryName},'Other')`, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, revenue: sql<number>`sum(${schema.orderItems.unitPrice}*${schema.orderItems.quantity})::int` })
      .from(schema.orderItems).innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId)).where(paid).groupBy(sql`1`).orderBy(sql`3 desc`),
    db.select({ m: schema.orders.paymentMethod, n: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int` }).from(schema.orders).where(paid).groupBy(schema.orders.paymentMethod),
  ]);
  const q = `from=${from}&to=${to}`;
  const exports = [
    ['orders', 'Orders'], ['order-items', 'Order line items'], ['products', 'Products & variants'], ['inventory', 'Inventory & batches'],
    ['stock-movements', 'Stock movements'], ['customers', 'Customers'], ['newsletter', 'Newsletter subscribers'], ['refunds', 'Refunds'],
  ];
  return (
    <>
      <AdminHeader title="Reports & exports" text="Figures count paid orders (COD orders count once delivered)." />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <label className="text-sm">From<input type="date" name="from" defaultValue={from} className="ml-2 h-10 rounded-xl border border-brand-ink/15 bg-white px-3" /></label>
        <label className="text-sm">To<input type="date" name="to" defaultValue={to} className="ml-2 h-10 rounded-xl border border-brand-ink/15 bg-white px-3" /></label>
        <button className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Update</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Paid orders" value={String(sum.orders)} />
        <Stat label="Gross revenue" value={formatINR(sum.revenue)} />
        <Stat label="Average order" value={formatINR(sum.orders ? Math.round(sum.revenue / sum.orders) : 0)} />
        <Stat label="Discounts given" value={formatINR(sum.discount)} />
        <Stat label="Refunded" value={formatINR(ref.n)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Sales by product">
          <Table head={['Product', 'SKU', 'Units', 'Revenue', 'Est. margin']} empty={!byProduct.length && 'No paid orders in this range.'}>
            {byProduct.map((r) => <tr key={r.sku}><Td>{r.name}</Td><Td className="font-mono text-xs">{r.sku}</Td><Td>{r.qty}</Td><Td>{formatINR(r.revenue)}</Td><Td>{r.cost ? formatINR(r.revenue - r.cost) : '—'}</Td></tr>)}
          </Table>
        </Panel>
        <div className="space-y-6">
          <Panel title="Sales by category">
            <Table head={['Category', 'Units', 'Revenue']} empty={!byCategory.length && 'No data.'}>
              {byCategory.map((r) => <tr key={r.name}><Td>{r.name}</Td><Td>{r.qty}</Td><Td>{formatINR(r.revenue)}</Td></tr>)}
            </Table>
          </Panel>
          <Panel title="By payment method">
            <Table head={['Method', 'Orders', 'Revenue']} empty={!byMethod.length && 'No data.'}>
              {byMethod.map((r) => <tr key={r.m}><Td>{r.m === 'COD' ? 'Cash on delivery' : 'Razorpay'}</Td><Td>{r.n}</Td><Td>{formatINR(r.revenue)}</Td></tr>)}
            </Table>
          </Panel>
          <Panel title="CSV exports">
            <ul className="grid gap-2 sm:grid-cols-2">
              {exports.map(([k, l]) => <li key={k}><a className="block rounded-xl border border-brand-ink/10 px-3 py-2 text-sm font-semibold hover:border-brand" href={`/admin/reports/export?type=${k}&${q}`}>{l}</a></li>)}
            </ul>
            <p className="mt-3 text-xs text-brand-ink/55">Order, item, movement and refund exports use the date range above.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
