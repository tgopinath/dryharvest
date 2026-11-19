/**
 * Seeds the database ONLY when it is empty (no categories).
 * Everything created here is flagged isDemo = true and can be removed from
 * Admin → Settings → "Remove demo data".
 *   npm run db:seed            # seed if empty
 *   npm run db:seed -- --force # seed even if categories exist (skips existing slugs)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { CATEGORIES, COMBOS, HOME_SECTIONS } from './seed-data';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
const db = drizzle(pool, { schema });

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

async function main() {
  const force = process.argv.includes('--force');
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.categories);
  if (n > 0 && !force) {
    console.log('ℹ Database already has categories — skipping demo seed. Use --force to add missing demo items.');
  } else {
    await seedCatalog();
  }
  await seedAdmin();
  await pool.end();
}

async function seedCatalog() {
  console.log('Seeding DEMO catalogue…');
  const [supA] = await db.insert(schema.suppliers).values({ name: 'Demo Supplier — Farm Collective', contact: 'Replace me', notes: 'DEMO DATA' }).returning();
  const [supB] = await db.insert(schema.suppliers).values({ name: 'Demo Supplier — Spice Traders', contact: 'Replace me', notes: 'DEMO DATA' }).returning();

  const allCats = [...CATEGORIES, { slug: 'combo-packs', name: 'Combo Packs & Gift Boxes', tagline: 'Curated bundles', kind: 'FOOD' as const, description: 'Bundles and gift boxes from across our range.', products: COMBOS }];
  let order = 0;
  for (const c of allCats) {
    const exists = await db.query.categories.findFirst({ where: eq(schema.categories.slug, c.slug) });
    const cat = exists ?? (await db.insert(schema.categories).values({
      slug: c.slug, name: c.name, tagline: c.tagline, description: c.description, kind: c.kind, sortOrder: order++,
    }).returning())[0];

    for (const p of c.products) {
      const pslug = slug(p.name);
      if (await db.query.products.findFirst({ where: eq(schema.products.slug, pslug) })) continue;
      const safety = 'safetyNote' in c ? (c as { safetyNote?: string }).safetyNote ?? null : null;
      const [prod] = await db.insert(schema.products).values({
        slug: pslug, name: p.name, shortDescription: p.short,
        description: `${p.short}\n\nDEMO PRODUCT — replace this description, add real photos and fill in verified ingredients, allergen, storage and label details before going live.`,
        categoryId: cat.id, kind: c.kind, status: 'PUBLISHED', tags: p.tags ?? [], collections: p.collections ?? [],
        isFeatured: !!p.featured, safetyNote: safety, vegMark: c.kind === 'FOOD' ? true : null,
        supplierId: c.slug === 'spices-and-powders' ? supB.id : supA.id, isDemo: true,
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
          const [b] = await db.insert(schema.batches).values({
            variantId: v.id, batchNumber: `DEMO-${mfg.toISOString().slice(2, 7).replace('-', '')}-${String(i).padStart(2, '0')}`,
            mfgDate: mfg, bestBefore: bb, quantity: stock, supplierId: prod.supplierId, unitCost: v.cost,
          }).returning();
          await db.insert(schema.stockMovements).values({ variantId: v.id, batchId: b.id, change: stock, balance: stock, reason: 'INITIAL', note: 'Demo seed' });
        }
      }
    }
  }

  for (const [i, s] of HOME_SECTIONS.entries()) {
    await db.insert(schema.homeSections).values({ ...s, sortOrder: i }).onConflictDoNothing();
  }
  await db.insert(schema.coupons).values({
    code: 'WELCOME10', description: 'DEMO coupon: 10% off orders above ₹499 (max ₹150)', type: 'PERCENT', value: 10,
    minOrder: 49900, maxDiscount: 15000, perUserLimit: 1, isActive: true,
  }).onConflictDoNothing();
  console.log('✔ Demo catalogue seeded');
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('ℹ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin created. Run `npm run admin:create` later.');
    return;
  }
  if (password.length < 10) throw new Error('SEED_ADMIN_PASSWORD must be at least 10 characters.');
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    if (existing.role !== 'ADMIN') await db.update(schema.users).set({ role: 'ADMIN' }).where(eq(schema.users.id, existing.id));
    console.log(`ℹ Admin ${email} already exists`);
    return;
  }
  await db.insert(schema.users).values({ email, name: 'Store Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) });
  console.log(`✔ Admin user created: ${email}  (change the password after first login)`);
}

main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
