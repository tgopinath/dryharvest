'use client';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, saveAddress, deleteAddress, setDefaultAddress, requestCancelOrReturn, getRetryPayment } from '@/app/actions/account';
import { changePassword } from '@/app/actions/auth';
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { INDIAN_STATES } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      {s.message && <Alert tone="success">{s.message}</Alert>}
      {s.error && <Alert tone="error">{s.error}</Alert>}
      <Field label="Email" htmlFor="p-email" hint="Contact support to change your email."><Input id="p-email" value={email} disabled readOnly /></Field>
      <Field label="Full name" htmlFor="p-name" error={s.fieldErrors?.name}><Input id="p-name" name="name" defaultValue={name} required /></Field>
      <Field label="Mobile number" htmlFor="p-phone" error={s.fieldErrors?.phone}><Input id="p-phone" name="phone" type="tel" defaultValue={phone ?? ''} /></Field>
      <Button disabled={pending}>{pending && <Spinner />}Save profile</Button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [s, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      {s.message && <Alert tone="success">{s.message}</Alert>}
      {s.error && <Alert tone="error">{s.error}</Alert>}
      {hasPassword && <Field label="Current password" htmlFor="pw-c" error={s.fieldErrors?.current}><Input id="pw-c" name="current" type="password" autoComplete="current-password" required /></Field>}
      <Field label={hasPassword ? 'New password' : 'Set a password'} htmlFor="pw-n" error={s.fieldErrors?.password}><Input id="pw-n" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
      <Field label="Confirm password" htmlFor="pw-x" error={s.fieldErrors?.confirm}><Input id="pw-x" name="confirm" type="password" autoComplete="new-password" required /></Field>
      <Button variant="outline" disabled={pending}>{pending && <Spinner />}{hasPassword ? 'Change password' : 'Set password'}</Button>
    </form>
  );
}

type Addr = { id: string; fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string; isDefault: boolean };

export function AddressForm({ a, onDone }: { a?: Addr; onDone?: () => void }) {
  const [s, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => { const r = await saveAddress(prev, fd); if (r.ok) onDone?.(); return r; }, {});
  const fe = s.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {s.error && <Alert tone="error" className="sm:col-span-2">{s.error}</Alert>}
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="Full name" htmlFor="ad-n" error={fe.fullName}><Input id="ad-n" name="fullName" defaultValue={a?.fullName} required /></Field>
      <Field label="Mobile number" htmlFor="ad-p" error={fe.phone}><Input id="ad-p" name="phone" type="tel" defaultValue={a?.phone} required /></Field>
      <Field label="House no., building, street" htmlFor="ad-1" error={fe.line1} className="sm:col-span-2"><Input id="ad-1" name="line1" defaultValue={a?.line1} required /></Field>
      <Field label="Area, locality" htmlFor="ad-2"><Input id="ad-2" name="line2" defaultValue={a?.line2 ?? ''} /></Field>
      <Field label="Landmark" htmlFor="ad-l"><Input id="ad-l" name="landmark" defaultValue={a?.landmark ?? ''} /></Field>
      <Field label="City" htmlFor="ad-c" error={fe.city}><Input id="ad-c" name="city" defaultValue={a?.city} required /></Field>
      <Field label="State" htmlFor="ad-s" error={fe.state}><Select id="ad-s" name="state" defaultValue={a?.state ?? ''} required><option value="" disabled>Choose state</option>{INDIAN_STATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Pincode" htmlFor="ad-z" error={fe.pincode}><Input id="ad-z" name="pincode" inputMode="numeric" maxLength={6} defaultValue={a?.pincode} required /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={a?.isDefault} className="accent-brand" /> Use as default</label>
      <div className="flex gap-2 sm:col-span-2"><Button disabled={pending}>{pending && <Spinner />}Save address</Button>{onDone && <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>}</div>
    </form>
  );
}

export function AddressBook({ addresses }: { addresses: Addr[] }) {
  const [editing, setEditing] = useState<string | null>(addresses.length ? null : 'new');
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {addresses.map((a) => (
        <div key={a.id} className="rounded-2xl border border-brand-ink/10 bg-white p-5">
          {editing === a.id ? <AddressForm a={a} onDone={() => setEditing(null)} /> : (
            <div className="flex flex-wrap items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-semibold">{a.fullName} {a.isDefault && <span className="ml-1 rounded-full bg-brand-pale px-2 py-0.5 text-xs text-brand-deep">Default</span>}</p>
                <p className="text-brand-ink/70">{a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.landmark ? ` (near ${a.landmark})` : ''}</p>
                <p className="text-brand-ink/70">{a.city}, {a.state} {a.pincode} · {a.phone}</p>
              </div>
              <div className="flex gap-3 font-semibold">
                {!a.isDefault && <button disabled={pending} className="text-brand" onClick={() => start(() => setDefaultAddress(a.id))}>Make default</button>}
                <button className="text-brand" onClick={() => setEditing(a.id)}>Edit</button>
                <button disabled={pending} className="text-red-700" onClick={() => { if (confirm('Delete this address?')) start(() => deleteAddress(a.id)); }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {editing === 'new' ? <div className="rounded-2xl border border-brand-ink/10 bg-white p-5"><AddressForm onDone={addresses.length ? () => setEditing(null) : undefined} /></div>
        : <Button variant="outline" onClick={() => setEditing('new')}>+ Add address</Button>}
    </div>
  );
}

export function OrderRequestForm({ number, mode }: { number: string; mode: 'cancel' | 'cancel-request' | 'return' }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState<FormState, FormData>(requestCancelOrReturn, {});
  if (s.ok) return <Alert tone="success">{s.message}</Alert>;
  const label = mode === 'return' ? 'Request return / replacement' : mode === 'cancel' ? 'Cancel order' : 'Request cancellation';
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}>{label}</Button>;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-brand-ink/10 bg-white p-5">
      {s.error && <Alert tone="error">{s.error}</Alert>}
      <input type="hidden" name="number" value={number} />
      <Field label={mode === 'return' ? 'What went wrong? (damaged, wrong item, quality issue…)' : 'Reason for cancelling'} htmlFor="rq" error={s.fieldErrors?.reason}><Textarea id="rq" name="reason" rows={3} required /></Field>
      <div className="flex gap-2"><Button variant={mode === 'return' ? 'primary' : 'danger'} disabled={pending}>{pending && <Spinner />}{label}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep order</Button></div>
    </form>
  );
}

export function RetryPayment({ number }: { number: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <Button disabled={pending} onClick={() => start(async () => {
        const r = await getRetryPayment(number);
        if (!r) { setErr('This order can no longer be paid. Please place a new order.'); return; }
        if (!window.Razorpay) await new Promise<void>((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://checkout.razorpay.com/v1/checkout.js'; sc.onload = () => res(); sc.onerror = () => rej(); document.body.appendChild(sc); }).catch(() => setErr('Could not load the payment window.'));
        if (!window.Razorpay) return;
        new window.Razorpay({
          key: r.keyId, amount: r.amount, currency: 'INR', name: 'DryHarvest', description: `Order ${r.number}`, order_id: r.orderId,
          prefill: { name: r.name, email: r.email, contact: r.phone }, theme: { color: '#176B36' },
          handler: async (resp: Record<string, string>) => {
            await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
            router.refresh();
          },
        }).open();
      })}>{pending && <Spinner />}Complete payment</Button>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
