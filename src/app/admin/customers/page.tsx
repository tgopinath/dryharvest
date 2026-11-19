import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, can } from '@/server/auth';
import { AdminHeader, AdminPager, SearchBar, Table, Td } from '@/components/admin/ui';
import { Badge } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/utils';
import { toggleCustomer } from '../catalog-actions';

export const metadata = { title: 'Customers' };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePermission('customers:view');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const per = 40;
  const where: SQL[] = [eq(schema.users.role, 'CUSTOMER')];
  if (sp.q) where.push(or(ilike(schema.users.name, `%${sp.q}%`), ilike(schema.users.email, `%${sp.q}%`), ilike(schema.users.phone, `%${sp.q}%`))!);
  const w = and(...where);
  const orders = sql<number>`(select count(*)::int from orders o where o.user_id = ${schema.users.id} and o.status not in ('PENDING_PAYMENT','CANCELLED'))`;
  const spent = sql<number>`(select coalesce(sum(o.total),0)::int from orders o where o.user_id = ${schema.users.id} and o.payment_status in ('PAID','PARTIALLY_REFUNDED'))`;
  const last = sql<Date | null>`(select max(o.created_at) from orders o where o.user_id = ${schema.users.id})`;
  const [[{ n }], rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(w),
    db.select({ u: schema.users, orders, spent, last }).from(schema.users).where(w).orderBy(desc(schema.users.createdAt)).limit(per).offset((page - 1) * per),
  ]);
  const manage = can(user.role, 'users:manage');
  return (
    <>
      <AdminHeader title="Customers" text={`${n} customer${n === 1 ? '' : 's'}`} actions={<a href="/admin/reports/export?type=customers" className="rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold">Export CSV</a>} />
      <SearchBar placeholder="Name, email or phone" defaultValue={sp.q} />
      <Table head={['Customer', 'Phone', 'Joined', 'Orders', 'Spent', 'Last order', 'Status']} empty={!rows.length && 'No customers found.'}>
        {rows.map(({ u, orders, spent, last }) => (
          <tr key={u.id}>
            <Td><span className="font-semibold">{u.name}</span><span className="block text-xs text-brand-ink/55">{u.email}{u.googleId ? ' · Google' : ''}</span></Td>
            <Td>{u.phone ?? '—'}</Td>
            <Td>{formatDate(u.createdAt)}</Td>
            <Td><a className="text-brand underline" href={`/admin/orders?q=${encodeURIComponent(u.email)}`}>{orders}</a></Td>
            <Td>{formatINR(spent)}</Td>
            <Td>{last ? formatDate(new Date(last)) : '—'}</Td>
            <Td>
              {manage ? (
                <form action={toggleCustomer} className="flex items-center gap-2"><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.isActive ? '0' : '1'} /><Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'active' : 'disabled'}</Badge><button className="text-xs font-semibold text-brand">{u.isActive ? 'Disable' : 'Enable'}</button></form>
              ) : <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'active' : 'disabled'}</Badge>}
            </Td>
          </tr>
        ))}
      </Table>
      <AdminPager page={page} pages={Math.ceil(n / per)} base="/admin/customers" params={{ q: sp.q }} />
    </>
  );
}
