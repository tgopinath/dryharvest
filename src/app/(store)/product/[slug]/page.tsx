import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { Truck, RotateCcw, ShieldCheck, CircleCheck, CircleAlert } from 'lucide-react';
import { db, schema } from '@/db';
import { getProductBySlug, getProductReviews, getVariantBatchInfo, queryProducts, hydrateCards } from '@/server/catalog';
import { getCurrentUser } from '@/server/auth';
import { hasPurchased } from '@/server/orders';
import { getSetting } from '@/server/settings';
import { Gallery } from '@/components/store/Gallery';
import { BuyBox } from '@/components/store/AddToCart';
import { WishlistButton } from '@/components/store/WishlistButton';
import { Stars, KindMark } from '@/components/store/Price';
import { ProductGrid } from '@/components/store/ProductCard';
import { ReviewForm } from '@/components/store/ReviewForm';
import { Alert } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: 'Product not found' };
  const desc = p.seoDescription || p.shortDescription || undefined;
  return {
    title: p.seoTitle || p.name, description: desc, alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  const [reviews, batchInfo, related, ship, purchased, wish, store] = await Promise.all([
    getProductReviews(p.id),
    getVariantBatchInfo(p.variants.map((v) => v.id)),
    queryProducts({ category: p.category.slug, excludeId: p.id, perPage: 4 }),
    getSetting('shipping'),
    user ? hasPurchased(user.id, p.id) : false,
    user ? db.query.wishlistItems.findFirst({ where: and(eq(schema.wishlistItems.userId, user.id), eq(schema.wishlistItems.productId, p.id)) }) : null,
    getSetting('store'),
  ]);
  const relatedItems = user ? await hydrateCards(related.items.map((r) => r.id), user.id) : related.items;
  const firstVariant = p.variants[0];
  const batch = firstVariant ? batchInfo.get(firstVariant.id) : undefined;

  const info: [string, string | null | undefined][] = [
    ['Ingredients', p.ingredients],
    ['Allergen information', p.allergens],
    ['Storage', p.storage],
    ['Shelf life', p.shelfLife],
  ];
  const label: [string, React.ReactNode][] = ([
    ['SKU', p.variants.map((v) => `${v.label}: ${v.sku}`).join(' · ')],
    ['Net quantity', p.variants.map((v) => v.label).join(' / ')],
    ['Category', <Link key="c" className="underline" href={`/category/${p.category.slug}`}>{p.category.name}</Link>],
    ['Country of origin', p.countryOfOrigin],
    ['Manufactured by', p.manufacturer],
    ['Packed by', p.packer],
    ['FSSAI licence no.', p.fssaiLicense || (p.kind === 'FOOD' ? store.fssaiLicense : null)],
    ['Batch', batch?.batchNumber],
    ['Packed on', batch?.mfgDate ? formatDate(batch.mfgDate) : null],
    ['Best before', batch?.bestBefore ? formatDate(batch.bestBefore) : null],
    ['MRP', p.variants.map((v) => `${v.label}: ${formatINR(v.mrp)}`).join(' · ') + ' (incl. of all taxes)'],
  ] as [string, React.ReactNode][]).filter(([, v]) => v);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.shortDescription ?? undefined,
    sku: firstVariant?.sku, category: p.category.name, brand: { '@type': 'Brand', name: 'NutriDry Naturals' },
    image: p.images.map((i) => i.url),
    offers: p.variants.map((v) => ({
      '@type': 'Offer', sku: v.sku, priceCurrency: 'INR', price: (v.price / 100).toFixed(2),
      availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${process.env.APP_URL ?? ''}/product/${p.slug}`,
    })),
    ...(reviews.count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: reviews.avg!.toFixed(1), reviewCount: reviews.count } } : {}),
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-brand-ink/55">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/" className="hover:text-brand">Home</Link> /</li>
          <li><Link href={`/category/${p.category.slug}`} className="hover:text-brand">{p.category.name}</Link> /</li>
          <li aria-current="page" className="text-brand-ink/80">{p.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} name={p.name} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/category/${p.category.slug}`} className="text-sm font-semibold text-brand">{p.category.name}</Link>
            <KindMark kind={p.kind} veg={p.vegMark} />
            {p.isDemo && <span className="rounded-full bg-brand-ink/5 px-2 py-0.5 text-[11px] font-semibold text-brand-ink/60">Demo product</span>}
          </div>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-brand-deep sm:text-5xl">{p.name}</h1>
          {reviews.count > 0 && <a href="#reviews"><Stars value={reviews.avg!} count={reviews.count} className="mt-3" /></a>}
          {p.shortDescription && <p className="mt-4 text-lg text-brand-ink/70">{p.shortDescription}</p>}
          {p.benefits.length > 0 && (
            <ul aria-label="Benefits" className="mt-5 space-y-2">
              {p.benefits.map((b) => <li key={b} className="flex gap-2.5 text-[15px]"><CircleCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />{b}</li>)}
            </ul>
          )}
          {p.safetyNote && <Alert tone="warn" className="mt-4">{p.safetyNote}</Alert>}
          <div className="mt-6 border-t border-brand-ink/10 pt-6">
            <BuyBox productName={p.name} variants={p.variants.map((v) => ({ id: v.id, label: v.label, price: v.price, mrp: v.mrp, stock: v.stock }))}>
              <WishlistButton productId={p.id} initial={!!wish} withLabel />
            </BuyBox>
          </div>
          <ul className="mt-8 grid gap-3 rounded-2xl bg-white p-5 text-sm sm:grid-cols-3">
            <li className="flex gap-2"><Truck className="size-5 shrink-0 text-brand" /><span>{ship.freeAbove != null ? `Free shipping above ${formatINR(ship.freeAbove)}` : `Shipping ${formatINR(ship.flatRate)}`}</span></li>
            <li className="flex gap-2"><RotateCcw className="size-5 shrink-0 text-brand" /><Link className="underline" href="/policies/returns">Returns &amp; replacements</Link></li>
            <li className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-brand" /><span>Secure checkout</span></li>
          </ul>
          <p className="mt-3 text-xs text-brand-ink/55">{ship.dispatchNote}</p>
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="about-h">
          <h2 id="about-h" className="text-3xl">About this product</h2>
          {p.description && <div className="prose-dh mt-4 text-brand-ink/80">{p.description}</div>}
          {p.usage && (
            <div className="mt-8">
              <h3 className="text-xl">How to use</h3>
              <p className="mt-2 text-brand-ink/80">{p.usage}</p>
            </div>
          )}
          {p.avoid.length > 0 && (
            <div className="mt-8 rounded-2xl border border-[#F5BC32]/60 bg-[#FFFBEF] p-5">
              <h3 className="flex items-center gap-2 text-xl"><CircleAlert className="size-5 text-[#8a5a00]" aria-hidden />Who should avoid it</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-brand-ink/80">
                {p.avoid.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          )}
          <dl className="mt-8 divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-white">
            {info.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="text-sm font-bold">{k}</dt><dd className="text-sm text-brand-ink/75 whitespace-pre-line">{v}</dd></div>
            ))}
            {info.every(([, v]) => !v) && <p className="p-4 text-sm text-brand-ink/60">Detailed product information is being added.</p>}
          </dl>
          {p.nutrition && p.nutrition.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl">Nutrition information</h3>
              <table className="mt-3 w-full max-w-md overflow-hidden rounded-2xl border border-brand-ink/10 bg-white text-sm">
                <caption className="sr-only">Nutrition per 100 g</caption>
                <thead className="bg-brand-pale"><tr><th className="p-3 text-left">Nutrient</th><th className="p-3 text-right">{p.nutritionBasis || 'Per 100 g'}</th></tr></thead>
                <tbody>{p.nutrition.map((n) => <tr key={n.label} className="border-t border-brand-ink/5"><td className="p-3">{n.label}</td><td className="p-3 text-right">{n.per100g}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
        <section aria-labelledby="label-h">
          <h2 id="label-h" className="text-3xl">Label &amp; compliance</h2>
          <dl className="mt-4 divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-white text-sm">
            {label.map(([k, v]) => <div key={k} className="grid grid-cols-[140px_1fr] gap-2 p-3.5"><dt className="font-bold">{k}</dt><dd className="text-brand-ink/75">{v}</dd></div>)}
          </dl>
          <p className="mt-3 text-xs text-brand-ink/55">Batch and dates shown are for the stock currently being shipped and may differ slightly on the pack you receive. Always refer to the printed label.</p>
        </section>
      </div>

      <section id="reviews" aria-labelledby="reviews-h" className="mt-16 scroll-mt-24">
        <h2 id="reviews-h" className="text-3xl">Customer reviews</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            {reviews.count === 0 ? (
              <p className="text-brand-ink/65">No reviews yet. Customers who have ordered this product can review it from their account.</p>
            ) : (
              <>
                <Stars value={reviews.avg!} count={reviews.count} className="text-sm" />
                <ul className="mt-5 space-y-4">
                  {reviews.list.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-brand-ink/10 bg-white p-5">
                      <Stars value={r.rating} />
                      {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                      <p className="mt-1 text-sm text-brand-ink/80">{r.body}</p>
                      <p className="mt-3 text-xs text-brand-ink/55">{r.user.name.split(' ')[0]}{r.verifiedPurchase && ' · Verified buyer'} · {formatDate(r.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            {purchased ? <ReviewForm productId={p.id} /> : (
              <p className="rounded-2xl bg-white p-5 text-sm text-brand-ink/65">{user ? 'You can review this product after ordering it.' : <><Link className="font-semibold text-brand underline" href={`/login?next=/product/${p.slug}`}>Log in</Link> to review products you have ordered.</>}</p>
            )}
          </div>
        </div>
      </section>

      {relatedItems.length > 0 && (
        <section aria-labelledby="rel-h" className="mt-16">
          <h2 id="rel-h" className="mb-6 text-3xl">You may also like</h2>
          <ProductGrid items={relatedItems} />
        </section>
      )}
    </div>
  );
}
