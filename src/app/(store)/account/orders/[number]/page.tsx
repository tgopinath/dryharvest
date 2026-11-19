import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { getOrderForViewer, PENDING_PAYMENT_TTL_MIN } from '@/server/orders';
import { razorpayConfigured } from '@/server/razorpay';
import { Alert, buttonClass } from '@/components/ui';
import { StatusBadge, PaymentBadge, OrderProgress } from '@/components/store/OrderBits';
import { OrderRequestForm, RetryPayment } from '@/components/store/AccountForms';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string; payment?: string; verify?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  const u = await requireUser(`/account/orders/${number}`);
  const o = await getOrderForViewer(number, u);
  if (!o) notFound();
  const a = o.shippingAddress;
  const openReq = o.requests.find((r) => r.status === 'OPEN');
  const stale = Date.now() - o.createdAt.getTime() > PENDING_PAYMENT_TTL_MIN * 60_000;

  return (
    <div className="space-y-6">
      {sp.placed && o.status !== 'PENDING_PAYMENT' && <Alert tone="success"><b>Thank you! Your order is placed.</b> We’ve received order {o.number}{o.paymentMethod === 'COD' ? ' — pay on delivery.' : ' and your payment.'}</Alert>}
      {sp.verify && o.paymentStatus === 'PENDING' && <Alert tone="warn">We’re confirming your payment with the bank. This page will update once it’s confirmed — don’t pay twice.</Alert>}
      {sp.payment === 'cancelled' && o.paymentStatus === 'PENDING' && <Alert tone="warn">Payment was not completed. You can try again below within {PENDING_PAYMENT_TTL_MIN} minutes of placing the order.</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl">Order {o.number}</h2>
          <p className="text-sm text-brand-ink/60">Placed {formatDate(o.createdAt, true)}</p>
        </div>
        <div className="flex items-center gap-2"><StatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /></div>
      </div>

      {o.status === 'PENDING_PAYMENT' && o.paymentMethod === 'RAZORPAY' && razorpayConfigured() && !stale && <RetryPayment number={o.number} />}

      <div className="rounded-3xl border border-brand-ink/10 bg-white p-6">
        <OrderProgress status={o.status} events={o.events} />
        {o.trackingNumber && (
          <p className="mt-5 text-sm">Shipped with <b>{o.courier ?? 'courier'}</b> · Tracking no. <b>{o.trackingNumber}</b>{o.trackingUrl && <> · <a className="font-semibold text-brand underline" href={o.trackingUrl} target="_blank" rel="noopener noreferrer">Track shipment</a></>}</p>
        )}
        {o.status === 'CANCELLED' && <p className="text-sm text-brand-ink/70">This order was cancelled. {o.paymentStatus === 'REFUNDED' ? 'A refund was issued to your original payment method (allow 5–7 business days).' : ''}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-brand-ink/10 bg-white p-6">
          <h3 className="text-xl">Items</h3>
          <ul className="mt-4 divide-y divide-brand-ink/10 text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-3">
                <span>{i.productSlug ? <Link href={`/product/${i.productSlug}`} className="font-semibold hover:text-brand">{i.productName}</Link> : <b>{i.productName}</b>}<span className="block text-brand-ink/60">{i.variantLabel} · {formatINR(i.unitPrice)} × {i.quantity}</span></span>
                <span className="font-semibold">{formatINR(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-brand-ink/10 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between text-brand"><dt>Discount {o.couponCode}</dt><dd>−{formatINR(o.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping{o.paymentMethod === 'COD' ? ' & COD fee' : ''}</dt><dd>{o.shipping ? formatINR(o.shipping) : 'Free'}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
            {o.refunds.length > 0 && <div className="flex justify-between text-brand-ink/70"><dt>Refunded</dt><dd>{formatINR(o.refunds.reduce((s, r) => s + r.amount, 0))}</dd></div>}
          </dl>
        </section>
        <aside className="space-y-6">
          <section className="rounded-3xl border border-brand-ink/10 bg-white p-6 text-sm">
            <h3 className="text-xl">Delivery to</h3>
            <p className="mt-3 font-semibold">{a.fullName}</p>
            <p className="text-brand-ink/70">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            <p className="mt-3 text-brand-ink/70">Payment: {o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'}</p>
          </section>
          <div className="flex flex-wrap gap-2">
            {o.paymentStatus !== 'PENDING' || o.paymentMethod === 'COD' ? <Link href={`/invoice/${o.number}`} className={buttonClass('outline')} target="_blank">View invoice</Link> : null}
            <Link href="/contact" className={buttonClass('ghost')}>Need help?</Link>
          </div>
          {openReq ? <Alert tone="info">Your {openReq.type.toLowerCase()} request is being reviewed.</Alert> : (
            <>
              {['PENDING_PAYMENT', 'PLACED', 'CONFIRMED'].includes(o.status) && <OrderRequestForm number={o.number} mode="cancel" />}
              {o.status === 'PACKED' && <OrderRequestForm number={o.number} mode="cancel-request" />}
              {o.status === 'DELIVERED' && <OrderRequestForm number={o.number} mode="return" />}
            </>
          )}
        </aside>
      </div>

      <section className="rounded-3xl border border-brand-ink/10 bg-white p-6">
        <h3 className="text-xl">Order history</h3>
        <ol className="mt-4 space-y-3 border-l-2 border-brand-pale pl-5 text-sm">
          {o.events.map((e) => <li key={e.id}><p>{e.message}</p><p className="text-xs text-brand-ink/50">{formatDate(e.createdAt, true)}</p></li>)}
        </ol>
      </section>
    </div>
  );
}
