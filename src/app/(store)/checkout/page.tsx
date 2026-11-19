import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/server/auth';
import { getCart } from '@/server/cart';
import { computeTotals } from '@/server/pricing';
import { getSetting } from '@/server/settings';
import { razorpayConfigured } from '@/server/razorpay';
import { CheckoutForm } from '@/components/store/CheckoutForm';
import { Summary } from '@/components/store/Summary';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const user = await requireUser('/checkout');
  const cart = await getCart();
  if (!cart.lines.length) redirect('/cart');
  if (cart.lines.some((l) => l.problem)) redirect('/cart');
  const [t, addresses, ship] = await Promise.all([
    computeTotals(cart.lines, { couponCode: cart.couponCode, userId: user.id, email: user.email }),
    db.query.addresses.findMany({ where: eq(schema.addresses.userId, user.id), orderBy: [desc(schema.addresses.isDefault), desc(schema.addresses.createdAt)] }),
    getSetting('shipping'),
  ]);
  const codAllowed = ship.codEnabled && (ship.codMaxOrder == null || t.total + ship.codFee <= ship.codMaxOrder);
  return (
    <div className="container-x py-10">
      <h1 className="mb-6 text-4xl text-brand-deep">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm addresses={addresses} razorpayEnabled={razorpayConfigured()} codEnabled={codAllowed} codFee={ship.codFee} total={t.total} />
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Summary t={t}>
            <ul className="space-y-2 border-t border-brand-ink/10 pt-4 text-sm">
              {cart.lines.map((l) => <li key={l.variantId} className="flex justify-between gap-3"><span className="text-brand-ink/75">{l.productName} · {l.label} × {l.quantity}</span><span>{formatINR(l.price * l.quantity)}</span></li>)}
            </ul>
          </Summary>
        </aside>
      </div>
    </div>
  );
}
