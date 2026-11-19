'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { audit, moveStock } from '@/server/audit';
import { saveImage, deleteImage } from '@/server/storage';
import { rupeesToPaise, slugify } from '@/lib/utils';
import { complianceIssues } from '@/server/products';

export type ProductFormState = { ok?: boolean; error?: string; issues?: string[]; message?: string };

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2, 'SKU is required').max(60).regex(/^[A-Za-z0-9_-]+$/, 'SKU: letters, numbers, - and _ only'),
  label: z.string().trim().min(1, 'Pack size label is required').max(30),
  weightGrams: z.coerce.number().int().min(0).max(100000),
  price: z.string(), mrp: z.string(), cost: z.string().optional(),
  reorderLevel: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean(),
  openingStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  batchNumber: z.string().trim().max(60).optional(),
  mfgDate: z.string().optional(), bestBefore: z.string().optional(),
});

const productSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(150),
  slug: z.string().trim().max(90).optional(),
  categoryId: z.string().min(1, 'Choose a category'),
  kind: z.enum(['FOOD', 'PET', 'DECOR']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  shortDescription: z.string().trim().max(300).optional(),
  description: z.string().trim().max(10000).optional(),
  tags: z.string().optional(), collections: z.array(z.string()).default([]),
  isFeatured: z.boolean(),
  ingredients: z.string().trim().max(2000).optional(), allergens: z.string().trim().max(1000).optional(),
  storage: z.string().trim().max(1000).optional(), usage: z.string().trim().max(2000).optional(),
  shelfLife: z.string().trim().max(200).optional(), countryOfOrigin: z.string().trim().max(80).optional(),
  manufacturer: z.string().trim().max(500).optional(), packer: z.string().trim().max(500).optional(),
  fssaiLicense: z.string().trim().max(20).regex(/^(\d{14})?$/, 'FSSAI licence numbers have 14 digits').optional(),
  vegMark: z.enum(['', 'veg', 'nonveg']).optional(), safetyNote: z.string().trim().max(500).optional(),
  hsnCode: z.string().trim().max(10).optional(), gstRate: z.string().optional(),
  nutritionBasis: z.string().trim().max(40).optional(), nutrition: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(),
  supplierId: z.string().optional(),
});

const nn = (s?: string | null) => (s && s.trim() ? s.trim() : null);
const date = (s?: string) => (s ? new Date(`${s}T00:00:00+05:30`) : null);

