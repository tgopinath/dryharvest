'use server';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getCartId, setLineQuantity, getCart } from '@/server/cart';
import { validateCoupon } from '@/server/pricing';
import { getCurrentUser } from '@/server/auth';

type R = { ok: boolean; error?: string; message?: string };

export async function addToCart(variantId: string, quantity = 1): Promise<R> {
  try {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { ok: false, error: 'Choose a quantity between 1 and 20.' };
    await setLineQuantity(variantId, quantity, 'add');
    revalidatePath('/', 'layout');
    return { ok: true, message: 'Added to cart' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateCartQuantity(variantId: string, quantity: number): Promise<R> {
  try {
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) return { ok: false, error: 'Invalid quantity.' };
    await setLineQuantity(variantId, quantity, 'set');
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeFromCart(variantId: string): Promise<R> {
  const cartId = await getCartId(false);
  if (cartId) await db.delete(schema.cartItems).where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)));
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function applyCoupon(code: string): Promise<R> {
  const clean = code.trim().toUpperCase().slice(0, 40);
  if (!clean) return { ok: false, error: 'Enter a coupon code.' };
  const cart = await getCart();
  if (!cart.cartId || !cart.lines.length) return { ok: false, error: 'Your cart is empty.' };
  const subtotal = cart.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const user = await getCurrentUser();
  const r = await validateCoupon(clean, subtotal, user?.id ?? null, user?.email);
  if (!r.ok) return { ok: false, error: r.error };
  await db.update(schema.carts).set({ couponCode: r.coupon.code }).where(eq(schema.carts.id, cart.cartId));
  revalidatePath('/', 'layout');
  return { ok: true, message: `${r.coupon.code} applied` };
}

export async function removeCoupon(): Promise<R> {
  const cartId = await getCartId(false);
  if (cartId) await db.update(schema.carts).set({ couponCode: null }).where(eq(schema.carts.id, cartId));
  revalidatePath('/', 'layout');
  return { ok: true };
}
