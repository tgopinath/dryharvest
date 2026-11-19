'use server';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { moveStock, audit } from '@/server/audit';
import { rupeesToPaise } from '@/lib/utils';

type R = { ok: boolean; error?: string; message?: string };
const d = (s?: string) => (s ? new Date(`${s}T00:00:00+05:30`) : null);

export async function receiveStock(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('inventory:edit');
  const p = z.object({
    variantId: z.string(), quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(1_000_000),
    batchNumber: z.string().trim().min(1, 'Batch number is required').max(60), mfgDate: z.string().optional(), bestBefore: z.string().optional(),
    supplierId: z.string().optional(), unitCost: z.string().optional(), note: z.string().max(300).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  if (v.mfgDate && v.bestBefore && d(v.bestBefore)! <= d(v.mfgDate)!) return { ok: false, error: 'Best-before must be after the manufacturing date.' };
  try {
    await db.transaction(async (tx) => {
      let batch = await tx.query.batches.findFirst({ where: and(eq(schema.batches.variantId, v.variantId), eq(schema.batches.batchNumber, v.batchNumber)) });
      if (!batch) {
        [batch] = await tx.insert(schema.batches).values({
          variantId: v.variantId, batchNumber: v.batchNumber, mfgDate: d(v.mfgDate), bestBefore: d(v.bestBefore), quantity: 0,
          supplierId: v.supplierId || null, unitCost: rupeesToPaise(v.unitCost),
        }).returning();
      }
      await moveStock(tx, { variantId: v.variantId, batchId: batch.id, change: v.quantity, reason: 'PURCHASE', userId: user.id, note: v.note || `Received batch ${v.batchNumber}` });
      await audit(user.id, 'stock.receive', 'variant', v.variantId, { qty: v.quantity, batch: v.batchNumber }, tx);
    });
  } catch (e) { return { ok: false, error: (e as Error).message }; }
  revalidatePath(`/admin/inventory/${v.variantId}`);
  return { ok: true, message: `Received ${v.quantity} units into batch ${v.batchNumber}.` };
}

export async function adjustStock(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('inventory:edit');
  const p = z.object({
    variantId: z.string(), change: z.coerce.number().int().refine((n) => n !== 0, 'Enter a non-zero change'),
    reason: z.enum(['ADJUSTMENT', 'DAMAGE', 'EXPIRY', 'RETURN']), batchId: z.string().optional(), note: z.string().trim().min(3, 'A note is required for adjustments').max(300),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  try {
    await db.transaction(async (tx) => {
      await moveStock(tx, { variantId: v.variantId, change: v.change, reason: v.reason, batchId: v.batchId || null, note: v.note, userId: user.id });
      await audit(user.id, 'stock.adjust', 'variant', v.variantId, { change: v.change, reason: v.reason, note: v.note }, tx);
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message === 'INSUFFICIENT_STOCK' ? 'That would make stock negative.' : (e as Error).message };
  }
  revalidatePath(`/admin/inventory/${v.variantId}`);
  return { ok: true, message: 'Stock adjusted.' };
}

export async function updateBatch(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('inventory:edit');
  const id = String(fd.get('batchId'));
  const mfg = String(fd.get('mfgDate') ?? ''), bb = String(fd.get('bestBefore') ?? '');
  await db.update(schema.batches).set({ mfgDate: d(mfg), bestBefore: d(bb) }).where(eq(schema.batches.id, id));
  await audit(user.id, 'batch.update', 'batch', id, { mfg, bb });
  revalidatePath('/admin/inventory');
  return { ok: true, message: 'Batch dates updated.' };
}

export async function setReorderLevel(fd: FormData) {
  const user = await requirePermission('inventory:edit');
  const id = String(fd.get('variantId'));
  const level = Math.max(0, Number(fd.get('reorderLevel')) || 0);
  await db.update(schema.variants).set({ reorderLevel: level }).where(eq(schema.variants.id, id));
  await audit(user.id, 'variant.reorder', 'variant', id, { level });
  revalidatePath(`/admin/inventory/${id}`);
}
