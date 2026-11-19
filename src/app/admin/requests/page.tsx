import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Badge, Button, Input, EmptyState } from '@/components/ui';
import { StatusBadge } from '@/components/store/OrderBits';
import { formatDate, formatINR } from '@/lib/utils';
import { resolveRequest, completeRequest } from '../orders/actions';

export const metadata = { title: 'Cancellations & returns' };

export default async function Requests({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  await requirePermission('orders:view');
  const { all } = await searchParams;
  const rows = await db.query.orderRequests.findMany({
    where: all ? undefined : eq(schema.orderRequests.status, 'OPEN'),
    with: { order: true, user: { columns: { name: true, email: true } } }, orderBy: [desc(schema.orderRequests.createdAt)], limit: 100,
  });
  return (
    <>
      <AdminHeader title="Cancellations & returns" text="Approving a cancellation cancels the order, returns stock and refunds online payments. For approved returns, arrange pickup, then mark the order Returned and refund from the order page." actions={<Link href={all ? '/admin/requests' : '/admin/requests?all=1'} className="text-sm font-semibold text-brand underline">{all ? 'Show open only' : 'Show all'}</Link>} />
      {!rows.length ? <EmptyState title="No open requests" text="Customer cancellation and return requests appear here." /> : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-brand-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold"><Badge tone={r.type === 'CANCEL' ? 'red' : 'yellow'}>{r.type === 'CANCEL' ? 'Cancellation' : 'Return'}</Badge> <Link className="ml-2 text-brand underline" href={`/admin/orders/${r.orderId}`}>{r.order.number}</Link> · {r.user.name} · {formatINR(r.order.total)}</p>
                <span className="flex items-center gap-2"><StatusBadge status={r.order.status} /><Badge>{r.status.toLowerCase()}</Badge></span>
              </div>
              <p className="mt-2 text-sm">“{r.reason}”</p>
              <p className="text-xs text-brand-ink/55">{formatDate(r.createdAt, true)}{r.adminNote ? ` · Note: ${r.adminNote}` : ''}</p>
              {r.status === 'OPEN' && (
                <ActionForm action={resolveRequest} className="mt-4 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="requestId" value={r.id} />
                  <Input name="adminNote" placeholder="Note to customer (optional)" className="max-w-sm" aria-label="Note" />
                  <Button name="decision" value="APPROVED">Approve</Button>
                  <Button name="decision" value="REJECTED" variant="outline">Decline</Button>
                </ActionForm>
              )}
              {r.status === 'APPROVED' && r.type === 'RETURN' && (
                <form action={completeRequest} className="mt-3"><input type="hidden" name="requestId" value={r.id} /><Button size="sm" variant="secondary">Mark return completed</Button></form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
