import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { getOrderForViewer } from '@/server/orders';
import { getSetting } from '@/server/settings';
import { formatDate, formatINR } from '@/lib/utils';
import { PrintButton } from './PrintButton';

export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };

/** Tax invoice. Prices are GST-inclusive; tax is back-calculated per line when a GST rate is set on the product. */
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const u = await requireUser(`/invoice/${number}`);
  const o = await getOrderForViewer(number, u);
  if (!o || (o.paymentStatus === 'PENDING' && o.paymentMethod !== 'COD')) notFound();
  const store = await getSetting('store');
  const a = o.shippingAddress;
  const intra = !!store.state && a.state.toLowerCase() === store.state.toLowerCase();
  const rows = o.items.map((i) => {
    const gross = i.unitPrice * i.quantity;
    const rate = i.gstRate ?? 0;
    const taxable = rate ? Math.round((gross * 100) / (100 + rate)) : gross;
    return { ...i, gross, rate, taxable, tax: gross - taxable };
  });
  const taxTotal = rows.reduce((s, r) => s + r.tax, 0);
  const registered = !!store.gstin;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-sm text-brand-ink print:p-0">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <header className="flex flex-wrap justify-between gap-6 border-b border-brand-ink/15 pb-6">
        <div>
          <p className="font-display text-2xl text-brand-deep">{store.legalName || 'NutriDry Naturals'}</p>
          {store.address && <p className="whitespace-pre-line text-brand-ink/70">{store.address}</p>}
          {store.gstin && <p>GSTIN: {store.gstin}</p>}
          {store.fssaiLicense && <p>FSSAI Lic. No.: {store.fssaiLicense}</p>}
          {store.email && <p>{store.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{registered ? 'Tax Invoice' : 'Invoice'}</p>
          <p>Invoice no.: INV-{o.number}</p>
          <p>Order no.: {o.number}</p>
          <p>Date: {formatDate(o.createdAt)}</p>
          <p>Payment: {o.paymentMethod === 'COD' ? 'Cash on delivery' : `Online${o.razorpayPaymentId ? ` (${o.razorpayPaymentId})` : ''}`}</p>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-6 border-b border-brand-ink/15 py-5">
        <div><p className="font-bold">Bill / ship to</p><p>{a.fullName}</p><p className="text-brand-ink/70">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p></div>
        <div><p className="font-bold">Place of supply</p><p>{a.state}</p></div>
      </section>
      <table className="mt-5 w-full border-collapse">
        <thead><tr className="border-b border-brand-ink/20 text-left"><th className="py-2">Item</th><th>HSN</th><th className="text-right">Qty</th><th className="text-right">Rate</th>{registered && <th className="text-right">Taxable</th>}{registered && <th className="text-right">GST</th>}<th className="text-right">Amount</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-brand-ink/10 align-top">
              <td className="py-2">{r.productName}<br /><span className="text-xs text-brand-ink/60">{r.variantLabel} · {r.sku}</span></td>
              <td>{r.hsnCode ?? '—'}</td><td className="text-right">{r.quantity}</td><td className="text-right">{formatINR(r.unitPrice)}</td>
              {registered && <td className="text-right">{formatINR(r.taxable)}</td>}
              {registered && <td className="text-right">{r.rate ? `${r.rate}%` : '—'}<br /><span className="text-xs">{formatINR(r.tax)}</span></td>}
              <td className="text-right">{formatINR(r.gross)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 w-72 space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
        {o.discount > 0 && <div className="flex justify-between"><dt>Discount ({o.couponCode})</dt><dd>−{formatINR(o.discount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping{o.paymentMethod === 'COD' ? ' & COD' : ''}</dt><dd>{formatINR(o.shipping)}</dd></div>
        {registered && taxTotal > 0 && (intra
          ? <><div className="flex justify-between text-brand-ink/70"><dt>incl. CGST</dt><dd>{formatINR(Math.floor(taxTotal / 2))}</dd></div><div className="flex justify-between text-brand-ink/70"><dt>incl. SGST</dt><dd>{formatINR(Math.ceil(taxTotal / 2))}</dd></div></>
          : <div className="flex justify-between text-brand-ink/70"><dt>incl. IGST</dt><dd>{formatINR(taxTotal)}</dd></div>)}
        <div className="flex justify-between border-t border-brand-ink/20 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
      </dl>
      <footer className="mt-10 border-t border-brand-ink/15 pt-4 text-xs text-brand-ink/60">
        <p>All prices are inclusive of applicable taxes. {registered ? 'Item-level tax is shown where a GST rate is configured; discounts are applied at order level.' : ''}</p>
        <p>This is a computer-generated invoice.</p>
      </footer>
    </main>
  );
}
