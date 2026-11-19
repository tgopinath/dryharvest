import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/server/auth';
import { hydrateCards } from '@/server/catalog';
import { ProductGrid } from '@/components/store/ProductCard';
import { EmptyState, buttonClass } from '@/components/ui';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage() {
  const u = await requireUser('/account/wishlist');
  const rows = await db.select({ id: schema.wishlistItems.productId }).from(schema.wishlistItems).innerJoin(schema.products, eq(schema.products.id, schema.wishlistItems.productId)).where(eq(schema.wishlistItems.userId, u.id)).orderBy(desc(schema.wishlistItems.createdAt));
  const items = (await hydrateCards(rows.map((r) => r.id), u.id));
  if (!items.length) return <EmptyState title="Your wishlist is empty" text="Tap the heart on any product to save it for later." action={<Link href="/shop" className={buttonClass()}>Browse products</Link>} />;
  return <ProductGrid items={items} cols={3} />;
}
