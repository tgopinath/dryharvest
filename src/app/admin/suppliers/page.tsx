import { asc, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { saveSupplier } from '../catalog-actions';

export const metadata = { title: 'Suppliers' };
type S = typeof schema.suppliers.$inferSelect;

function Fields({ s }: { s?: S }) {
  const p = s?.id ?? 'new';
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Name" htmlFor={`${p}n`}><Input id={`${p}n`} name="name" defaultValue={s?.name} required /></Field>
      <Field label="Contact person" htmlFor={`${p}c`}><Input id={`${p}c`} name="contact" defaultValue={s?.contact ?? ''} /></Field>
      <Field label="GSTIN" htmlFor={`${p}g`}><Input id={`${p}g`} name="gstin" defaultValue={s?.gstin ?? ''} maxLength={15} /></Field>
      <Field label="Phone" htmlFor={`${p}p`}><Input id={`${p}p`} name="phone" defaultValue={s?.phone ?? ''} /></Field>
      <Field label="Email" htmlFor={`${p}e`}><Input id={`${p}e`} name="email" type="email" defaultValue={s?.email ?? ''} /></Field>
      <Field label="Address" htmlFor={`${p}a`}><Input id={`${p}a`} name="address" defaultValue={s?.address ?? ''} /></Field>
      <Field label="Notes" htmlFor={`${p}x`} className="sm:col-span-3"><Textarea id={`${p}x`} name="notes" rows={2} defaultValue={s?.notes ?? ''} /></Field>
      <div><Button size="sm">{s ? 'Save' : 'Add supplier'}</Button></div>
    </div>
  );
}

export default async function Suppliers() {
  await requirePermission('suppliers:edit');
  const list = await db.select({ s: schema.suppliers, products: sql<number>`(select count(*)::int from products p where p.supplier_id = ${schema.suppliers.id})`, batches: sql<number>`(select count(*)::int from batches b where b.supplier_id = ${schema.suppliers.id})` }).from(schema.suppliers).orderBy(asc(schema.suppliers.name));
  return (
    <>
      <AdminHeader title="Suppliers" text="Linked to products and to each stock batch you receive." />
      <details className="mb-6 rounded-2xl border border-brand-ink/10 bg-white p-5"><summary className="cursor-pointer font-semibold text-brand">+ Add supplier</summary><ActionForm action={saveSupplier} className="mt-4"><Fields /></ActionForm></details>
      <ul className="space-y-3">
        {list.map(({ s, products, batches }) => (
          <li key={s.id} className="rounded-2xl border border-brand-ink/10 bg-white">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4"><span className="font-semibold">{s.name}</span><span className="text-sm text-brand-ink/55">{[s.contact, s.phone, s.email].filter(Boolean).join(' · ')} · {products} products · {batches} batches</span><span className="ml-auto text-sm font-semibold text-brand">Edit</span></summary>
              <div className="border-t border-brand-ink/8 p-4"><ActionForm action={saveSupplier}><Fields s={s} /></ActionForm></div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
