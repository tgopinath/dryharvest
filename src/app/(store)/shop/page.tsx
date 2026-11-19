import type { Metadata } from 'next';
import { Listing, PageHeader, type SP } from '@/components/store/Listing';
import { getCategories } from '@/server/catalog';

export const metadata: Metadata = { title: 'Shop all products', alternates: { canonical: '/shop' } };
export const dynamic = 'force-dynamic';

const COLLECTION_TITLES: Record<string, string> = {
  'best-sellers': 'Best Sellers', 'south-indian': 'Traditional South Indian Collection', 'natural-snacks': 'Dried Fruits & Natural Snacks',
  'veg-herbs': 'Vegetables, Herbs & Powders', tea: 'Flowers & Herbal Tea', 'ready-to-cook': 'Ready-to-Cook', combo: 'Combo Packs & Gift Boxes',
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cats = await getCategories();
  const col = typeof sp.collection === 'string' ? COLLECTION_TITLES[sp.collection] : null;
  return (
    <div className="container-x py-10">
      <PageHeader title={col ?? 'Shop all products'} text={col ? null : 'Dried fruits, vegetables, herbs, flowers, spices and more. Filter by pack size, price or availability.'} crumbs={[{ href: '/', label: 'Home' }, { href: '/shop', label: 'Shop' }]} />
      <Listing sp={sp} basePath="/shop" categories={cats.map((c) => ({ slug: c.slug, name: c.name }))} />
    </div>
  );
}
