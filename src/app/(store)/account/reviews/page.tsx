import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/server/auth';
import { Badge, EmptyState } from '@/components/ui';
import { Stars } from '@/components/store/Price';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'My reviews', robots: { index: false } };

export default async function MyReviews() {
  const u = await requireUser('/account/reviews');
  const mine = await db.query.reviews.findMany({ where: eq(schema.reviews.userId, u.id), with: { product: { columns: { name: true, slug: true } } }, orderBy: [desc(schema.reviews.createdAt)] });
  const reviewed = mine.map((r) => r.productId);
  const toReview = await db
    .selectDistinct({ id: schema.orderItems.productId, name: schema.orderItems.productName, slug: schema.orderItems.productSlug })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orders.userId, u.id), inArray(schema.orders.status, ['DELIVERED']), reviewed.length ? notInArray(schema.orderItems.productId, reviewed) : undefined))
    .limit(20);
  return (
    <div className="space-y-8">
      {toReview.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl">Waiting for your review</h2>
          <ul className="flex flex-wrap gap-2">{toReview.map((p) => p.slug && <li key={p.id}><Link href={`/product/${p.slug}#reviews`} className="block rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold hover:border-brand">{p.name}</Link></li>)}</ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-2xl">Your reviews</h2>
        {!mine.length ? <EmptyState title="No reviews yet" text="After your order is delivered, you can review what you bought." /> : (
          <ul className="space-y-3">
            {mine.map((r) => (
              <li key={r.id} className="rounded-2xl border border-brand-ink/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-semibold hover:text-brand" href={`/product/${r.product.slug}`}>{r.product.name}</Link><Badge tone={r.status === 'APPROVED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'yellow'}>{r.status === 'PENDING' ? 'Awaiting moderation' : r.status.toLowerCase()}</Badge></div>
                <Stars value={r.rating} className="mt-2" />
                <p className="mt-2 text-sm text-brand-ink/75">{r.body}</p>
                <p className="mt-2 text-xs text-brand-ink/50">{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
