'use server';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getCurrentUser } from '@/server/auth';

export async function toggleWishlist(productId: string): Promise<{ ok: boolean; inWishlist?: boolean; needsLogin?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true };
  const where = and(eq(schema.wishlistItems.userId, user.id), eq(schema.wishlistItems.productId, productId));
  const existing = await db.query.wishlistItems.findFirst({ where });
  if (existing) await db.delete(schema.wishlistItems).where(where);
  else {
    const p = await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { id: true } });
    if (!p) return { ok: false };
    await db.insert(schema.wishlistItems).values({ userId: user.id, productId }).onConflictDoNothing();
  }
  revalidatePath('/account/wishlist');
  return { ok: true, inWishlist: !existing };
}