export async function saveProduct(_: ProductFormState, fd: FormData): Promise<ProductFormState> {
  const user = await requirePermission('products:edit');
  const id = (fd.get('id') as string) || null;
  let variantsIn: unknown, nutritionIn: { label: string; per100g: string }[] = [], imagesIn: { id: string; alt: string; sortOrder: number; remove: boolean }[] = [];
  try {
    variantsIn = JSON.parse(String(fd.get('variants') ?? '[]'));
    nutritionIn = JSON.parse(String(fd.get('nutrition') ?? '[]'));
    imagesIn = JSON.parse(String(fd.get('images') ?? '[]'));
  } catch { return { error: 'Form data was malformed. Reload and try again.' }; }

  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !['variants', 'nutrition', 'images', 'collections'].includes(k)) obj[k] = v;
  obj.collections = fd.getAll('collections').map(String);
  obj.isFeatured = fd.get('isFeatured') === 'on';
  const parsed = productSchema.safeParse(obj);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' · ') };
  const vParsed = z.array(variantSchema).min(1, 'Add at least one pack size').safeParse(variantsIn);
  if (!vParsed.success) return { error: vParsed.error.issues.map((i) => i.message).join(' · ') };
  const d = parsed.data;
  const variants = vParsed.data.map((v) => ({ ...v, priceP: rupeesToPaise(v.price), mrpP: rupeesToPaise(v.mrp), costP: rupeesToPaise(v.cost) }));
  for (const v of variants) {
    if (v.priceP == null || v.priceP <= 0) return { error: `${v.label}: enter a valid selling price.` };
    if (v.mrpP == null || v.mrpP <= 0) return { error: `${v.label}: enter the MRP.` };
    if (v.priceP > v.mrpP) return { error: `${v.label}: selling price cannot be higher than MRP.` };
  }
  const skus = variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) return { error: 'Each pack size needs a unique SKU.' };
  const clash = await db.select({ sku: schema.variants.sku }).from(schema.variants).where(and(inArray(schema.variants.sku, skus), id ? ne(schema.variants.productId, id) : undefined));
  if (clash.length) return { error: `SKU already used by another product: ${clash.map((c) => c.sku).join(', ')}` };

  const slug = slugify(d.slug || d.name);
  const slugTaken = await db.query.products.findFirst({ where: and(eq(schema.products.slug, slug), id ? ne(schema.products.id, id) : undefined) });
  if (slugTaken) return { error: `The URL “${slug}” is already used by ${slugTaken.name}. Change the URL slug.` };

  const gst = d.gstRate ? Number(d.gstRate) : null;
  if (gst != null && ![0, 5, 12, 18, 28].includes(gst)) return { error: 'GST rate must be 0, 5, 12, 18 or 28.' };
  const nutrition = nutritionIn.filter((n) => n.label?.trim() && n.per100g?.trim()).map((n) => ({ label: n.label.trim().slice(0, 60), per100g: n.per100g.trim().slice(0, 30) }));

  const existing = id ? await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { images: true } }) : null;
  if (id && !existing) return { error: 'Product not found.' };

  // upload new images first (outside transaction)
  const files = fd.getAll('newImages').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 10) return { error: 'Upload up to 10 images at a time.' };
  let uploaded: string[] = [];
  try {
    uploaded = await Promise.all(files.map((f, i) => saveImage(f, 'products', `${slug}_${i}`)));
  } catch (e) { return { error: (e as Error).message }; }

  const keptImages = (existing?.images ?? []).filter((im) => !imagesIn.find((x) => x.id === im.id)?.remove);
  const imageCount = keptImages.length + uploaded.length;
  const values = {
    name: d.name, slug, categoryId: d.categoryId, kind: d.kind, shortDescription: nn(d.shortDescription), description: nn(d.description),
    tags: (d.tags ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 30), collections: d.collections, isFeatured: d.isFeatured,
    ingredients: nn(d.ingredients), allergens: nn(d.allergens), storage: nn(d.storage), usage: nn(d.usage), shelfLife: nn(d.shelfLife),
    countryOfOrigin: nn(d.countryOfOrigin), manufacturer: nn(d.manufacturer), packer: nn(d.packer), fssaiLicense: nn(d.fssaiLicense),
    vegMark: d.vegMark === 'veg' ? true : d.vegMark === 'nonveg' ? false : null, safetyNote: nn(d.safetyNote), hsnCode: nn(d.hsnCode), gstRate: gst,
    nutrition: nutrition.length ? nutrition : null, nutritionBasis: nn(d.nutritionBasis), seoTitle: nn(d.seoTitle), seoDescription: nn(d.seoDescription),
    supplierId: nn(d.supplierId),
  };
  let status = d.status;
  let issues: string[] = [];
  if (status === 'PUBLISHED') {
    issues = await complianceIssues({ ...values, isDemo: existing?.isDemo ?? false }, imageCount, variants.filter((v) => v.isActive).length);
    if (issues.length) status = 'DRAFT';
  }

  let productId = id!;
  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(schema.products).set({ ...values, status }).where(eq(schema.products.id, existing.id));
    } else {
      const [p] = await tx.insert(schema.products).values({ ...values, status }).returning({ id: schema.products.id });
      productId = p.id;
    }
    // images
    for (const im of existing?.images ?? []) {
      const patch = imagesIn.find((x) => x.id === im.id);
      if (patch?.remove) await tx.delete(schema.productImages).where(eq(schema.productImages.id, im.id));
      else if (patch) await tx.update(schema.productImages).set({ alt: patch.alt?.slice(0, 200) || null, sortOrder: patch.sortOrder }).where(eq(schema.productImages.id, im.id));
    }
    const base = keptImages.length ? Math.max(...keptImages.map((k) => imagesIn.find((x) => x.id === k.id)?.sortOrder ?? k.sortOrder)) + 1 : 0;
    if (uploaded.length) await tx.insert(schema.productImages).values(uploaded.map((url, i) => ({ productId, url, alt: d.name, sortOrder: base + i })));

    // variants
    const existingV = existing ? await tx.select().from(schema.variants).where(eq(schema.variants.productId, productId)) : [];
    for (const [i, v] of variants.entries()) {
      const vals = { sku: v.sku.toUpperCase(), label: v.label, weightGrams: v.weightGrams, price: v.priceP!, mrp: v.mrpP!, cost: v.costP, reorderLevel: v.reorderLevel, isActive: v.isActive, sortOrder: i };
      const cur = v.id ? existingV.find((e) => e.id === v.id) : undefined;
      if (cur) {
        await tx.update(schema.variants).set(vals).where(eq(schema.variants.id, cur.id));
        if (cur.price !== vals.price || cur.mrp !== vals.mrp) await audit(user.id, 'variant.price', 'variant', cur.id, { from: { price: cur.price, mrp: cur.mrp }, to: { price: vals.price, mrp: vals.mrp } }, tx);
      } else {
        const [nv] = await tx.insert(schema.variants).values({ ...vals, productId, stock: 0 }).returning();
        if (v.openingStock && v.openingStock > 0) {
          const [b] = await tx.insert(schema.batches).values({
            variantId: nv.id, batchNumber: v.batchNumber || `OPEN-${new Date().toISOString().slice(0, 10)}`, mfgDate: date(v.mfgDate), bestBefore: date(v.bestBefore),
            quantity: 0, supplierId: values.supplierId, unitCost: vals.cost,
          }).returning();
          await moveStock(tx, { variantId: nv.id, batchId: b.id, change: v.openingStock, reason: 'INITIAL', userId: user.id, note: 'Opening stock' });
        }
      }
    }
    // variants removed from the form are deactivated (kept for order history)
    const keep = variants.map((v) => v.id).filter(Boolean) as string[];
    for (const e of existingV) if (!keep.includes(e.id)) await tx.update(schema.variants).set({ isActive: false }).where(eq(schema.variants.id, e.id));

    await audit(user.id, existing ? 'product.update' : 'product.create', 'product', productId, { name: d.name, status }, tx);
  });
  // delete removed image files after commit
  for (const im of existing?.images ?? []) if (imagesIn.find((x) => x.id === im.id)?.remove) await deleteImage(im.url);

  revalidatePath('/', 'layout');
  if (!existing) redirect(`/admin/products/${productId}?created=1${issues.length ? '&unpublished=1' : ''}`);
  if (issues.length) return { ok: true, issues, message: 'Saved as draft — fix the items below to publish.' };
  return { ok: true, message: 'Product saved.' };
}

