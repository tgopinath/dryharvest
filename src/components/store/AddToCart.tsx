'use client';
import { useState } from 'react';
import { ShoppingBag, Minus, Plus } from 'lucide-react';

const DEMO_LABEL = 'Demo store, not for sale';
import { Button } from '@/components/ui';
import { cn, formatINR, discountPercent } from '@/lib/utils';

type V = { id: string; label: string; price: number; mrp: number; stock: number };

/** Compact add-to-cart used on product cards: pack-size select + button. */
export function QuickAdd({ variants, productName }: { variants: V[]; productName: string }) {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [vid, setVid] = useState(first?.id);
  const v = variants.find((x) => x.id === vid) ?? first;
  if (!v) return null;
  const out = v.stock <= 0;
  return (
    <div className="mt-auto space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold">{formatINR(v.price)}</span>
            {discountPercent(v.price, v.mrp) > 0 && <span className="text-xs text-brand-ink/45 line-through">{formatINR(v.mrp)}</span>}
          </div>
          {discountPercent(v.price, v.mrp) > 0 && <span className="text-[11px] font-bold text-brand">{discountPercent(v.price, v.mrp)}% off MRP</span>}
        </div>
        {variants.length > 1 ? (
          <select
            aria-label={`Pack size for ${productName}`}
            value={vid}
            onChange={(e) => setVid(e.target.value)}
            className="h-8 rounded-full border border-brand-ink/15 bg-white px-2.5 text-xs font-semibold focus:border-brand focus:outline-none"
          >
            {variants.map((x) => <option key={x.id} value={x.id}>{x.label}{x.stock <= 0 ? ' (sold out)' : ''}</option>)}
          </select>
        ) : (
          <span className="rounded-full bg-brand-pale px-2.5 py-1 text-xs font-semibold text-brand-deep">{v.label}</span>
        )}
      </div>
      <Button variant="outline" size="sm" className="w-full" disabled>
        <ShoppingBag className="size-4" />
        {out ? 'Out of stock' : DEMO_LABEL}
      </Button>
    </div>
  );
}

/** Full purchase box on the product page. */
export function BuyBox({ variants, productName, children }: { variants: V[]; productName: string; children?: React.ReactNode }) {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [vid, setVid] = useState(first?.id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === vid) ?? first;
  if (!v) return <p className="text-sm text-brand-ink/60">This product is currently unavailable.</p>;
  const out = v.stock <= 0;
  const max = Math.min(20, v.stock);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{formatINR(v.price)}</span>
          {discountPercent(v.price, v.mrp) > 0 && (
            <>
              <span className="text-brand-ink/50 line-through">MRP {formatINR(v.mrp)}</span>
              <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-bold">{discountPercent(v.price, v.mrp)}% off</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-brand-ink/55">{discountPercent(v.price, v.mrp) > 0 ? '' : `MRP ${formatINR(v.mrp)} · `}Inclusive of all taxes</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Pack size</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((x) => (
            <label key={x.id} className={cn('cursor-pointer rounded-xl border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand', x.id === vid ? 'border-brand bg-brand-pale font-semibold text-brand-deep' : 'border-brand-ink/15 bg-white hover:border-brand/60', x.stock <= 0 && 'opacity-55')}>
              <input type="radio" name="variant" value={x.id} checked={x.id === vid} onChange={() => { setVid(x.id); setQty(1); }} className="sr-only" />
              <span className="block">{x.label}</span>
              <span className="block text-xs font-normal text-brand-ink/60">{x.stock <= 0 ? 'Sold out' : formatINR(x.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={cn('text-sm font-semibold', out ? 'text-red-700' : v.stock <= 10 ? 'text-[#8a5a00]' : 'text-brand')}>
        {out ? 'Out of stock' : v.stock <= 10 ? `Only ${v.stock} left in stock` : 'In stock'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-brand-ink/15 bg-white">
          <button type="button" aria-label="Decrease quantity" className="flex size-12 items-center justify-center disabled:opacity-30" disabled={qty <= 1 || out} onClick={() => setQty((q) => q - 1)}><Minus className="size-4" /></button>
          <span className="w-8 text-center font-semibold" aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
          <button type="button" aria-label="Increase quantity" className="flex size-12 items-center justify-center disabled:opacity-30" disabled={qty >= max || out} onClick={() => setQty((q) => q + 1)}><Plus className="size-4" /></button>
        </div>
        <Button size="lg" variant="outline" className="flex-1" disabled>
          <ShoppingBag className="size-5" /> {out ? 'Out of stock' : DEMO_LABEL}
        </Button>
        {children}
      </div>
    </div>
  );
}
