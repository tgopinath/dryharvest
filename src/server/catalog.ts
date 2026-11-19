import 'server-only';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { cache } from 'react';
import { db, schema } from '@/db';

export type CardProduct = {
  id: string; slug: string; name: string; kind: 'FOOD' | 'PET' | 'DECOR'; isDemo: boolean;
  categoryName: string; categorySlug: string; imageUrl: string | null; imageAlt: string | null;
  variants: { id: string; label: string; price: number; mrp: number; stock: number }[];
  rating: number | null; reviewCount: number; inWishlist?: boolean;
};

export const SORTS = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name A–Z',
  rating: 'Top rated',
} as const;
export type SortKey = keyof typeof SORTS;

export type ProductQuery = {
  category?: string | null; q?: string | null; collection?: string | null; kind?: string | null;
  min?: number | null; max?: number | null; sizes?: string[]; inStock?: boolean; sort?: SortKey;
  page?: number; perPage?: number; excludeId?: string;
};

const minPrice = sql<number>`(select min(v.price) from variants v where v.product_id = ${schema.products.id} and v.is_active)`;
const totalStock = sql<number>`(select coalesce(sum(v.stock),0) from variants v where v.product_id = ${schema.products.id} and v.is_active)`;
const avgRating = sql<number | null>`(select avg(r.rating)::float from reviews r where r.product_id = ${schema.products.id} and r.status = 'APPROVED')`;
const reviewCount = sql<number>`(select count(*)::int from reviews r where r.product_id = ${schema.products.id} and r.status = 'APPROVED')`;

export async function queryProducts(q: ProductQuery) {
  const perPage = Math.min(Math.max(q.perPage ?? 12, 1), 48);
  const page = Math.max(q.page ?? 1, 1);
  const where: SQL[] = [eq(schema.products.status, 'PUBLISHED'), eq(schema.categories.isActive, true)];
  if (q.category) where.push(eq(schema.categories.slug, q.category));
  if (q.collection) where.push(sql`${q.collection} = any(${schema.products.collections})`);
  if (q.kind && ['FOOD', 'PET', 'DECOR'].includes(q.kind)) where.push(eq(schema.products.kind, q.kind as 'FOOD'));
  if (q.excludeId) where.push(sql`${schema.products.id} <> ${q.excludeId}`);
  if (q.q) {
    const term = `%${q.q.trim().replace(/[%_]/g, '')}%`;
    where.push(or(ilike(schema.products.name, term), ilike(schema.products.shortDescription, term), sql`array_to_string(${schema.products.tags}, ' ') ilike ${term}`, ilike(schema.categories.name, term))!);
  }
  if (q.min != null) where.push(sql`${minPrice} >= ${q.min}`);
  if (q.max != null) where.push(sql`${minPrice} <= ${q.max}`);
  if (q.sizes?.length) where.push(sql`exists (select 1 from variants v where v.product_id = ${schema.products.id} and v.is_active and v.label in ${q.sizes})`);
  if (q.inStock) where.push(sql`${totalStock} > 0`);
  // only products that have at least one active variant
  where.push(sql`exists (select 1 from variants v where v.product_id = ${schema.products.id} and v.is_active)`);

  const order = (() => {
    switch (q.sort) {
      case 'price-asc': return [asc(minPrice)];
      case 'price-desc': return [desc(minPrice)];
      case 'newest': return [desc(schema.products.createdAt)];
      case 'name': return [asc(schema.products.name)];
      case 'rating': return [sql`${avgRating} desc nulls last`, desc(reviewCount)];
      default: return [desc(schema.products.isFeatured), sql`${totalStock} > 0 desc`, asc(schema.products.name)];
    }
  })();

  const base = db
    .select({ id: schema.products.id })
    .from(schema.products)
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(...where));
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(base.as('b'));
  const idsRows = await base.orderBy(...order).limit(perPage).offset((page - 1) * perPage);
  const items = await hydrateCards(idsRows.map((r) => r.id));
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function hydrateCards(ids: string[], userId?: string | null): Promise<CardProduct[]> {
  if (!ids.length) return [];
  const rows = await db
    .select({
      id: schema.products.id, slug: schema.products.slug, name: schema.products.name, kind: schema.products.kind,
      isDemo: schema.products.isDemo, categoryName: schema.categories.name, categorySlug: schema.categories.slug,
      rating: avgRating, reviewCount,
    })
    .from(schema.products)
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(inArray(schema.products.id, ids));
  const vs = await db
    .select({ id: schema.variants.id, productId: schema.variants.productId, label: schema.variants.label, price: schema.variants.price, mrp: schema.variants.mrp, stock: schema.variants.stock })
    .from(schema.variants)
    .where(and(inArray(schema.variants.productId, ids), eq(schema.variants.isActive, true)))
    .orderBy(asc(schema.variants.sortOrder), asc(schema.variants.weightGrams));
  const imgs = await db.select().from(schema.productImages).where(inArray(schema.productImages.productId, ids)).orderBy(asc(schema.productImages.sortOrder));
  const wish = userId
    ? new Set((await db.select({ p: schema.wishlistItems.productId }).from(schema.wishlistItems).where(and(eq(schema.wishlistItems.userId, userId), inArray(schema.wishlistItems.productId, ids)))).map((w) => w.p))
    : null;
  const byId = new Map(rows.map((r) => {
    const img = imgs.find((i) => i.productId === r.id);
    return [r.id, {
      ...r, imageUrl: img?.url ?? null, imageAlt: img?.alt ?? null,
      variants: vs.filter((v) => v.productId === r.id).map(({ productId: _p, ...v }) => v),
      inWishlist: wish ? wish.has(r.id) : undefined,
    } satisfies CardProduct];
  }));
  return ids.map((id) => byId.get(id)).filter(Boolean) as CardProduct[];
}

