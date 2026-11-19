import { desc, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, PERMISSIONS } from '@/server/auth';
import { AdminHeader, Panel, Table, Td } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Button, Field, Input, Select } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { setRole, inviteStaff } from '../settings-actions';

export const metadata = { title: 'Staff & roles' };
const ROLES = ['STAFF', 'MANAGER', 'ADMIN'] as const;

export default async function Users() {
  const me = await requirePermission('users:manage');
  const staff = await db.query.users.findMany({ where: sql`${schema.users.role} <> 'CUSTOMER'`, orderBy: [desc(schema.users.createdAt)] });
  return (
    <>
      <AdminHeader title="Staff & roles" text="Changing a role signs that person out so new permissions apply immediately." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Table head={['Name', 'Email', 'Role', 'Since']}>
            {staff.map((u) => (
              <tr key={u.id}>
                <Td className="font-semibold">{u.name}</Td><Td>{u.email}</Td>
                <Td>{u.id === me.id ? <span className="text-sm">{u.role.toLowerCase()} (you)</span> : (
                  <form action={setRole} className="flex gap-2"><input type="hidden" name="id" value={u.id} /><select name="role" defaultValue={u.role} aria-label="Role" className="h-8 rounded-lg border border-brand-ink/15 px-2 text-sm">{[...ROLES, 'CUSTOMER'].map((r) => <option key={r} value={r}>{r === 'CUSTOMER' ? 'Remove staff access' : r.toLowerCase()}</option>)}</select><button className="text-xs font-semibold text-brand">Apply</button></form>
                )}</Td>
                <Td>{formatDate(u.createdAt)}</Td>
              </tr>
            ))}
          </Table>
          <Panel title="What each role can do">
            <Table head={['Permission', ...ROLES.map((r) => r.toLowerCase())]}>
              {Object.entries(PERMISSIONS).map(([p, roles]) => <tr key={p}><Td className="font-mono text-xs">{p}</Td>{ROLES.map((r) => <Td key={r}>{(roles as readonly string[]).includes(r) ? '✓' : '—'}</Td>)}</tr>)}
            </Table>
          </Panel>
        </div>
        <Panel title="Add staff member">
          <ActionForm action={inviteStaff} className="space-y-3">
            <Field label="Name" htmlFor="in"><Input id="in" name="name" required /></Field>
            <Field label="Email" htmlFor="ie" hint="If they already have a customer account, it is upgraded"><Input id="ie" name="email" type="email" required /></Field>
            <Field label="Role" htmlFor="ir"><Select id="ir" name="role" defaultValue="STAFF">{ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</Select></Field>
            <Field label="Temporary password" htmlFor="ip" hint="10+ characters. They should change it after first login."><Input id="ip" name="password" type="text" autoComplete="off" minLength={10} required /></Field>
            <Button>Add staff member</Button>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
