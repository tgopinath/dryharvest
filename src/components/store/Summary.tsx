import { formatINR } from '@/lib/utils';
import type { Totals } from '@/server/pricing';

export function Summary({ t, children, title = 'Order summary' }: { t: Totals; children?: React.ReactNode; title?: string }) {
  const savings = t.mrpTotal - t.subtotal + t.discount;
  return (
    <div className="rounded-3xl border border-brand-ink/10 bg-white p-6">
      <h2 className="text-2xl">{title}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(t.subtotal)}</dd></div>
        {t.discount > 0 && <div className="flex justify-between text-brand"><dt>Coupon {t.coupon?.code}</dt><dd>−{formatINR(t.discount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{t.shipping === 0 ? 'Free' : formatINR(t.shipping)}</dd></div>
        {t.codFee > 0 && <div className="flex justify-between"><dt>Cash on delivery fee</dt><dd>{formatINR(t.codFee)}</dd></div>}
        <div className="flex justify-between border-t border-brand-ink/10 pt-3 text-base font-bold"><dt>Total</dt><dd>{formatINR(t.total)}</dd></div>
        <p className="text-xs text-brand-ink/55">Inclusive of all taxes</p>
        {savings > 0 && <p className="rounded-lg bg-brand-pale px-3 py-2 text-xs font-semibold text-brand-deep">You save {formatINR(savings)} on MRP</p>}
        {t.freeShippingGap != null && t.freeShippingGap > 0 && <p className="text-xs text-brand-ink/65">Add {formatINR(t.freeShippingGap)} more for free shipping.</p>}
      </dl>
      {children && <div className="mt-5 space-y-4">{children}</div>}
    </div>
  );
}