export const getCategories = cache(async () =>
  db.query.categories.findMany({ where: eq(schema.categories.isActive, true), orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.name)] }),
);

export const getCategoryCounts = cache(async () => {
  const rows = await db
    .select({ categoryId: schema.products.categoryId, n: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.status, 'PUBLISHED'))
    .groupBy(schema.products.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.n]));
});

export const getProductBySlug = cache(async (slug: string) => {
  const p = await db.query.products.findFirst({
    where: eq(schema.products.slug, slug),
    with: {
      category: true,
      images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
      variants: { where: (v, { eq }) => eq(v.isActive, true), orderBy: (v, { asc }) => [asc(v.sortOrder), asc(v.weightGrams)] },
    },
  });
  if (!p || p.status !== 'PUBLISHED') return null;
  return p;
});

export async function getProductReviews(productId: string) {
  const list = await db.query.reviews.findMany({
    where: and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, 'APPROVED')),
    with: { user: { columns: { name: true } } },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 50,
  });
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : null;
  return { list, avg, count: list.length };
}

/** Earliest upcoming best-before among batches with stock, per variant (for display). */
export async function getVariantBatchInfo(variantIds: string[]) {
  if (!variantIds.length) return new Map<string, { batchNumber: string; mfgDate: Date | null; bestBefore: Date | null }>();
  const rows = await db
    .select()
    .from(schema.batches)
    .where(and(inArray(schema.batches.variantId, variantIds), sql`${schema.batches.quantity} > 0`))
    .orderBy(sql`${schema.batches.bestBefore} asc nulls last`);
  const m = new Map<string, { batchNumber: string; mfgDate: Date | null; bestBefore: Date | null }>();
  for (const r of rows) if (!m.has(r.variantId)) m.set(r.variantId, { batchNumber: r.batchNumber, mfgDate: r.mfgDate, bestBefore: r.bestBefore });
  return m;
}

export async function getAvailableSizes(categorySlug?: string | null) {
  const rows = await db
    .selectDistinct({ label: schema.variants.label, w: schema.variants.weightGrams })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.variants.productId, schema.products.id))
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.variants.isActive, true), eq(schema.products.status, 'PUBLISHED'), categorySlug ? eq(schema.categories.slug, categorySlug) : undefined))
    .orderBy(asc(schema.variants.weightGrams));
  return [...new Set(rows.map((r) => r.label))];
}

export async function suggest(q: string) {
  const term = `%${q.trim().replace(/[%_]/g, '')}%`;
  if (q.trim().length < 2) return [];
  const rows = await db
    .select({ slug: schema.products.slug, name: schema.products.name, category: schema.categories.name, price: minPrice, id: schema.products.id })
    .from(schema.products)
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.products.status, 'PUBLISHED'), or(ilike(schema.products.name, term), sql`array_to_string(${schema.products.tags}, ' ') ilike ${term}`)))
    .orderBy(sql`position(lower(${q.trim()}) in lower(${schema.products.name})) = 1 desc`, asc(schema.products.name))
    .limit(8);
  const imgs = rows.length ? await db.select().from(schema.productImages).where(inArray(schema.productImages.productId, rows.map((r) => r.id))) : [];
  return rows.map((r) => ({ ...r, imageUrl: imgs.find((i) => i.productId === r.id)?.url ?? null }));
}
