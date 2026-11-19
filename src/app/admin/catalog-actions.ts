'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { audit } from '@/server/audit';
import { saveImage } from '@/server/storage';
import { rupeesToPaise, slugify } from '@/lib/utils';

type R = { ok: boolean; error?: string; message?: string };
const nn = (v: FormDataEntryValue | null) => { const s = typeof v === 'string' ? v.trim() : ''; return s || null; };

// ---------- Categories ----------
export async function saveCategory(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('categories:edit');
  const id = nn(fd.get('id'));
  const name = String(fd.get('name') ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Enter a category name.' };
  const slug = slugify(String(fd.get('slug') || name));
  const dup = await db.query.categories.findFirst({ where: and(eq(schema.categories.slug, slug), id ? ne(schema.categories.id, id) : undefined) });
  if (dup) return { ok: false, error: `The URL “${slug}” is already used.` };
  const parentId = nn(fd.get('parentId'));
  if (parentId && parentId === id) return { ok: false, error: 'A category cannot be its own parent.' };
  const values: Partial<typeof schema.categories.$inferInsert> = {
    name, slug, tagline: nn(fd.get('tagline')), description: nn(fd.get('description')), kind: (String(fd.get('kind')) as 'FOOD') || 'FOOD',
    parentId, sortOrder: Number(fd.get('sortOrder')) || 0, isActive: fd.get('isActive') === 'on',
    seoTitle: nn(fd.get('seoTitle')), seoDescription: nn(fd.get('seoDescription')),
  };
  try {
    const banner = fd.get('banner');
    if (banner instanceof File && banner.size) values.bannerUrl = await saveImage(banner, 'categories', `${slug}_banner`);
    const image = fd.get('image');
    if (image instanceof File && image.size) values.imageUrl = await saveImage(image, 'categories', `${slug}_thumb`);
  } catch (e) { return { ok: false, error: (e as Error).message }; }
  if (fd.get('removeBanner') === 'on') values.bannerUrl = null;
  if (fd.get('removeImage') === 'on') values.imageUrl = null;
  if (id) await db.update(schema.categories).set(values).where(eq(schema.categories.id, id));
  else await db.insert(schema.categories).values(values as typeof schema.categories.$inferInsert);
  await audit(user.id, id ? 'category.update' : 'category.create', 'category', id, { name });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Category saved.' };
}

export async function deleteCategory(fd: FormData) {
  const user = await requirePermission('categories:edit');
  const id = String(fd.get('id'));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.categoryId, id));
  if (n > 0) { await db.update(schema.categories).set({ isActive: false }).where(eq(schema.categories.id, id)); }
  else await db.delete(schema.categories).where(eq(schema.categories.id, id));
  await audit(user.id, n ? 'category.deactivate' : 'category.delete', 'category', id);
  revalidatePath('/', 'layout');
}

// ---------- Suppliers ----------
export async function saveSupplier(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('suppliers:edit');
  const id = nn(fd.get('id'));
  const name = String(fd.get('name') ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Enter the supplier name.' };
  const gstin = nn(fd.get('gstin'));
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin.toUpperCase())) return { ok: false, error: 'GSTIN should be 15 characters.' };
  const values = { name, contact: nn(fd.get('contact')), email: nn(fd.get('email')), phone: nn(fd.get('phone')), gstin: gstin?.toUpperCase() ?? null, address: nn(fd.get('address')), notes: nn(fd.get('notes')) };
  if (id) await db.update(schema.suppliers).set(values).where(eq(schema.suppliers.id, id));
  else await db.insert(schema.suppliers).values(values);
  await audit(user.id, id ? 'supplier.update' : 'supplier.create', 'supplier', id, { name });
  revalidatePath('/admin/suppliers');
  return { ok: true, message: 'Supplier saved.' };
}

// ---------- Coupons ----------
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code: 3–30 letters/numbers'),
  description: z.string().trim().max(200).optional(), type: z.enum(['PERCENT', 'FLAT']), value: z.string(),
  minOrder: z.string().optional(), maxDiscount: z.string().optional(), startsAt: z.string().optional(), endsAt: z.string().optional(),
  usageLimit: z.string().optional(), perUserLimit: z.string().optional(),
});
export async function saveCoupon(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('coupons:edit');
  const id = nn(fd.get('id'));
  const p = couponSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const c = p.data;
  const value = c.type === 'PERCENT' ? Number(c.value) : rupeesToPaise(c.value);
  if (!value || value <= 0 || (c.type === 'PERCENT' && value > 90)) return { ok: false, error: c.type === 'PERCENT' ? 'Percentage must be between 1 and 90.' : 'Enter a discount amount.' };
  const int = (s?: string) => (s && s.trim() ? Math.max(0, Math.floor(Number(s))) : null);
  const dt = (s?: string) => (s ? new Date(`${s}+05:30`) : null);
  const values = {
    code: c.code, description: c.description || null, type: c.type, value, minOrder: rupeesToPaise(c.minOrder) ?? 0, maxDiscount: rupeesToPaise(c.maxDiscount),
    startsAt: dt(c.startsAt), endsAt: dt(c.endsAt), usageLimit: int(c.usageLimit), perUserLimit: int(c.perUserLimit), isActive: fd.get('isActive') === 'on',
  };
  const dup = await db.query.coupons.findFirst({ where: and(eq(schema.coupons.code, c.code), id ? ne(schema.coupons.id, id) : undefined) });
  if (dup) return { ok: false, error: 'That code already exists.' };
  if (id) await db.update(schema.coupons).set(values).where(eq(schema.coupons.id, id));
  else await db.insert(schema.coupons).values(values);
  await audit(user.id, id ? 'coupon.update' : 'coupon.create', 'coupon', id, { code: c.code });
  revalidatePath('/admin/coupons');
  return { ok: true, message: `Coupon ${c.code} saved.` };
}

// ---------- Reviews ----------
export async function moderateReview(fd: FormData) {
  const user = await requirePermission('reviews:moderate');
  const id = String(fd.get('id'));
  const status = String(fd.get('status')) as 'APPROVED' | 'REJECTED';
  if (!['APPROVED', 'REJECTED'].includes(status)) return;
  await db.update(schema.reviews).set({ status }).where(eq(schema.reviews.id, id));
  await audit(user.id, `review.${status.toLowerCase()}`, 'review', id);
  revalidatePath('/admin/reviews');
  revalidatePath('/', 'layout');
}

// ---------- Messages ----------
export async function markMessage(fd: FormData) {
  await requirePermission('customers:view');
  await db.update(schema.contactMessages).set({ isRead: fd.get('read') === '1' }).where(eq(schema.contactMessages.id, String(fd.get('id'))));
  revalidatePath('/admin/messages');
}

// ---------- Customers ----------
export async function toggleCustomer(fd: FormData) {
  const user = await requirePermission('users:manage');
  const id = String(fd.get('id'));
  if (id === user.id) return;
  const active = fd.get('active') === '1';
  await db.update(schema.users).set({ isActive: active }).where(eq(schema.users.id, id));
  if (!active) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  await audit(user.id, active ? 'user.enable' : 'user.disable', 'user', id);
  revalidatePath('/admin/customers');
}
