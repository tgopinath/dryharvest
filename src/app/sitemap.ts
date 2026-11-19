import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const [products, cats] = await Promise.all([
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt }).from(schema.products).where(eq(schema.products.status, 'PUBLISHED')),
    db.select({ slug: schema.categories.slug, updatedAt: schema.categories.updatedAt }).from(schema.categories).where(eq(schema.categories.isActive, true)),
  ]);
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily' },
    { url: `${base}/categories` }, { url: `${base}/about` }, { url: `${base}/contact` },
    ...cats.map((c) => ({ url: `${base}/category/${c.slug}`, lastModified: c.updatedAt })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
  ];
}
