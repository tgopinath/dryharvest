import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, can } from '@/server/auth';
import { allowedNextStatuses } from '@/server/orders';
import { AdminHeader, Panel } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { StatusBadge, PaymentBadge } from '@/components/store/OrderBits';
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { formatDate, formatINR, ORDER_STATUS_LABEL, paiseToRupees } from '@/lib/utils';
import { changeStatus, saveTracking, addNote, refund } from '../actions';

export const metadata = { title: 'Order' };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('orders:view');
  const { id } = await params;
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, events: { orderBy: (e, { desc }) => [desc(e.createdAt)] }, refunds: true, requests: true, user: { columns: { id: true, name: true, email: true } } },
  });
  if (!o) notFound();
  const a = o.shippingAddress;
  const next = allowedNextStatuses(o.status).filter((s) => s !== 'CANCELLED' || can(user.role, 'orders:refund'));
  const refunded = o.refunds.reduce((s, r) => s + r.amount, 0);
  const canEdit = can(user.role, 'orders:edit');
  const canRefund = can(user.role, 'orders:refund') && ['PAID', 'PARTIALLY_REFUNDED'].includes(o.paymentStatus);
  const lateUnpaid = o.status === 'CANCELLED' && o.paymentStatus === 'PAID';

  return (
    <>
      <AdminHeader title={`Order ${o.number}`} text={`Placed ${formatDate(o.createdAt, true)}`} actions={<><StatusBadge status={o.status} /><PaymentBadge status={o.paymentStatus} /><Link href={`/invoice/${o.number}`} target="_blank" className="rounded-full border border-brand-ink/15 bg-white px-4 py-1.5 text-sm font-semibold">Invoice / packing slip</Link></>} />
      {lateUnpaid && <Alert tone="warn" className="mb-4">This order was cancelled (payment timed out) but a payment was later received. Refund it from the panel below, or contact the customer.</Alert>}
      {o.requests.filter((r) => r.status === 'OPEN').map((r) => <Alert key={r.id} tone="warn" className="mb-4">Customer {r.type === 'CANCEL' ? 'cancellation' : 'return'} request: “{r.reason}”. <Link href="/admin/requests" className="font-semibold underline">Review requests</Link></Alert>)}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-brand-ink/55"><th className="pb-2">Product</th><th>SKU</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-brand-ink/6">
                {o.items.map((i) => <tr key={i.id}><td className="py-2">{i.productName}<span className="block text-xs text-brand-ink/55">{i.variantLabel}</span></td><td>{i.sku}</td><td className="text-right">{formatINR(i.unitPrice)}</td><td className="text-right">{i.quantity}</td><td className="text-right font-semibold">{formatINR(i.unitPrice * i.quantity)}</td></tr>)}
              </tbody>
            </table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt>Discount ({o.couponCode})</dt><dd>−{formatINR(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping{o.paymentMethod === 'COD' ? ' + COD' : ''}</dt><dd>{formatINR(o.shipping)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-red-700"><dt>Refunded</dt><dd>−{formatINR(refunded)}</dd></div>}
            </dl>
          </Panel>

          <Panel title="Timeline & notes">
            {canEdit && (
              <ActionForm action={addNote} className="mb-5 flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <Input name="note" placeholder="Add an internal note (visible to the customer in order history)" aria-label="Note" />
                <Button variant="outline">Add</Button>
              </ActionForm>
            )}
            <ol className="space-y-3 border-l-2 border-brand-pale pl-5 text-sm">
              {o.events.map((e) => <li key={e.id}><p>{e.message}</p><p className="text-xs text-brand-ink/50">{formatDate(e.createdAt, true)}{e.status ? ` · ${ORDER_STATUS_LABEL[e.status]}` : ''}</p></li>)}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          {canEdit && next.length > 0 && (
            <Panel title="Fulfilment">
              <ActionForm action={changeStatus} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Move order to" htmlFor="st"><Select id="st" name="status">{next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</Select></Field>
                <Field label="Note (optional)" htmlFor="stn"><Input id="stn" name="note" /></Field>
                <Button className="w-full">Update status</Button>
                {next.includes('CANCELLED') && o.paymentStatus === 'PAID' && <p className="text-xs text-brand-ink/60">Cancelling a paid order automatically refunds the full amount via Razorpay and returns stock.</p>}
              </ActionForm>
            </Panel>
          )}
          {canEdit && (
            <Panel title="Shipment tracking">
              <ActionForm action={saveTracking} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Courier" htmlFor="cr"><Input id="cr" name="courier" defaultValue={o.courier ?? ''} placeholder="e.g. Delhivery, India Post" /></Field>
                <Field label="Tracking number" htmlFor="tn"><Input id="tn" name="trackingNumber" defaultValue={o.trackingNumber ?? ''} /></Field>
                <Field label="Tracking link" htmlFor="tu"><Input id="tu" name="trackingUrl" type="url" defaultValue={o.trackingUrl ?? ''} placeholder="https://" /></Field>
                <Button variant="outline" className="w-full">Save tracking</Button>
              </ActionForm>
            </Panel>
          )}
          <Panel title="Customer & delivery">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{a.fullName}</p>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.landmark ? ` (near ${a.landmark})` : ''}</p>
              <p>{a.city}, {a.state} {a.pincode}</p>
              <p><a className="underline" href={`tel:${a.phone}`}>{a.phone}</a> · <a className="underline" href={`mailto:${o.email}`}>{o.email}</a></p>
              {o.user && <p className="pt-2"><Link className="font-semibold text-brand underline" href={`/admin/customers?q=${encodeURIComponent(o.email)}`}>Customer history</Link></p>}
              {o.notes && <p className="pt-2"><b>Customer note:</b> {o.notes}</p>}
            </div>
          </Panel>
          <Panel title="Payment">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Method</dt><dd>{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Razorpay'}</dd></div>
              {o.razorpayOrderId && <div className="flex justify-between gap-2"><dt>Razorpay order</dt><dd className="truncate">{o.razorpayOrderId}</dd></div>}
              {o.razorpayPaymentId && <div className="flex justify-between gap-2"><dt>Payment ID</dt><dd className="truncate">{o.razorpayPaymentId}</dd></div>}
            </dl>
            {o.refunds.length > 0 && <ul className="mt-3 space-y-1 border-t border-brand-ink/10 pt-3 text-xs">{o.refunds.map((r) => <li key={r.id}>{formatDate(r.createdAt)} · {formatINR(r.amount)} · {r.reason} {r.razorpayRefundId ? `(${r.razorpayRefundId})` : '(manual)'}</li>)}</ul>}
            {canRefund && (
              <ActionForm action={refund} className="mt-4 space-y-3 border-t border-brand-ink/10 pt-4">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Refund amount (₹)" htmlFor="ra" hint={`Up to ${formatINR(o.total - refunded)}${o.paymentMethod === 'COD' ? ' — COD refunds are recorded here; pay the customer by bank/UPI yourself.' : ' — sent to the original payment method.'}`}><Input id="ra" name="amount" inputMode="decimal" defaultValue={paiseToRupees(o.total - refunded)} /></Field>
                <Field label="Reason" htmlFor="rr"><Textarea id="rr" name="reason" rows={2} /></Field>
                <Button variant="danger" className="w-full">Issue refund</Button>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
