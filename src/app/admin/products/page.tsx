import Link from 'next/link';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, can } from '@/server/auth';
import { AdminHeader, AdminPager, SearchBar, Table, Td } from '@/components/admin/ui';
import { ProductArt } from '@/components/store/ProductArt';
import { Badge, buttonClass } from '@/components/ui';
import { formatINR } from '@/lib/utils';
import { bulkProducts } from './actions';

export const metadata = { title: 'Products' };
type SP = { q?: string; status?: string; category?: string; page?: string };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission('products:view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 25;
  const where: SQL[] = [];
  if (sp.q) where.push(or(ilike(schema.products.name, `%${sp.q}%`), sql`exists (select 1 from variants v where v.product_id = ${schema.products.id} and v.sku ilike ${`%${sp.q}%`})`)!);
  if (sp.status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(sp.status)) where.push(eq(schema.products.status, sp.status as 'DRAFT'));
  else where.push(sql`${schema.products.status} <> 'ARCHIVED'`);
  if (sp.category) where.push(eq(schema.products.categoryId, sp.category));
  const w = and(...where);
  const [[{ n }], rows, cats] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(w),
    db.query.products.findMany({ where: w, with: { category: { columns: { name: true } }, variants: true, images: { limit: 1, orderBy: (i, { asc }) => [asc(i.sortOrder)] } }, orderBy: [desc(schema.products.updatedAt)], limit: per, offset: (page - 1) * per }),
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
  ]);
  const editable = can(user.role, 'products:edit');
  return (
    <>
      <AdminHeader title="Products" text={`${n} product${n === 1 ? '' : 's'}`} actions={editable && <Link href="/admin/products/new" className={buttonClass()}>Add product</Link>} />
      <SearchBar placeholder="Search name or SKU" defaultValue={sp.q}>
        <select name="status" defaultValue={sp.status ?? ''} className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm" aria-label="Status"><option value="">Active (draft + published)</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <select name="category" defaultValue={sp.category ?? ''} className="h-10 rounded-xl border border-brand-ink/15 bg-white px-3 text-sm" aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </SearchBar>
      <form action={bulkProducts}>
        {editable && (
          <div className="mb-3 flex items-center gap-2 text-sm">
            <label htmlFor="bulk" className="text-brand-ink/60">With selected:</label>
            <select id="bulk" name="bulk" className="h-9 rounded-lg border border-brand-ink/15 bg-white px-2"><option value="PUBLISHED">Publish</option><option value="DRAFT">Move to draft</option><option value="ARCHIVED">Archive</option></select>
            <button className="h-9 rounded-lg border border-brand-ink/15 bg-white px-3 font-semibold">Apply</button>
          </div>
        )}
        <Table head={[editable ? <span className="sr-only">Select</span> : '', 'Product', 'Category', 'Price', 'Stock', 'Status']} empty={!rows.length && 'No products match. Clear the filters or add a product.'}>
          {rows.map((p) => {
            const active = p.variants.filter((v) => v.isActive);
            const stock = active.reduce((s, v) => s + v.stock, 0);
            const prices = active.map((v) => v.price);
            return (
              <tr key={p.id} className="hover:bg-brand-ink/[.015]">
                <Td className="w-8">{editable && <input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="accent-brand" />}</Td>
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="size-11 shrink-0 overflow-hidden rounded-lg border border-brand-ink/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.images[0] ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <ProductArt name={p.name} label={false} />}
                    </span>
                    <span><span className="font-semibold hover:text-brand">{p.name}</span><span className="block text-xs text-brand-ink/55">{active.map((v) => v.label).join(' · ') || 'No active pack sizes'}{p.isDemo && ' · demo'}</span></span>
                  </Link>
                </Td>
                <Td>{p.category.name}{p.kind !== 'FOOD' && <Badge className="ml-2" tone="blue">{p.kind.toLowerCase()}</Badge>}</Td>
                <Td>{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatINR(prices[0]) : `${formatINR(Math.min(...prices))}–${formatINR(Math.max(...prices))}`) : '—'}</Td>
                <Td><span className={stock === 0 ? 'font-semibold text-red-700' : active.some((v) => v.stock <= v.reorderLevel) ? 'font-semibold text-[#9a6200]' : ''}>{stock}</span></Td>
                <Td><Badge tone={p.status === 'PUBLISHED' ? 'green' : p.status === 'DRAFT' ? 'yellow' : 'gray'}>{p.status.toLowerCase()}</Badge></Td>
              </tr>
            );
          })}
        </Table>
      </form>
      <AdminPager page={page} pages={Math.ceil(n / per)} base="/admin/products" params={{ q: sp.q, status: sp.status, category: sp.category }} />
    </>
  );
}
