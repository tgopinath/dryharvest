'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { requirePermission, hashPassword } from '@/server/auth';
import { audit } from '@/server/audit';
import { saveSetting, getSetting, type HeroClaim } from '@/server/settings';
import { saveImage } from '@/server/storage';
import { rupeesToPaise } from '@/lib/utils';

type R = { ok: boolean; error?: string; message?: string };
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function saveStore(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('settings:edit');
  const fssai = s(fd, 'fssaiLicense');
  if (fssai && !/^\d{14}$/.test(fssai)) return { ok: false, error: 'FSSAI licence numbers have 14 digits.' };
  const gstin = s(fd, 'gstin').toUpperCase();
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) return { ok: false, error: 'GSTIN should be 15 characters.' };
  const v = { name: s(fd, 'name') || 'DryHarvest', tagline: s(fd, 'tagline'), email: s(fd, 'email'), phone: s(fd, 'phone'), whatsapp: s(fd, 'whatsapp'), address: s(fd, 'address'),
    legalName: s(fd, 'legalName'), gstin, state: s(fd, 'state'), fssaiLicense: fssai, announcement: s(fd, 'announcement'), instagram: s(fd, 'instagram'), facebook: s(fd, 'facebook'), youtube: s(fd, 'youtube') };
  await saveSetting('store', v);
  await audit(user.id, 'settings.store', 'settings', 'store', v);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Store details saved.' };
}

export async function saveShipping(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('settings:edit');
  const flat = rupeesToPaise(s(fd, 'flatRate'));
  if (flat == null || flat < 0) return { ok: false, error: 'Enter a shipping charge (0 for free).' };
  const v = {
    flatRate: flat, freeAbove: rupeesToPaise(s(fd, 'freeAbove')), codEnabled: fd.get('codEnabled') === 'on', codFee: rupeesToPaise(s(fd, 'codFee')) ?? 0,
    codMaxOrder: rupeesToPaise(s(fd, 'codMaxOrder')), dispatchNote: s(fd, 'dispatchNote'),
    serviceablePincodePrefixes: s(fd, 'pincodes').split(/[\s,]+/).filter((p) => /^\d{1,6}$/.test(p)),
  };
  await saveSetting('shipping', v);
  await audit(user.id, 'settings.shipping', 'settings', 'shipping', v);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Shipping & payment settings saved.' };
}

export async function saveContent(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('cms:edit');
  await saveSetting('policies', { shipping: s(fd, 'shipping'), returns: s(fd, 'returns'), refund: s(fd, 'refund'), privacy: s(fd, 'privacy'), terms: s(fd, 'terms') });
  await saveSetting('about', { heading: s(fd, 'aboutHeading'), body: s(fd, 'aboutBody') });
  await audit(user.id, 'cms.content', 'settings', 'policies');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Pages saved.' };
}

export async function saveClaims(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('cms:edit');
  const current = await getSetting('heroClaims');
  const next: HeroClaim[] = current.map((c) => ({
    ...c, title: s(fd, `${c.id}.title`) || c.title, text: s(fd, `${c.id}.text`), icon: (s(fd, `${c.id}.icon`) || c.icon) as HeroClaim['icon'],
    verified: fd.get(`${c.id}.verified`) === 'on', visible: fd.get(`${c.id}.visible`) === 'on',
  }));
  const bad = next.find((c) => c.visible && !c.verified);
  if (bad) return { ok: false, error: `“${bad.title}” can only be shown after you confirm it is verified.` };
  await saveSetting('heroClaims', next);
  await audit(user.id, 'cms.claims', 'settings', 'heroClaims', next);
  revalidatePath('/');
  return { ok: true, message: 'Hero claims saved.' };
}

