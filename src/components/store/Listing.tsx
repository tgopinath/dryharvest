import Link from 'next/link';
import { Suspense } from 'react';
import { queryProducts, getAvailableSizes, SORTS, hydrateCards, type SortKey } from '@/server/catalog';
import { getCurrentUser } from '@/server/auth';
import { ProductGrid } from './ProductCard';
import { Filters } from './Filters';
import { Pagination } from './Pagination';
import { EmptyState, buttonClass } from '@/components/ui';
import { rupeesToPaise } from '@/lib/utils';

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function Listing({ sp, basePath, category, q, categories }: { sp: SP; basePath: string; category?: string; q?: string; categories?: { slug: string; name: string }[] }) {
  const sort = (one(sp.sort) ?? 'featured') as SortKey;
  const sizes = sp.size ? (Array.isArray(sp.size) ? sp.size : [sp.size]) : [];
  const [res, allSizes, user] = await Promise.all([
    queryProducts({
      category: category ?? one(sp.category), q: q ?? one(sp.q), collection: one(sp.collection), kind: one(sp.kind),
      min: rupeesToPaise(one(sp.min)), max: rupeesToPaise(one(sp.max)), sizes, inStock: !!one(sp.stock),
      sort: sort in SORTS ? sort : 'featured', page: Number(one(sp.page)) || 1, perPage: 12,
    }),
    getAvailableSizes(category),
    getCurrentUser(),
  ]);
  const items = user && res.items.length ? await hydrateCards(res.items.map((i) => i.id), user.id) : res.items;
  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <Suspense><Filters mode="sidebar" sizes={allSizes} categories={categories} sorts={SORTS} total={res.total} /></Suspense>
      <div>
        <Suspense><Filters mode="toolbar" sizes={allSizes} categories={categories} sorts={SORTS} total={res.total} /></Suspense>
        {items.length ? (
          <>
            <ProductGrid items={items} cols={3} />
            <Pagination page={res.page} pages={res.pages} basePath={basePath} params={sp} />
          </>
        ) : (
          <EmptyState
            title={q ? `Nothing matches “${q}”` : 'No products match these filters'}
            text={q ? 'Check the spelling or try a simpler word, like “mango” or “powder”.' : 'Remove a filter or two to see more of the range.'}
            action={<Link href={basePath === '/search' ? '/shop' : basePath} className={buttonClass('outline')}>{basePath === '/search' ? 'Browse the shop' : 'Clear filters'}</Link>}
          />
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, text, crumbs }: { title: string; text?: string | null; crumbs?: { href: string; label: string }[] }) {
  return (
    <div className="mb-8">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-brand-ink/55">
          <ol className="flex flex-wrap gap-1">
            {crumbs.map((c, i) => <li key={c.href} className="flex gap-1">{i > 0 && <span aria-hidden>/</span>}<Link className="hover:text-brand" href={c.href}>{c.label}</Link></li>)}
          </ol>
        </nav>
      )}
      <h1 className="text-4xl font-bold text-brand-deep sm:text-5xl">{title}</h1>
      {text && <p className="mt-3 max-w-2xl text-brand-ink/65">{text}</p>}
    </div>
  );
}
