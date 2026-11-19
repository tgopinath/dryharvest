'use server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getCurrentUser } from '@/server/auth';
import { getCartId } from '@/server/cart';
import { createOrderFromCart } from '@/server/orders';
import { addressSchema, phoneSchema, fieldErrors } from '@/lib/validation';
import { rateLimit } from '@/server/ratelimit';
import type { ShippingAddress } from '@/db/schema';

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; razorpay: null }
  | { ok: true; orderNumber: string; razorpay: { orderId: string; amount: number; keyId: string; name: string; email: string; phone: string } }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

export async function placeOrder(input: {
  addressId?: string | null; address?: Record<string, string> | null; saveAddress?: boolean;
  paymentMethod: 'RAZORPAY' | 'COD'; notes?: string;
}): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in to place your order.' };
  if (!(await rateLimit(`checkout:${user.id}`, 10, 10 * 60_000))) return { ok: false, error: 'Too many attempts. Please wait a few minutes.' };
  if (!['RAZORPAY', 'COD'].includes(input.paymentMethod)) return { ok: false, error: 'Choose a payment method.' };

  let address: ShippingAddress;
  if (input.addressId) {
    const a = await db.query.addresses.findFirst({ where: eq(schema.addresses.id, input.addressId) });
    if (!a || a.userId !== user.id) return { ok: false, error: 'Choose a delivery address.' };
    address = { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark, city: a.city, state: a.state, pincode: a.pincode };
  } else {
    const parsed = addressSchema.safeParse(input.address ?? {});
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    address = parsed.data;
    if (input.saveAddress) {
      const count = await db.$count(schema.addresses, eq(schema.addresses.userId, user.id));
      await db.insert(schema.addresses).values({ ...parsed.data, userId: user.id, isDefault: count === 0 });
    }
  }
  const phone = phoneSchema.safeParse(address.phone);
  if (!phone.success) return { ok: false, error: 'The delivery phone number is not valid.' };

  const cartId = await getCartId(false);
  if (!cartId) return { ok: false, error: 'Your cart is empty.' };
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId) });
  try {
    const { order, razorpay } = await createOrderFromCart({
      cartId, userId: user.id, email: user.email, phone: address.phone, address,
      paymentMethod: input.paymentMethod, couponCode: cart?.couponCode ?? null, notes: input.notes?.slice(0, 500) || null,
    });
    if (!razorpay) return { ok: true, orderNumber: order.number, razorpay: null };
    return { ok: true, orderNumber: order.number, razorpay: { ...razorpay, name: address.fullName, email: user.email, phone: address.phone } };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
