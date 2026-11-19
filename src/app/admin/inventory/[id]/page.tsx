import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, can } from '@/server/auth';
import { AdminHeader, Panel, Table, Td } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Badge, Button, Field, Input, Select } from '@/components/ui';
import { formatDate, formatINR, titleCase } from '@/lib/utils';
import { receiveStock, adjustStock, updateBatch, setReorderLevel } from '../actions';

export const metadata = { title: 'Manage stock' };
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function VariantStock({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('inventory:view');
  const { id } = await params;
  const v = await db.query.variants.findFirst({ where: eq(schema.variants.id, id), with: { product: true, batches: { orderBy: (b, { asc }) => [asc(b.bestBefore)], with: { supplier: true } } } });
  if (!v) notFound();
  const [moves, suppliers] = await Promise.all([
    db.query.stockMovements.findMany({ where: eq(schema.stockMovements.variantId, id), with: { batch: true }, orderBy: [desc(schema.stockMovements.createdAt)], limit: 100 }),
    db.query.suppliers.findMany({ orderBy: [asc(schema.suppliers.name)] }),
  ]);
  const edit = can(user.role, 'inventory:edit');
  const activeBatches = v.batches.filter((b) => b.quantity > 0);
  const batchSum = activeBatches.reduce((s, b) => s + b.quantity, 0);
  return (
    <>
      <AdminHeader title={`${v.product.name} · ${v.label}`} text={`SKU ${v.sku}`} actions={<Link href={`/admin/products/${v.productId}`} className="rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold">Edit product</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-ink/10 bg-white p-5"><p className="text-sm text-brand-ink/60">In stock</p><p className="text-3xl font-bold">{v.stock}</p>{batchSum !== v.stock && <p className="text-xs text-[#9a6200]">{v.stock - batchSum} units not assigned to a batch</p>}</div>
            <div className="rounded-2xl border border-brand-ink/10 bg-white p-5"><p className="text-sm text-brand-ink/60">Price / MRP</p><p className="text-xl font-bold">{formatINR(v.price)} <span className="text-sm font-normal text-brand-ink/55">/ {formatINR(v.mrp)}</span></p></div>
            <div className="rounded-2xl border border-brand-ink/10 bg-white p-5">
              <p className="text-sm text-brand-ink/60">Reorder level</p>
              {edit ? <form action={setReorderLevel} className="mt-1 flex gap-2"><input type="hidden" name="variantId" value={v.id} /><Input name="reorderLevel" type="number" min={0} defaultValue={v.reorderLevel} className="h-9 w-24" aria-label="Reorder level" /><Button size="sm" variant="outline">Save</Button></form> : <p className="text-xl font-bold">{v.reorderLevel}</p>}
            </div>
          </div>
          <Panel title="Batches">
            <Table head={['Batch', 'Qty left', 'Mfg / packed', 'Best before', 'Supplier', 'Unit cost', ...(edit ? [''] : [])]} empty={!v.batches.length && 'No batches yet. Receive stock to create one.'}>
              {v.batches.map((b) => {
                const expired = b.bestBefore && b.bestBefore < new Date();
                return (
                  <tr key={b.id} className={b.quantity === 0 ? 'opacity-50' : ''}>
                    <Td className="font-mono text-xs">{b.batchNumber}</Td>
                    <Td>{b.quantity}</Td>
                    <Td>{formatDate(b.mfgDate)}</Td>
                    <Td>{expired && b.quantity > 0 ? <Badge tone="red">Expired {formatDate(b.bestBefore)}</Badge> : formatDate(b.bestBefore)}</Td>
                    <Td>{b.supplier?.name ?? '—'}</Td>
                    <Td>{b.unitCost ? formatINR(b.unitCost) : '—'}</Td>
                    {edit && <Td>
                      <details><summary className="cursor-pointer text-xs font-semibold text-brand">Edit dates</summary>
                        <ActionForm action={updateBatch} className="mt-2 flex flex-col gap-2">
                          <input type="hidden" name="batchId" value={b.id} />
                          <Input type="date" name="mfgDate" defaultValue={iso(b.mfgDate)} aria-label="Mfg date" className="h-8" />
                          <Input type="date" name="bestBefore" defaultValue={iso(b.bestBefore)} aria-label="Best before" className="h-8" />
                          <Button size="sm" variant="outline">Save</Button>
                        </ActionForm>
                      </details>
                    </Td>}
                  </tr>
                );
              })}
            </Table>
          </Panel>
          <Panel title="Stock movement log">
            <Table head={['When', 'Reason', 'Change', 'Balance', 'Batch', 'Note']} empty={!moves.length && 'No movements yet.'}>
              {moves.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap">{formatDate(m.createdAt, true)}</Td>
                  <Td>{titleCase(m.reason)}</Td>
                  <Td className={m.change > 0 ? 'font-semibold text-brand' : 'font-semibold text-red-700'}>{m.change > 0 ? `+${m.change}` : m.change}</Td>
                  <Td>{m.balance}</Td>
                  <Td className="font-mono text-xs">{m.batch?.batchNumber ?? '—'}</Td>
                  <Td>{m.orderId ? <Link className="text-brand underline" href={`/admin/orders/${m.orderId}`}>{m.note ?? 'Order'}</Link> : m.note}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
        {edit && (
          <div className="space-y-6">
            <Panel title="Receive stock">
              <ActionForm action={receiveStock} className="space-y-3">
                <input type="hidden" name="variantId" value={v.id} />
                <Field label="Quantity (units)" htmlFor="rq"><Input id="rq" name="quantity" type="number" min={1} required /></Field>
                <Field label="Batch number" htmlFor="rb" hint="Use an existing batch number to add to it"><Input id="rb" name="batchNumber" required /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mfg / packed" htmlFor="rm"><Input id="rm" name="mfgDate" type="date" /></Field>
                  <Field label="Best before" htmlFor="rbb"><Input id="rbb" name="bestBefore" type="date" /></Field>
                </div>
                <Field label="Supplier" htmlFor="rs"><Select id="rs" name="supplierId" defaultValue={v.product.supplierId ?? ''}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                <Field label="Unit cost (₹)" htmlFor="rc"><Input id="rc" name="unitCost" inputMode="decimal" /></Field>
                <Field label="Note" htmlFor="rn"><Input id="rn" name="note" placeholder="e.g. PO-1042" /></Field>
                <Button className="w-full">Receive stock</Button>
              </ActionForm>
            </Panel>
            <Panel title="Adjust stock">
              <ActionForm action={adjustStock} className="space-y-3">
                <input type="hidden" name="variantId" value={v.id} />
                <Field label="Change" htmlFor="ac" hint="Negative to remove, e.g. -3"><Input id="ac" name="change" type="number" required /></Field>
                <Field label="Reason" htmlFor="ar"><Select id="ar" name="reason"><option value="ADJUSTMENT">Stock count correction</option><option value="DAMAGE">Damaged</option><option value="EXPIRY">Expired — written off</option><option value="RETURN">Customer return (restock)</option></Select></Field>
                <Field label="Batch" htmlFor="ab"><Select id="ab" name="batchId"><option value="">Not batch-specific</option>{v.batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber} ({b.quantity})</option>)}</Select></Field>
                <Field label="Note (required)" htmlFor="an"><Input id="an" name="note" required /></Field>
                <Button variant="outline" className="w-full">Save adjustment</Button>
              </ActionForm>
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
