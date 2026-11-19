import Link from 'next/link';
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader, AdminPager, SearchBar, Table, Td } from '@/components/admin/ui';
import { StatusBadge, PaymentBadge } from '@/components/store/OrderBits';
import { formatDate, formatINR, ORDER_STATUS_LABEL } from '@/lib/utils';

export const metadata = { title: 'Orders' };
type SP = { q?: string; status?: string; payment?: string; from?: string; to?: string; page?: string };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('orders:view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 30;
  const where: SQL[] = [];
  if (sp.q) where.push(or(ilike(schema.orders.number, `%${sp.q}%`), ilike(schema.orders.email, `%${sp.q}%`), ilike(schema.orders.phone, `%${sp.q}%`), sql`${schema.orders.shippingAddress}->>'fullName' ilike ${`%${sp.q}%`}`)!);
  if (sp.status === 'TO_FULFIL') where.push(sql`${schema.orders.status} in ('PLACED','CONFIRMED','PACKED')`);
  else if (sp.status && sp.status in ORDER_STATUS_LABEL) where.push(eq(schema.orders.status, sp.status as 'PLACED'));
  if (sp.payment) where.push(eq(schema.orders.paymentStatus, sp.payment as 'PAID'));
  if (sp.from) where.push(gte(schema.orders.createdAt, new Date(`${sp.from}T00:00:00+05:30`)));
  if (sp.to) where.push(lte(schema.orders.createdAt, new Date(`${sp.to}T23:59:59+05:30`)));
  const w = where.length ? and(...where) : undefined;
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(w),
    db.query.orders.findMany({ where: w, with: { items: { columns: { quantity: true } } }, orderBy: [desc(schema.orders.createdAt)], limit: per, offset: (page - 1) * per }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'page') as [string, string][]).toString();
  return (
    <>
      <AdminHeader title="Orders" text={`${n} order${n === 1 ? '' : 's'}`} actions={<a href={`/admin/reports/export?type=orders${qs ? `&${qs}` : ''}`} className="rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold">Export CSV</a>} />
      <SearchBar placeholder="Order no., name, email or phone" defaultValue={sp.q}>
        <select name="status" defaultValue={sp.status ?? ''} aria-label="Status" className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm"><option value="">All statuses</option><option value="TO_FULFIL">To fulfil</option>{Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="payment" defaultValue={sp.payment ?? ''} aria-label="Payment" className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm"><option value="">Any payment</option>{['PAID', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map((p) => <option key={p} value={p}>{p.replace('_', ' ').toLowerCase()}</option>)}</select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm" />
        <input type="date" name="to" defaultValue={sp.to} aria-label="To date" className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm" />
      </SearchBar>
      <Table head={['Order', 'Customer', 'Date', 'Items', 'Total', 'Payment', 'Status']} empty={!rows.length && 'No orders match these filters.'}>
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-brand-ink/[.015]">
            <Td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand hover:underline">{o.number}</Link></Td>
            <Td>{o.shippingAddress.fullName}<span className="block text-xs text-brand-ink/55">{o.shippingAddress.city}</span></Td>
            <Td className="whitespace-nowrap">{formatDate(o.createdAt, true)}</Td>
            <Td>{o.items.reduce((s, i) => s + i.quantity, 0)}</Td>
            <Td className="font-semibold">{formatINR(o.total)}</Td>
            <Td><PaymentBadge status={o.paymentStatus} /><span className="block text-xs text-brand-ink/55">{o.paymentMethod === 'COD' ? 'COD' : 'Online'}</span></Td>
            <Td><StatusBadge status={o.status} /></Td>
          </tr>
        ))}
      </Table>
      <AdminPager page={page} pages={Math.ceil(n / per)} base="/admin/orders" params={{ ...sp, page: undefined }} />
    </>
  );
}
