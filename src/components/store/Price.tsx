import { discountPercent, formatINR, cn } from '@/lib/utils';
import { Star } from 'lucide-react';

export function Price({ price, mrp, size = 'md', className }: { price: number; mrp: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const off = discountPercent(price, mrp);
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-bold text-brand-ink', size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base')}>{formatINR(price)}</span>
      {off > 0 && (
        <>
          <span className="text-xs text-brand-ink/50 line-through" aria-label={`MRP ${formatINR(mrp)}`}>MRP {formatINR(mrp)}</span>
          <span className="text-xs font-bold text-brand">{off}% off</span>
        </>
      )}
      {off === 0 && size === 'lg' && <span className="text-xs text-brand-ink/50">MRP (incl. of all taxes)</span>}
    </div>
  );
}

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 text-xs text-brand-ink/70', className)} aria-label={`Rated ${value.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ''}`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn('size-3.5', i <= Math.round(value) ? 'fill-brand-yellow text-brand-yellow' : 'text-brand-ink/20')} />
        ))}
      </span>
      <span className="font-semibold text-brand-ink">{value.toFixed(1)}</span>
      {count != null && <span>({count})</span>}
    </div>
  );
}

export function KindMark({ kind, veg }: { kind: 'FOOD' | 'PET' | 'DECOR'; veg?: boolean | null }) {
  if (kind === 'PET') return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">Pet product · not for human use</span>;
  if (kind === 'DECOR') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Decorative · not edible</span>;
  if (veg === true) return <span title="Vegetarian" className="inline-flex size-4 items-center justify-center border-2 border-green-700"><span className="size-2 rounded-full bg-green-700" /></span>;
  return null;
}