export async function saveSection(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('cms:edit');
  const id = s(fd, 'id');
  const sec = await db.query.homeSections.findFirst({ where: eq(schema.homeSections.id, id) });
  if (!sec) return { ok: false, error: 'Section not found.' };
  const data = { ...(sec.data ?? {}) } as Record<string, unknown>;
  if (sec.key === 'hero') {
    data.primaryCta = { label: s(fd, 'primaryLabel') || 'Shop Now', href: s(fd, 'primaryHref') || '/shop' };
    data.secondaryCta = { label: s(fd, 'secondaryLabel') || 'Explore Products', href: s(fd, 'secondaryHref') || '/categories' };
    const img = fd.get('heroImage');
    try { if (img instanceof File && img.size) data.imageUrl = await saveImage(img, 'banners', 'hero'); } catch (e) { return { ok: false, error: (e as Error).message }; }
    if (fd.get('removeImage') === 'on') data.imageUrl = '';
  }
  if (sec.key === 'why') {
    data.points = [0, 1, 2, 3].map((i) => ({ title: s(fd, `p${i}t`), text: s(fd, `p${i}x`) })).filter((p) => p.title);
  }
  await db.update(schema.homeSections).set({ title: s(fd, 'title') || sec.title, subtitle: s(fd, 'subtitle') || null, eyebrow: s(fd, 'eyebrow') || null, isVisible: fd.get('isVisible') === 'on', sortOrder: Number(fd.get('sortOrder')) || 0, data }).where(eq(schema.homeSections.id, id));
  await audit(user.id, 'cms.section', 'home_section', id, { key: sec.key });
  revalidatePath('/');
  return { ok: true, message: 'Section saved.' };
}

export async function setRole(fd: FormData) {
  const user = await requirePermission('users:manage');
  const id = s(fd, 'id');
  const role = s(fd, 'role') as 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
  if (!['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'].includes(role) || id === user.id) return;
  if (role !== 'ADMIN') {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.role, 'ADMIN'), eq(schema.users.isActive, true)));
    const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (target?.role === 'ADMIN' && n <= 1) return;
  }
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id)); // force re-login with new permissions
  await audit(user.id, 'user.role', 'user', id, { role });
  revalidatePath('/admin/users');
}

export async function inviteStaff(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('users:manage');
  const p = z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(2), role: z.enum(['STAFF', 'MANAGER', 'ADMIN']), password: z.string().min(10, 'Temporary password must be at least 10 characters') }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, p.data.email) });
  if (existing) {
    await db.update(schema.users).set({ role: p.data.role }).where(eq(schema.users.id, existing.id));
    await audit(user.id, 'user.role', 'user', existing.id, { role: p.data.role });
    revalidatePath('/admin/users');
    return { ok: true, message: `${p.data.email} already had an account — role set to ${p.data.role}.` };
  }
  const [u] = await db.insert(schema.users).values({ email: p.data.email, name: p.data.name, role: p.data.role, passwordHash: await hashPassword(p.data.password) }).returning();
  await audit(user.id, 'user.create', 'user', u.id, { role: p.data.role });
  revalidatePath('/admin/users');
  return { ok: true, message: `Account created. Share the temporary password securely and ask them to change it.` };
}

/** Removes demo products (and their variants/batches) that have never been ordered, demo suppliers and the demo coupon. */
export async function removeDemoData(_: R, fd: FormData): Promise<R> {
  const user = await requirePermission('settings:edit');
  if (s(fd, 'confirm') !== 'REMOVE DEMO') return { ok: false, error: 'Type REMOVE DEMO to confirm.' };
  const demo = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.isDemo, true));
  const ids = demo.map((d) => d.id);
  let archived = 0, deleted = 0;
  if (ids.length) {
    const ordered = new Set((await db.selectDistinct({ id: schema.orderItems.productId }).from(schema.orderItems).where(inArray(schema.orderItems.productId, ids))).map((r) => r.id));
    const del = ids.filter((i) => !ordered.has(i));
    const arc = ids.filter((i) => ordered.has(i));
    if (del.length) await db.delete(schema.products).where(inArray(schema.products.id, del));
    if (arc.length) await db.update(schema.products).set({ status: 'ARCHIVED' }).where(inArray(schema.products.id, arc));
    deleted = del.length; archived = arc.length;
  }
  await db.delete(schema.suppliers).where(and(sql`${schema.suppliers.notes} = 'DEMO DATA'`, sql`not exists (select 1 from products p where p.supplier_id = ${schema.suppliers.id})`));
  await db.delete(schema.coupons).where(and(eq(schema.coupons.code, 'WELCOME10'), sql`${schema.coupons.description} like 'DEMO%'`));
  await audit(user.id, 'demo.remove', 'settings', null, { deleted, archived });
  revalidatePath('/', 'layout');
  return { ok: true, message: `Removed ${deleted} demo products${archived ? ` and archived ${archived} that appear in orders` : ''}. Categories were kept — edit or hide them in Categories.` };
}
