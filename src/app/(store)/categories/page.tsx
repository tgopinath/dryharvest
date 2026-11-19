import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories, getCategoryCounts } from '@/server/catalog';
import { PageHeader } from '@/components/store/Listing';
import { ProductArt, CAT_ART } from '@/components/store/ProductArt';

export const metadata: Metadata = { title: 'All categories', alternates: { canonical: '/categories' } };
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const [cats, counts] = await Promise.all([getCategories(), getCategoryCounts()]);
  const groups = [
    { title: 'Food', cats: cats.filter((c) => c.kind === 'FOOD') },
    { title: 'Pet products', note: 'Packed and stored separately from human food.', cats: cats.filter((c) => c.kind === 'PET') },
    { title: 'Home & décor', note: 'Decorative botanicals — not for eating.', cats: cats.filter((c) => c.kind === 'DECOR') },
  ].filter((g) => g.cats.length);
  return (
    <div className="container-x py-10">
      <PageHeader title="All categories" crumbs={[{ href: '/', label: 'Home' }, { href: '/categories', label: 'Categories' }]} />
      {groups.map((g) => (
        <section key={g.title} className="mb-12">
          <h2 className="text-2xl">{g.title}</h2>
          {g.note && <p className="mt-1 text-sm text-brand-ink/60">{g.note}</p>}
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.cats.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="flex items-center gap-4 rounded-2xl border border-brand-ink/10 bg-white p-4 hover:border-brand/40">
                  <span className="size-20 shrink-0 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : <ProductArt name={CAT_ART[c.slug] ?? c.name} pouch={false} label={false} />}
                  </span>
                  <span>
                    <span className="block font-display text-xl">{c.name}</span>
                    <span className="block text-sm text-brand-ink/60">{c.description}</span>
                    <span className="mt-1 block text-xs font-semibold text-brand">{counts.get(c.id) ?? 0} products</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
