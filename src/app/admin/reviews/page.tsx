import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { Badge, Button, EmptyState } from '@/components/ui';
import { Stars } from '@/components/store/Price';
import { formatDate } from '@/lib/utils';
import { moderateReview } from '../catalog-actions';

export const metadata = { title: 'Reviews' };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission('reviews:moderate');
  const { status = 'PENDING' } = await searchParams;
  const list = await db.query.reviews.findMany({
    where: ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? eq(schema.reviews.status, status as 'PENDING') : undefined,
    with: { user: { columns: { name: true, email: true } }, product: { columns: { name: true, slug: true } } }, orderBy: [desc(schema.reviews.createdAt)], limit: 100,
  });
  return (
    <>
      <AdminHeader title="Reviews" text="Only customers who ordered a product can review it. Nothing is published until approved." />
      <nav className="mb-4 flex gap-2">{['PENDING', 'APPROVED', 'REJECTED'].map((s) => <Link key={s} href={`/admin/reviews?status=${s}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'border border-brand-ink/15 bg-white'}`}>{s.toLowerCase()}</Link>)}</nav>
      {!list.length ? <EmptyState title="Nothing here" text={status === 'PENDING' ? 'No reviews are waiting for moderation.' : 'No reviews in this state.'} /> : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl border border-brand-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm"><Link className="font-semibold text-brand underline" href={`/product/${r.product.slug}`} target="_blank">{r.product.name}</Link> · {r.user.name} ({r.user.email}) {r.verifiedPurchase && <Badge tone="green">verified buyer</Badge>}</p>
                <span className="text-xs text-brand-ink/55">{formatDate(r.createdAt, true)}</span>
              </div>
              <Stars value={r.rating} className="mt-2" />
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm">{r.body}</p>
              <form action={moderateReview} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                {r.status !== 'APPROVED' && <Button size="sm" name="status" value="APPROVED">Approve</Button>}
                {r.status !== 'REJECTED' && <Button size="sm" variant="outline" name="status" value="REJECTED">Reject</Button>}
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
