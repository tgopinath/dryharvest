import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader, Table, Td } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Badge, Button, Field, Input, Select } from '@/components/ui';
import { formatDate, formatINR, paiseToRupees } from '@/lib/utils';
import { saveCoupon } from '../catalog-actions';

export const metadata = { title: 'Coupons' };
type C = typeof schema.coupons.$inferSelect;
const local = (d: Date | null) => (d ? new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : '');

function Fields({ c }: { c?: C }) {
  const p = c?.id ?? 'new';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Code" htmlFor={`${p}c`}><Input id={`${p}c`} name="code" defaultValue={c?.code} required className="uppercase" /></Field>
      <Field label="Type" htmlFor={`${p}t`}><Select id={`${p}t`} name="type" defaultValue={c?.type ?? 'PERCENT'}><option value="PERCENT">Percentage off</option><option value="FLAT">Flat ₹ off</option></Select></Field>
      <Field label="Value (% or ₹)" htmlFor={`${p}v`}><Input id={`${p}v`} name="value" inputMode="decimal" defaultValue={c ? (c.type === 'PERCENT' ? c.value : paiseToRupees(c.value)) : ''} required /></Field>
      <Field label="Max discount ₹ (optional)" htmlFor={`${p}m`}><Input id={`${p}m`} name="maxDiscount" inputMode="decimal" defaultValue={paiseToRupees(c?.maxDiscount)} /></Field>
      <Field label="Minimum order ₹" htmlFor={`${p}o`}><Input id={`${p}o`} name="minOrder" inputMode="decimal" defaultValue={paiseToRupees(c?.minOrder ?? 0)} /></Field>
      <Field label="Starts" htmlFor={`${p}s`}><Input id={`${p}s`} name="startsAt" type="datetime-local" defaultValue={local(c?.startsAt ?? null)} /></Field>
      <Field label="Ends" htmlFor={`${p}e`}><Input id={`${p}e`} name="endsAt" type="datetime-local" defaultValue={local(c?.endsAt ?? null)} /></Field>
      <Field label="Total uses (blank = unlimited)" htmlFor={`${p}u`}><Input id={`${p}u`} name="usageLimit" type="number" min={0} defaultValue={c?.usageLimit ?? ''} /></Field>
      <Field label="Uses per customer" htmlFor={`${p}pu`}><Input id={`${p}pu`} name="perUserLimit" type="number" min={0} defaultValue={c?.perUserLimit ?? ''} /></Field>
      <Field label="Description (shown in cart)" htmlFor={`${p}d`} className="sm:col-span-2"><Input id={`${p}d`} name="description" defaultValue={c?.description ?? ''} /></Field>
      <div className="flex items-end gap-4"><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="accent-brand" /> Active</label><Button size="sm" className="mb-1">{c ? 'Save' : 'Create coupon'}</Button></div>
    </div>
  );
}

export default async function Coupons() {
  await requirePermission('coupons:edit');
  const list = await db.query.coupons.findMany({ orderBy: [desc(schema.coupons.createdAt)] });
  const now = new Date();
  return (
    <>
      <AdminHeader title="Coupons & promotions" text="Coupons are validated again at checkout. Usage counts update when an order is paid (or placed, for COD)." />
      <details className="mb-6 rounded-2xl border border-brand-ink/10 bg-white p-5"><summary className="cursor-pointer font-semibold text-brand">+ New coupon</summary><ActionForm action={saveCoupon} className="mt-4"><Fields /></ActionForm></details>
      <Table head={['Code', 'Discount', 'Min order', 'Valid', 'Used', 'Status', '']} empty={!list.length && 'No coupons yet.'}>
        {list.map((c) => {
          const live = c.isActive && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now) && (c.usageLimit == null || c.usedCount < c.usageLimit);
          return (
            <tr key={c.id} className="align-top">
              <Td className="font-mono font-semibold">{c.code}<span className="block font-sans text-xs font-normal text-brand-ink/55">{c.description}</span></Td>
              <Td>{c.type === 'PERCENT' ? `${c.value}%` : formatINR(c.value)}{c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ''}</Td>
              <Td>{formatINR(c.minOrder)}</Td>
              <Td className="text-xs">{c.startsAt ? formatDate(c.startsAt) : 'Now'} → {c.endsAt ? formatDate(c.endsAt) : 'No end'}</Td>
              <Td>{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ''}</Td>
              <Td><Badge tone={live ? 'green' : 'gray'}>{live ? 'live' : 'inactive'}</Badge></Td>
              <Td><details><summary className="cursor-pointer text-sm font-semibold text-brand">Edit</summary><div className="mt-3 w-[min(80vw,900px)]"><ActionForm action={saveCoupon}><Fields c={c} /></ActionForm></div></details></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
