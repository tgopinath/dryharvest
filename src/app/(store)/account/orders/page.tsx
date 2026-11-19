import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/server/auth';
import { EmptyState, buttonClass } from '@/components/ui';
import { StatusBadge } from '@/components/store/OrderBits';
import { formatDate, formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'My orders', robots: { index: false } };

export default async function OrdersPage() {
  const u = await requireUser('/account/orders');
  const orders = await db.query.orders.findMany({ where: eq(schema.orders.userId, u.id), with: { items: true }, orderBy: [desc(schema.orders.createdAt)], limit: 100 });
  if (!orders.length) return <EmptyState title="No orders yet" text="When you place an order, you can track it here." action={<Link href="/shop" className={buttonClass()}>Start shopping</Link>} />;
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-ink/10 bg-white p-5 hover:border-brand/40">
            <div>
              <p className="font-semibold">Order {o.number}</p>
              <p className="text-sm text-brand-ink/60">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items · {o.items.slice(0, 2).map((i) => i.productName).join(', ')}{o.items.length > 2 ? '…' : ''}</p>
            </div>
            <div className="flex items-center gap-4"><StatusBadge status={o.status} /><span className="font-bold">{formatINR(o.total)}</span></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
