import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { cache } from 'react';
import { db, schema } from '@/db';
import { Listing, PageHeader, type SP } from '@/components/store/Listing';
import { BannerArt } from '@/components/store/ProductArt';
import { asc } from 'drizzle-orm';
import { Alert } from '@/components/ui';

export const dynamic = 'force-dynamic';
const getCat = cache((slug: string) => db.query.categories.findFirst({ where: and(eq(schema.categories.slug, slug), eq(schema.categories.isActive, true)) }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCat((await params).slug);
  if (!c) return {};
  return { title: c.seoTitle || c.name, description: c.seoDescription || c.description || undefined, alternates: { canonical: `/category/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const c = await getCat(slug);
  if (!c) notFound();
  const sp = await searchParams;
  const sample = c.bannerUrl ? [] : await db.select({ name: schema.products.name }).from(schema.products)
    .where(and(eq(schema.products.categoryId, c.id), eq(schema.products.status, 'PUBLISHED'))).orderBy(asc(schema.products.name)).limit(3);
  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="container-x grid items-center gap-6 py-10 md:grid-cols-[1.2fr_1fr]">
          <PageHeader title={c.name} text={c.description} crumbs={[{ href: '/', label: 'Home' }, { href: '/categories', label: 'Categories' }, { href: `/category/${c.slug}`, label: c.name }]} />
          <div className="hidden aspect-[16/9] overflow-hidden rounded-3xl md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.bannerUrl ? <img src={c.bannerUrl} alt="" className="h-full w-full object-cover" /> : <BannerArt names={sample.length ? sample.map((x) => x.name) : [c.name]} />}
          </div>
        </div>
      </section>
      <div className="container-x py-10">
        {c.kind !== 'FOOD' && (
          <Alert tone="warn" className="mb-6">
            {c.kind === 'PET' ? 'Pet products are for animal use only and are not for human consumption. They are packed and stored separately from our food range.' : 'Decorative products are not edible. Keep away from children and pets.'}
          </Alert>
        )}
        <Listing sp={sp} basePath={`/category/${c.slug}`} category={c.slug} />
      </div>
    </>
  );
}
