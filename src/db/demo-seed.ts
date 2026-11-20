// Builds the in-memory demo database: schema from drizzle/*.sql, catalogue from scripts/seed-data.ts.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { CATEGORIES, COMBOS, HOME_SECTIONS } from '../../scripts/seed-data';
import { DETAILS } from '../../scripts/product-details';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const skuOf = (name: string, label: string) =>
  `DH-${name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).map((w) => w.slice(0, 3)).join('').toUpperCase().slice(0, 9)}-${label.replace(/[^0-9a-z]/gi, '').toUpperCase()}`;
const grams = (label: string) => {
  const m = label.match(/(\d+(?:\.\d+)?)\s*(kg|g)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const mult = label.match(/(\d+)\s*×/);
  return (m[2].toLowerCase() === 'kg' ? n * 1000 : n) * (mult ? Number(mult[1]) : 1);
};

export async function initDemoDb(raw: PGlite) {
  const dir = path.join(process.cwd(), 'drizzle');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await raw.exec(readFileSync(path.join(dir, f), 'utf8').replaceAll('--> statement-breakpoint', ''));
  }
  const db = drizzle({ client: raw, schema });

  const [supA] = await db.insert(schema.suppliers).values({ name: 'Demo Supplier — Farm Collective', contact: 'Replace me', notes: 'DEMO DATA' }).returning();
  const [supB] = await db.insert(schema.suppliers).values({ name: 'Demo Supplier — Spice Traders', contact: 'Replace me', notes: 'DEMO DATA' }).returning();

  const allCats = [...CATEGORIES, { slug: 'combo-packs', name: 'Combo Packs & Gift Boxes', tagline: 'Curated bundles', kind: 'FOOD' as const, description: 'Bundles and gift boxes from across our range.', products: COMBOS }];
  let order = 0;
  for (const c of allCats) {
    const [cat] = await db.insert(schema.categories).values({
      slug: c.slug, name: c.name, tagline: c.tagline, description: c.description, kind: c.kind, sortOrder: order++,
    }).returning();

    for (const p of c.products) {
      const pslug = slug(p.name);
      const det = DETAILS[p.name];
      const safety = 'safetyNote' in c ? (c as { safetyNote?: string }).safetyNote ?? null : null;
      const [prod] = await db.insert(schema.products).values({
        slug: pslug, name: p.name, shortDescription: p.short,
        description: `${p.short}\n\nDEMO PRODUCT — this is a showcase store; products are not for sale.`,
        categoryId: cat.id, kind: c.kind, status: 'PUBLISHED', tags: p.tags ?? [], collections: p.collections ?? [],
        isFeatured: !!p.featured, safetyNote: safety, vegMark: c.kind === 'FOOD' ? true : null,
        supplierId: c.slug === 'spices-and-powders' ? supB.id : supA.id, isDemo: true,
        benefits: det?.benefits ?? [], usage: det?.usage ?? null, avoid: det?.avoid ?? [],
        storage: c.kind === 'DECOR' ? 'Keep in a dry place away from direct sunlight and moisture.' : 'Store in a cool, dry place. Reseal the pouch after opening.',
      }).returning();

      let i = 0;
      for (const [label, price, mrp] of p.sizes) {
        const stock = [0, 8, 25, 40, 60, 120][(pslug.length + i) % 6];
        const [v] = await db.insert(schema.variants).values({
          productId: prod.id, sku: skuOf(p.name, label), label, weightGrams: grams(label) || 100,
          price: price * 100, mrp: mrp * 100, cost: Math.round(price * 55), stock, reorderLevel: 10, sortOrder: i++,
        }).returning();
        if (stock > 0) {
          const mfg = new Date(Date.now() - ((pslug.length * 7) % 90) * 864e5);
          const bb = new Date(mfg.getTime() + (c.kind === 'DECOR' ? 365 : (pslug.length % 3 === 0 ? 60 : 270)) * 864e5);
          await db.insert(schema.batches).values({
            variantId: v.id, batchNumber: `DEMO-${mfg.toISOString().slice(2, 7).replace('-', '')}-${String(i).padStart(2, '0')}`,
            mfgDate: mfg, bestBefore: bb, quantity: stock, supplierId: prod.supplierId, unitCost: v.cost,
          });
        }
      }
    }
  }
  for (const [i, s] of HOME_SECTIONS.entries()) {
    await db.insert(schema.homeSections).values({ ...s, sortOrder: i }).onConflictDoNothing();
  }
}
