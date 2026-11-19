import Link from 'next/link';
import { and, asc, eq, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader, AdminPager, SearchBar, Table, Td } from '@/components/admin/ui';
import { Badge } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata = { title: 'Inventory' };
type SP = { q?: string; filter?: string; page?: string };

export default async function Inventory({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission('inventory:view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 40;
  const nextBB = sql<Date | null>`(select min(b.best_before) from batches b where b.variant_id = ${schema.variants.id} and b.quantity > 0)`;
  const where: SQL[] = [eq(schema.variants.isActive, true), sql`${schema.products.status} <> 'ARCHIVED'`];
  if (sp.q) where.push(or(ilike(schema.products.name, `%${sp.q}%`), ilike(schema.variants.sku, `%${sp.q}%`))!);
  if (sp.filter === 'low') where.push(lte(schema.variants.stock, schema.variants.reorderLevel));
  if (sp.filter === 'out') where.push(eq(schema.variants.stock, 0));
  if (sp.filter === 'expiring') where.push(sql`${nextBB} <= now() + interval '45 days'`);
  const w = and(...where);
  const base = db.select({ id: schema.variants.id, sku: schema.variants.sku, label: schema.variants.label, stock: schema.variants.stock, reorder: schema.variants.reorderLevel, cost: schema.variants.cost, price: schema.variants.price, name: schema.products.name, productId: schema.products.id, nextBB })
    .from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).where(w);
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).where(w),
    base.orderBy(sp.filter === 'expiring' ? asc(nextBB) : asc(sql`${schema.variants.stock} - ${schema.variants.reorderLevel}`), asc(schema.products.name)).limit(per).offset((page - 1) * per),
  ]);
  const tabs = [['', 'All'], ['low', 'Low stock'], ['out', 'Out of stock'], ['expiring', 'Expiring ≤ 45 days']];
  return (
    <>
      <AdminHeader title="Inventory" text="Stock is tracked per SKU and batch. Every change is recorded in the stock movement log." actions={<a href="/admin/reports/export?type=inventory" className="rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold">Export CSV</a>} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Inventory filters">
        {tabs.map(([k, l]) => <Link key={k} href={k ? `/admin/inventory?filter=${k}` : '/admin/inventory'} aria-current={(sp.filter ?? '') === k ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${(sp.filter ?? '') === k ? 'bg-brand text-white' : 'border border-brand-ink/15 bg-white'}`}>{l}</Link>)}
      </nav>
      <SearchBar placeholder="Product or SKU" defaultValue={sp.q}>{sp.filter && <input type="hidden" name="filter" value={sp.filter} />}</SearchBar>
      <Table head={['SKU', 'Product', 'In stock', 'Reorder at', 'Next best-before', 'Value at cost', '']} empty={!rows.length && 'Nothing to show for this filter.'}>
        {rows.map((r) => {
          const bb = r.nextBB ? new Date(r.nextBB) : null;
          const exp = bb && bb.getTime() < Date.now() + 45 * 864e5;
          return (
            <tr key={r.id}>
              <Td className="font-mono text-xs">{r.sku}</Td>
              <Td><Link className="hover:text-brand" href={`/admin/products/${r.productId}`}>{r.name}</Link> <span className="text-brand-ink/55">{r.label}</span></Td>
              <Td><Badge tone={r.stock === 0 ? 'red' : r.stock <= r.reorder ? 'yellow' : 'green'}>{r.stock}</Badge></Td>
              <Td>{r.reorder}</Td>
              <Td>{bb ? <span className={exp ? 'font-semibold text-[#9a6200]' : ''}>{formatDate(bb)}</span> : '—'}</Td>
              <Td>{r.cost ? formatINR(r.cost * r.stock) : '—'}</Td>
              <Td><Link href={`/admin/inventory/${r.id}`} className="font-semibold text-brand">Manage</Link></Td>
            </tr>
          );
        })}
      </Table>
      <AdminPager page={page} pages={Math.ceil(n / per)} base="/admin/inventory" params={{ q: sp.q, filter: sp.filter }} />
    </>
  );
}