export async function setProductStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
  const user = await requirePermission('products:edit');
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { images: true, variants: true } });
  if (!p) return { ok: false, error: 'Not found' };
  if (status === 'PUBLISHED') {
    const issues = await complianceIssues(p, p.images.length, p.variants.filter((v) => v.isActive).length);
    if (issues.length) return { ok: false, error: issues.join(' ') };
  }
  await db.update(schema.products).set({ status }).where(eq(schema.products.id, id));
  await audit(user.id, `product.${status.toLowerCase()}`, 'product', id);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function duplicateProduct(id: string) {
  const user = await requirePermission('products:edit');
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { images: true, variants: true } });
  if (!p) return;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const { id: _id, createdAt: _c, updatedAt: _u, images, variants, ...rest } = p;
  const newId = await db.transaction(async (tx) => {
    const [np] = await tx.insert(schema.products).values({ ...rest, name: `${p.name} (copy)`, slug: `${p.slug}-copy-${suffix.toLowerCase()}`, status: 'DRAFT', isDemo: false }).returning();
    if (images.length) await tx.insert(schema.productImages).values(images.map((im) => ({ productId: np.id, url: im.url, alt: im.alt, sortOrder: im.sortOrder })));
    if (variants.length) await tx.insert(schema.variants).values(variants.map((v) => ({ productId: np.id, sku: `${v.sku}-${suffix}`.slice(0, 60), label: v.label, weightGrams: v.weightGrams, price: v.price, mrp: v.mrp, cost: v.cost, reorderLevel: v.reorderLevel, isActive: v.isActive, sortOrder: v.sortOrder, stock: 0 })));
    await audit(user.id, 'product.duplicate', 'product', np.id, { from: id }, tx);
    return np.id;
  });
  redirect(`/admin/products/${newId}?duplicated=1`);
}

export async function bulkProducts(fd: FormData) {
  await requirePermission('products:edit');
  const ids = fd.getAll('ids').map(String);
  const action = String(fd.get('bulk'));
  if (!ids.length) return;
  if (['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(action)) for (const id of ids) await setProductStatus(id, action as 'DRAFT');
  revalidatePath('/admin/products');
}

