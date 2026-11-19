import { desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader, AdminPager, SearchBar, Table, Td } from '@/components/admin/ui';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Audit log' };

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermission('audit:view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 50;
  const w = sp.q ? sql`${schema.auditLogs.action} ilike ${`%${sp.q}%`} or ${schema.auditLogs.entity} ilike ${`%${sp.q}%`}` : undefined;
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.auditLogs).where(w),
    db.select({ a: schema.auditLogs, who: schema.users.name }).from(schema.auditLogs).leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId)).where(w).orderBy(desc(schema.auditLogs.createdAt)).limit(per).offset((page - 1) * per),
  ]);
  return (
    <>
      <AdminHeader title="Audit log" text="Every admin change to products, prices, stock, orders, refunds, roles and settings." />
      <SearchBar placeholder="Action or entity, e.g. refund, stock" defaultValue={sp.q} />
      <Table head={['When', 'Who', 'Action', 'Entity', 'Details']} empty={!rows.length && 'No entries.'}>
        {rows.map(({ a, who }) => (
          <tr key={a.id} className="align-top">
            <Td className="whitespace-nowrap">{formatDate(a.createdAt, true)}</Td>
            <Td>{who ?? 'System'}</Td>
            <Td className="font-mono text-xs">{a.action}</Td>
            <Td className="text-xs">{a.entity}{a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ''}</Td>
            <Td className="max-w-md break-all font-mono text-[11px] text-brand-ink/65">{a.data ? JSON.stringify(a.data).slice(0, 300) : ''}</Td>
          </tr>
        ))}
      </Table>
      <AdminPager page={page} pages={Math.ceil(n / per)} base="/admin/audit" params={{ q: sp.q }} />
    </>
  );
}
