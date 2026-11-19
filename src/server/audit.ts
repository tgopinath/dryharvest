import 'server-only';
import { db, schema, type Tx } from '@/db';
import type { StockReason } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function audit(
  userId: string | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  data?: unknown,
  tx?: Tx,
) {
  await (tx ?? db).insert(schema.auditLogs).values({
    userId: userId ?? null, action, entity, entityId: entityId ?? null, data: (data ?? null) as never,
  });
}

/**
 * Atomically change a variant's stock and write a StockMovement row.
 * Throws if the change would make stock negative (unless allowNegative).
 * If batchId is given, the batch quantity changes too.
 */
export async function moveStock(
  tx: Tx,
  opts: {
    variantId: string; change: number; reason: StockReason; note?: string | null;
    orderId?: string | null; userId?: string | null; batchId?: string | null; allowNegative?: boolean;
  },
) {
  const updated = await tx
    .update(schema.variants)
    .set({ stock: sql`${schema.variants.stock} + ${opts.change}`, updatedAt: new Date() })
    .where(
      opts.allowNegative || opts.change >= 0
        ? eq(schema.variants.id, opts.variantId)
        : sql`${schema.variants.id} = ${opts.variantId} and ${schema.variants.stock} + ${opts.change} >= 0`,
    )
    .returning({ stock: schema.variants.stock, sku: schema.variants.sku });
  if (!updated[0]) throw new Error('INSUFFICIENT_STOCK');
  if (opts.batchId) {
    await tx
      .update(schema.batches)
      .set({ quantity: sql`greatest(${schema.batches.quantity} + ${opts.change}, 0)` })
      .where(eq(schema.batches.id, opts.batchId));
  }
  await tx.insert(schema.stockMovements).values({
    variantId: opts.variantId, batchId: opts.batchId ?? null, change: opts.change, balance: updated[0].stock,
    reason: opts.reason, note: opts.note ?? null, orderId: opts.orderId ?? null, userId: opts.userId ?? null,
  });
  return updated[0].stock;
}
