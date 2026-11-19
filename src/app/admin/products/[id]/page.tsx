import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission, can } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';
import { toFormData } from '@/lib/product-form';
import { Alert, Badge } from '@/components/ui';

export const metadata = { title: 'Edit product' };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; duplicated?: string; unpublished?: string }> }) {
  const user = await requirePermission('products:view');
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: { orderBy: (v, { asc }) => [asc(v.sortOrder)] }, images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] } } });
  if (!p) notFound();
  const [categories, suppliers] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
    db.query.suppliers.findMany({ orderBy: [asc(schema.suppliers.name)] }),
  ]);
  return (
    <>
      <AdminHeader title={p.name} text={`Last updated ${p.updatedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`} actions={<Badge tone={p.status === 'PUBLISHED' ? 'green' : p.status === 'DRAFT' ? 'yellow' : 'gray'}>{p.status.toLowerCase()}</Badge>} />
      {sp.created && <Alert tone={sp.unpublished ? 'warn' : 'success'} className="mb-4">{sp.unpublished ? 'Product created as a draft. Add photos and the required label details, then publish.' : 'Product created.'}</Alert>}
      {sp.duplicated && <Alert tone="success" className="mb-4">Duplicated as a draft with new SKUs and zero stock. Edit and publish when ready.</Alert>}
      <ProductForm key={p.updatedAt.toISOString()} p={toFormData(p)} categories={categories} suppliers={suppliers} canEdit={can(user.role, 'products:edit')} />
    </>
  );
}
