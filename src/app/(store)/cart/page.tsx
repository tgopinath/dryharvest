import type { Metadata } from 'next';
import Link from 'next/link';
import { getCart } from '@/server/cart';
import { computeTotals } from '@/server/pricing';
import { getCurrentUser } from '@/server/auth';
import { CartLines, CouponBox } from '@/components/store/CartView';
import { Summary } from '@/components/store/Summary';
import { EmptyState, buttonClass, Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);
  if (!cart.lines.length) {
    return <div className="container-x py-14"><h1 className="mb-6 text-4xl text-brand-deep">Your cart</h1><EmptyState title="Your cart is empty" text="Add a few favourites — dried mango, moringa powder or a vathal combo." action={<Link href="/shop" className={buttonClass()}>Start shopping</Link>} /></div>;
  }
  const t = await computeTotals(cart.lines, { couponCode: cart.couponCode, userId: user?.id, email: user?.email });
  const blocked = cart.lines.some((l) => l.problem);
  return (
    <div className="container-x py-10">
      <h1 className="mb-6 text-4xl text-brand-deep">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {blocked && <Alert tone="warn">Some items need attention before you can check out.</Alert>}
          <CartLines lines={cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, label: l.label, price: l.price, mrp: l.mrp, stock: l.stock, productName: l.productName, productSlug: l.productSlug, imageUrl: l.imageUrl, problem: l.problem, kind: l.kind }))} />
          <Link href="/shop" className="inline-block text-sm font-semibold text-brand underline">Continue shopping</Link>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Summary t={t}>
            <CouponBox applied={t.coupon} error={t.couponError} />
            {blocked ? <span className={buttonClass('primary', 'lg', 'w-full pointer-events-none opacity-50')} aria-disabled>Proceed to checkout</span>
              : <Link href="/checkout" className={buttonClass('primary', 'lg', 'w-full')}>Proceed to checkout</Link>}
          </Summary>
        </aside>
      </div>
    </div>
  );
}
