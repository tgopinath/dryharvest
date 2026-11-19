'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, Tag, X } from 'lucide-react';
import { updateCartQuantity, removeFromCart, applyCoupon, removeCoupon } from '@/app/actions/cart';
import { useToast } from '@/components/ui/toast';
import { Button, Input, Spinner } from '@/components/ui';
import { ProductImage } from './ProductArt';
import { formatINR, cn } from '@/lib/utils';

export type ClientLine = { variantId: string; quantity: number; label: string; price: number; mrp: number; stock: number; productName: string; productSlug: string; imageUrl: string | null; problem: string | null; kind: string };

export function CartLines({ lines }: { lines: ClientLine[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(id);
    start(async () => { const r = await fn(); if (!r.ok) toast(r.error ?? 'Could not update cart', 'error'); router.refresh(); setBusy(null); });
  };
  return (
    <ul className="divide-y divide-brand-ink/10 rounded-3xl border border-brand-ink/10 bg-white">
      {lines.map((l) => (
        <li key={l.variantId} className={cn('flex gap-4 p-4 sm:p-5', pending && busy === l.variantId && 'opacity-60')}>
          <Link href={`/product/${l.productSlug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-brand-cream sm:size-24"><ProductImage url={l.imageUrl} name={l.productName} /></Link>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link href={`/product/${l.productSlug}`} className="font-semibold hover:text-brand">{l.productName}</Link>
              <p className="text-sm text-brand-ink/60">{l.label} · {formatINR(l.price)} each</p>
              {l.kind !== 'FOOD' && <p className="text-xs text-brand-ink/55">{l.kind === 'PET' ? 'Pet product — not for human use' : 'Decorative — not edible'}</p>}
              {l.problem && <p className="mt-1 text-sm font-semibold text-red-700">{l.problem}</p>}
            </div>
            <div className="flex items-center gap-4 sm:flex-col sm:items-end">
              <div className="flex h-9 items-center rounded-full border border-brand-ink/15">
                <button aria-label={`Decrease ${l.productName}`} className="flex size-9 items-center justify-center disabled:opacity-30" disabled={pending || l.quantity <= 1} onClick={() => run(l.variantId, () => updateCartQuantity(l.variantId, l.quantity - 1))}><Minus className="size-3.5" /></button>
                <span className="w-7 text-center text-sm font-semibold">{l.quantity}</span>
                <button aria-label={`Increase ${l.productName}`} className="flex size-9 items-center justify-center disabled:opacity-30" disabled={pending || l.quantity >= Math.min(20, l.stock)} onClick={() => run(l.variantId, () => updateCartQuantity(l.variantId, l.quantity + 1))}><Plus className="size-3.5" /></button>
              </div>
              <p className="font-bold">{formatINR(l.price * l.quantity)}</p>
              <button className="flex items-center gap-1 text-xs font-semibold text-brand-ink/55 hover:text-red-700" onClick={() => run(l.variantId, () => removeFromCart(l.variantId))}><Trash2 className="size-3.5" /> Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CouponBox({ applied, error }: { applied: { code: string; description: string | null } | null; error: string | null }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-brand-pale px-3 py-2 text-sm">
        <span className="flex items-center gap-2"><Tag className="size-4 text-brand" /><span><b>{applied.code}</b>{applied.description && <span className="block text-xs text-brand-ink/60">{applied.description}</span>}</span></span>
        <button aria-label="Remove coupon" onClick={() => start(async () => { await removeCoupon(); router.refresh(); })}><X className="size-4" /></button>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await applyCoupon(code); setMsg(r.ok ? null : r.error ?? null); if (r.ok) router.refresh(); }); }}>
      <label htmlFor="coupon" className="mb-1.5 block text-sm font-semibold">Coupon code</label>
      <div className="flex gap-2">
        <Input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code" autoComplete="off" />
        <Button variant="outline" disabled={pending || !code.trim()}>{pending ? <Spinner /> : 'Apply'}</Button>
      </div>
      {(msg || error) && <p className="mt-1.5 text-xs text-red-700">{msg || error}</p>}
    </form>
  );
}
