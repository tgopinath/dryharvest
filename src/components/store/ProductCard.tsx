import Link from 'next/link';
import type { CardProduct } from '@/server/catalog';
import { ProductImage } from './ProductArt';
import { QuickAdd } from './AddToCart';
import { WishlistButton } from './WishlistButton';
import { Stars, KindMark } from './Price';

export function ProductCard({ p, priority }: { p: CardProduct; priority?: boolean }) {
  const inStock = p.variants.some((v) => v.stock > 0);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand-ink/10 bg-white transition-shadow hover:shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-brand-cream">
        <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden>
          <ProductImage url={p.imageUrl} alt={p.imageAlt} name={p.name} priority={priority} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          {!inStock && <span className="rounded-full bg-brand-ink px-2.5 py-1 text-[11px] font-semibold text-white">Sold out</span>}
          {p.isDemo && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-brand-ink/60">Demo product</span>}
        </div>
        <WishlistButton productId={p.id} initial={p.inWishlist} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-brand-ink/55">
          <Link href={`/category/${p.categorySlug}`} className="hover:text-brand">{p.categoryName}</Link>
          <KindMark kind={p.kind} veg={p.kind === 'FOOD' ? null : undefined} />
        </div>
        <h3 className="font-sans text-[15px] font-semibold leading-snug tracking-normal">
          <Link href={`/product/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none [&:focus-visible]:underline">{p.name}</Link>
        </h3>
        {p.rating != null && p.reviewCount > 0 && <Stars value={p.rating} count={p.reviewCount} />}
        <div className="relative z-10 mt-auto pt-1"><QuickAdd variants={p.variants} productName={p.name} /></div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, cols = 4 }: { items: CardProduct[]; cols?: 3 | 4 | 5 }) {
  const c = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[cols];
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 ${c}`}>
      {items.map((p, i) => <li key={p.id}><ProductCard p={p} priority={i < 4} /></li>)}
    </ul>
  );
}

export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: n }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-brand-ink/10 bg-white">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-4"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-3/4" /><div className="skeleton h-8 w-full" /></div>
        </li>
      ))}
    </ul>
  );
}
