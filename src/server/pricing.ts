import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getSetting } from './settings';
import type { CartLine } from './cart';

export type Totals = {
  subtotal: number; mrpTotal: number; discount: number; shipping: number; codFee: number; total: number;
  coupon: { code: string; description: string | null } | null; couponError: string | null;
  freeShippingGap: number | null;
};

export async function validateCoupon(code: string, subtotal: number, userId: string | null, email?: string | null) {
  const c = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, code.trim().toUpperCase()) });
  const now = new Date();
  if (!c || !c.isActive) return { ok: false as const, error: 'This coupon code is not valid.' };
  if (c.startsAt && c.startsAt > now) return { ok: false as const, error: 'This coupon is not active yet.' };
  if (c.endsAt && c.endsAt < now) return { ok: false as const, error: 'This coupon has expired.' };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false as const, error: 'This coupon has reached its usage limit.' };
  if (subtotal < c.minOrder) return { ok: false as const, error: `Add items worth ₹${((c.minOrder - subtotal) / 100).toFixed(0)} more to use this coupon.` };
  if (c.perUserLimit != null && (userId || email)) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.couponCode, c.code),
        inArray(schema.orders.paymentStatus, ['PAID', 'PENDING']),
        inArray(schema.orders.status, ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED']),
        userId ? eq(schema.orders.userId, userId) : eq(schema.orders.email, email!),
      ));
    if (n >= c.perUserLimit) return { ok: false as const, error: 'You have already used this coupon.' };
  }
  let discount = c.type === 'PERCENT' ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true as const, coupon: c, discount };
}

export async function computeTotals(
  lines: Pick<CartLine, 'price' | 'mrp' | 'quantity'>[],
  opts: { couponCode?: string | null; userId?: string | null; email?: string | null; paymentMethod?: 'RAZORPAY' | 'COD' },
): Promise<Totals> {
  const ship = await getSetting('shipping');
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const mrpTotal = lines.reduce((s, l) => s + Math.max(l.mrp, l.price) * l.quantity, 0);
  let discount = 0;
  let coupon: Totals['coupon'] = null;
  let couponError: string | null = null;
  if (opts.couponCode && subtotal > 0) {
    const r = await validateCoupon(opts.couponCode, subtotal, opts.userId ?? null, opts.email);
    if (r.ok) { discount = r.discount; coupon = { code: r.coupon.code, description: r.coupon.description }; }
    else couponError = r.error;
  }
  const afterDiscount = subtotal - discount;
  const free = ship.freeAbove != null && afterDiscount >= ship.freeAbove;
  const shipping = subtotal === 0 || free ? 0 : ship.flatRate;
  const codFee = opts.paymentMethod === 'COD' ? ship.codFee : 0;
  return {
    subtotal, mrpTotal, discount, shipping, codFee, total: afterDiscount + shipping + codFee, coupon, couponError,
    freeShippingGap: ship.freeAbove != null && !free && subtotal > 0 ? ship.freeAbove - afterDiscount : null,
  };
}

export async function isPincodeServiceable(pincode: string) {
  const ship = await getSetting('shipping');
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return false;
  if (!ship.serviceablePincodePrefixes.length) return true;
  return ship.serviceablePincodePrefixes.some((p) => pincode.startsWith(p));
}
