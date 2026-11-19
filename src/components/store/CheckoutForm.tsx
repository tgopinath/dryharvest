'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Banknote, Lock } from 'lucide-react';
import { placeOrder } from '@/app/actions/checkout';
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { INDIAN_STATES, cn, formatINR } from '@/lib/utils';

type Addr = { id: string; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; isDefault: boolean };
type RzpOpts = Record<string, unknown>;
declare global { interface Window { Razorpay?: new (o: RzpOpts) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutForm({ addresses, razorpayEnabled, codEnabled, codFee, total }: { addresses: Addr[]; razorpayEnabled: boolean; codEnabled: boolean; codFee: number; total: number }) {
  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(def?.id ?? 'new');
  const [method, setMethod] = useState<'RAZORPAY' | 'COD'>(razorpayEnabled ? 'RAZORPAY' : 'COD');
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [paying, setPaying] = useState(false);
  const router = useRouter();

  const submit = (fd: FormData) => {
    setError(null); setFe({});
    start(async () => {
      const address = addressId === 'new' ? Object.fromEntries(['fullName', 'phone', 'line1', 'line2', 'landmark', 'city', 'state', 'pincode'].map((k) => [k, String(fd.get(k) ?? '')])) : null;
      const r = await placeOrder({ addressId: addressId === 'new' ? null : addressId, address, saveAddress: fd.get('save') === 'on', paymentMethod: method, notes: String(fd.get('notes') ?? '') });
      if (!r.ok) { setError(r.error ?? (r.fieldErrors ? 'Please check the highlighted fields.' : 'Could not place the order.')); setFe(r.fieldErrors ?? {}); return; }
      if (!r.razorpay) { router.push(`/order/${r.orderNumber}?placed=1`); return; }
      setPaying(true);
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { setPaying(false); setError('Could not load the payment window. Check your connection and try again from your orders page.'); return; }
      const rz = new window.Razorpay({
        key: r.razorpay.keyId, amount: r.razorpay.amount, currency: 'INR', name: 'DryHarvest', description: `Order ${r.orderNumber}`,
        order_id: r.razorpay.orderId, prefill: { name: r.razorpay.name, email: r.razorpay.email, contact: r.razorpay.phone },
        theme: { color: '#176B36' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
          const j = await v.json().catch(() => ({}));
          router.push(`/order/${r.orderNumber}${v.ok && j.ok ? '?placed=1' : '?verify=pending'}`);
        },
        modal: { ondismiss: () => { setPaying(false); router.push(`/order/${r.orderNumber}?payment=cancelled`); } },
      });
      rz.on('payment.failed', () => { /* Razorpay lets the customer retry inside the modal */ });
      rz.open();
    });
  };

  const noPayment = !razorpayEnabled && !codEnabled;
  return (
    <form action={submit} className="space-y-8" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <section aria-labelledby="addr-h" className="rounded-3xl border border-brand-ink/10 bg-white p-6">
        <h2 id="addr-h" className="text-2xl">Delivery address</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <label key={a.id} className={cn('cursor-pointer rounded-2xl border p-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', addressId === a.id ? 'border-brand bg-brand-pale' : 'border-brand-ink/15')}>
              <input type="radio" name="addressId" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="sr-only" />
              <span className="block font-semibold">{a.fullName}</span>
              <span className="block text-brand-ink/70">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}</span>
              <span className="block text-brand-ink/70">{a.phone}</span>
            </label>
          ))}
          <label className={cn('flex cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', addressId === 'new' ? 'border-brand bg-brand-pale text-brand-deep' : 'border-brand-ink/20')}>
            <input type="radio" name="addressId" value="new" checked={addressId === 'new'} onChange={() => setAddressId('new')} className="sr-only" />
            + Add a new address
          </label>
        </div>
        {addressId === 'new' && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="a-name" error={fe.fullName}><Input id="a-name" name="fullName" autoComplete="name" required aria-invalid={!!fe.fullName} /></Field>
            <Field label="Mobile number" htmlFor="a-phone" error={fe.phone}><Input id="a-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required aria-invalid={!!fe.phone} /></Field>
            <Field label="House no., building, street" htmlFor="a-l1" error={fe.line1} className="sm:col-span-2"><Input id="a-l1" name="line1" autoComplete="address-line1" required aria-invalid={!!fe.line1} /></Field>
            <Field label="Area, locality (optional)" htmlFor="a-l2"><Input id="a-l2" name="line2" autoComplete="address-line2" /></Field>
            <Field label="Landmark (optional)" htmlFor="a-lm"><Input id="a-lm" name="landmark" /></Field>
            <Field label="City" htmlFor="a-city" error={fe.city}><Input id="a-city" name="city" autoComplete="address-level2" required aria-invalid={!!fe.city} /></Field>
            <Field label="State" htmlFor="a-state" error={fe.state}>
              <Select id="a-state" name="state" required defaultValue="" aria-invalid={!!fe.state}><option value="" disabled>Choose state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</Select>
            </Field>
            <Field label="Pincode" htmlFor="a-pin" error={fe.pincode}><Input id="a-pin" name="pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" required aria-invalid={!!fe.pincode} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="save" defaultChecked className="accent-brand" /> Save to my address book</label>
          </div>
        )}
      </section>

      <section aria-labelledby="pay-h" className="rounded-3xl border border-brand-ink/10 bg-white p-6">
        <h2 id="pay-h" className="text-2xl">Payment</h2>
        {noPayment ? (
          <Alert tone="warn" className="mt-4">Checkout is not open yet — payments are being set up. Your cart is saved; please check back soon.</Alert>
        ) : (
          <div className="mt-4 space-y-3">
            {razorpayEnabled && (
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', method === 'RAZORPAY' ? 'border-brand bg-brand-pale' : 'border-brand-ink/15')}>
                <input type="radio" name="method" className="mt-1 accent-brand" checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} />
                <CreditCard className="mt-0.5 size-5 text-brand" />
                <span><span className="block font-semibold">Pay online</span><span className="text-sm text-brand-ink/65">UPI, cards, netbanking and wallets via Razorpay</span></span>
              </label>
            )}
            {codEnabled && (
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', method === 'COD' ? 'border-brand bg-brand-pale' : 'border-brand-ink/15')}>
                <input type="radio" name="method" className="mt-1 accent-brand" checked={method === 'COD'} onChange={() => setMethod('COD')} />
                <Banknote className="mt-0.5 size-5 text-brand" />
                <span><span className="block font-semibold">Cash on delivery</span><span className="text-sm text-brand-ink/65">{codFee > 0 ? `${formatINR(codFee)} COD fee applies` : 'Pay when your order arrives'}</span></span>
              </label>
            )}
          </div>
        )}
        <Field label="Order notes (optional)" htmlFor="notes" className="mt-5"><Textarea id="notes" name="notes" rows={2} maxLength={500} placeholder="Delivery instructions" /></Field>
      </section>

      <Button size="lg" className="w-full" disabled={pending || paying || noPayment}>
        {pending || paying ? <Spinner /> : <Lock className="size-4" />}
        {method === 'COD' ? `Place order · ${formatINR(total + (codEnabled && method === 'COD' ? codFee : 0))}` : `Pay ${formatINR(total)}`}
      </Button>
      <p className="text-center text-xs text-brand-ink/55">Payments are processed securely by Razorpay. We never see or store your card details.</p>
    </form>
  );
}
