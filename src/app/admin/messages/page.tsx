import { desc, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { Badge, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { markMessage } from '../catalog-actions';

export const metadata = { title: 'Messages' };

export default async function Messages() {
  await requirePermission('customers:view');
  const [list, [subs]] = await Promise.all([
    db.query.contactMessages.findMany({ orderBy: [desc(schema.contactMessages.createdAt)], limit: 200 }),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.newsletterSubscribers),
  ]);
  return (
    <>
      <AdminHeader title="Messages" text={`Contact-form messages. ${subs.n} newsletter subscriber${subs.n === 1 ? '' : 's'}.`} actions={<a href="/admin/reports/export?type=newsletter" className="rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold">Export subscribers</a>} />
      {!list.length ? <EmptyState title="No messages yet" text="Messages from the Contact page appear here." /> : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id} className={`rounded-2xl border bg-white p-5 ${m.isRead ? 'border-brand-ink/10' : 'border-brand/40'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm"><b>{m.name}</b> · <a className="underline" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? 'Your message to NutriDry Naturals'}`)}`}>{m.email}</a>{m.phone && ` · ${m.phone}`}{m.subject && ` · ${m.subject}`}</p>
                <span className="flex items-center gap-2 text-xs text-brand-ink/55">{formatDate(m.createdAt, true)} {!m.isRead && <Badge tone="yellow">new</Badge>}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
              <form action={markMessage} className="mt-2"><input type="hidden" name="id" value={m.id} /><input type="hidden" name="read" value={m.isRead ? '0' : '1'} /><button className="text-xs font-semibold text-brand">{m.isRead ? 'Mark unread' : 'Mark as read'}</button></form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
