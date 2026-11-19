import 'server-only';
import { cookies } from 'next/headers';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getCurrentUser } from './auth';

export const CART_COOKIE = 'dh_cart';
export const MAX_QTY_PER_LINE = 20;

/** Returns the cart id for the current visitor (user cart if logged in, else cookie cart). */
export async function getCartId(create = false): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const existing = await db.query.carts.findFirst({ where: eq(schema.carts.userId, user.id) });
    if (existing) return existing.id;
    if (!create) return null;
    const [c] = await db.insert(schema.carts).values({ userId: user.id }).returning({ id: schema.carts.id });
    return c.id;
  }
  const jar = await cookies();
  const cookieId = jar.get(CART_COOKIE)?.value;
  if (cookieId) {
    const c = await db.query.carts.findFirst({ where: eq(schema.carts.id, cookieId) });
    if (c && !c.userId) return c.id;
  }
  if (!create) return null;
  const [c] = await db.insert(schema.carts).values({}).returning({ id: schema.carts.id });
  jar.set(CART_COOKIE, c.id, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 60,
  });
  return c.id;
}

/** Called right after login/registration: merge the guest cart into the user's cart. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(CART_COOKIE)?.value;
  if (!guestId) return;
  const guest = await db.query.carts.findFirst({ where: eq(schema.carts.id, guestId), with: { items: true } });
  jar.delete(CART_COOKIE);
  if (!guest || guest.userId) return;
  const userCart = await db.query.carts.findFirst({ where: eq(schema.carts.userId, userId) });
  if (!userCart) {
    await db.update(schema.carts).set({ userId }).where(eq(schema.carts.id, guest.id));
    return;
  }
  for (const it of guest.items) {
    await db
      .insert(schema.cartItems)
      .values({ cartId: userCart.id, variantId: it.variantId, quantity: it.quantity })
      .onConflictDoNothing();
  }
  if (guest.couponCode && !userCart.couponCode) {
    await db.update(schema.carts).set({ couponCode: guest.couponCode }).where(eq(schema.carts.id, userCart.id));
  }
  await db.delete(schema.carts).where(eq(schema.carts.id, guest.id));
}

export type CartLine = {
  id: string; variantId: string; quantity: number;
  sku: string; label: string; price: number; mrp: number; stock: number; isActive: boolean;
  productId: string; productName: string; productSlug: string; kind: 'FOOD' | 'PET' | 'DECOR';
  status: string; imageUrl: string | null; categoryName: string; gstRate: number | null; hsnCode: string | null;
  problem: string | null;
};

export async function loadCartLines(cartId: string): Promise<CartLine[]> {
  const rows = await db
    .select({
      id: schema.cartItems.id, variantId: schema.cartItems.variantId, quantity: schema.cartItems.quantity,
      sku: schema.variants.sku, label: schema.variants.label, price: schema.variants.price, mrp: schema.variants.mrp,
      stock: schema.variants.stock, isActive: schema.variants.isActive,
      productId: schema.products.id, productName: schema.products.name, productSlug: schema.products.slug,
      kind: schema.products.kind, status: schema.products.status, gstRate: schema.products.gstRate,
      hsnCode: schema.products.hsnCode, categoryName: schema.categories.name,
    })
    .from(schema.cartItems)
    .innerJoin(schema.variants, eq(schema.cartItems.variantId, schema.variants.id))
    .innerJoin(schema.products, eq(schema.variants.productId, schema.products.id))
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.cartItems.cartId, cartId))
    .orderBy(asc(schema.products.name));
  const ids = [...new Set(rows.map((r) => r.productId))];
  const imgs = ids.length
    ? await db.select().from(schema.productImages).where(inArray(schema.productImages.productId, ids)).orderBy(asc(schema.productImages.sortOrder))
    : [];
  return rows.map((r) => {
    let problem: string | null = null;
    if (r.status !== 'PUBLISHED' || !r.isActive) problem = 'No longer available';
    else if (r.stock <= 0) problem = 'Out of stock';
    else if (r.quantity > r.stock) problem = `Only ${r.stock} left`;
    return { ...r, imageUrl: imgs.find((i) => i.productId === r.productId)?.url ?? null, problem };
  });
}

export async function getCart() {
  const cartId = await getCartId(false);
  if (!cartId) return { cartId: null, couponCode: null as string | null, lines: [] as CartLine[] };
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId) });
  return { cartId, couponCode: cart?.couponCode ?? null, lines: await loadCartLines(cartId) };
}

export async function getCartCount() {
  const cartId = await getCartId(false);
  if (!cartId) return 0;
  const items = await db.select({ q: schema.cartItems.quantity }).from(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  return items.reduce((s, i) => s + i.q, 0);
}

export async function setLineQuantity(variantId: string, quantity: number, mode: 'set' | 'add') {
  const variant = await db.query.variants.findFirst({
    where: and(eq(schema.variants.id, variantId), eq(schema.variants.isActive, true)),
    with: { product: { columns: { status: true } } },
  });
  if (!variant || variant.product.status !== 'PUBLISHED') throw new Error('This item is not available.');
  const cartId = (await getCartId(true))!;
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)),
  });
  let qty = mode === 'add' ? (existing?.quantity ?? 0) + quantity : quantity;
  qty = Math.min(qty, MAX_QTY_PER_LINE, variant.stock);
  if (qty <= 0) {
    if (existing) await db.delete(schema.cartItems).where(eq(schema.cartItems.id, existing.id));
    if (variant.stock <= 0) throw new Error('Sorry, this pack size is out of stock.');
    return;
  }
  if (existing) await db.update(schema.cartItems).set({ quantity: qty }).where(eq(schema.cartItems.id, existing.id));
  else await db.insert(schema.cartItems).values({ cartId, variantId, quantity: qty });
}
