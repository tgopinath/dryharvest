import { asc, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { saveCategory, deleteCategory } from '../catalog-actions';

export const metadata = { title: 'Categories' };
type Cat = typeof schema.categories.$inferSelect;

function CategoryFields({ c, all }: { c?: Cat; all: Cat[] }) {
  const p = c?.id ?? 'new';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" htmlFor={`${p}n`}><Input id={`${p}n`} name="name" defaultValue={c?.name} required /></Field>
      <Field label="URL slug" htmlFor={`${p}s`}><Input id={`${p}s`} name="slug" defaultValue={c?.slug} /></Field>
      <Field label="Card subtitle" htmlFor={`${p}t`}><Input id={`${p}t`} name="tagline" defaultValue={c?.tagline ?? ''} /></Field>
      <Field label="Type" htmlFor={`${p}k`}><Select id={`${p}k`} name="kind" defaultValue={c?.kind ?? 'FOOD'}><option value="FOOD">Food</option><option value="PET">Pet</option><option value="DECOR">Decorative</option></Select></Field>
      <Field label="Description" htmlFor={`${p}d`} className="sm:col-span-2"><Textarea id={`${p}d`} name="description" rows={2} defaultValue={c?.description ?? ''} /></Field>
      <Field label="Parent category" htmlFor={`${p}p`}><Select id={`${p}p`} name="parentId" defaultValue={c?.parentId ?? ''}><option value="">None (top level)</option>{all.filter((x) => x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <Field label="Display order" htmlFor={`${p}o`}><Input id={`${p}o`} name="sortOrder" type="number" defaultValue={c?.sortOrder ?? all.length} /></Field>
      <Field label="Banner image (16:9)" htmlFor={`${p}b`} hint={c?.bannerUrl ? 'Uploading replaces the current banner' : 'Lifestyle image with space for the heading'}><Input id={`${p}b`} name="banner" type="file" accept="image/*" /></Field>
      <Field label="Card image (1:1)" htmlFor={`${p}i`}><Input id={`${p}i`} name="image" type="file" accept="image/*" /></Field>
      <Field label="SEO title" htmlFor={`${p}st`}><Input id={`${p}st`} name="seoTitle" defaultValue={c?.seoTitle ?? ''} /></Field>
      <Field label="Meta description" htmlFor={`${p}sd`}><Input id={`${p}sd`} name="seoDescription" defaultValue={c?.seoDescription ?? ''} /></Field>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} className="accent-brand" /> Visible on store</label>
        {c?.bannerUrl && <label className="flex items-center gap-2"><input type="checkbox" name="removeBanner" /> Remove banner</label>}
        {c?.imageUrl && <label className="flex items-center gap-2"><input type="checkbox" name="removeImage" /> Remove card image</label>}
        <Button size="sm" className="ml-auto">{c ? 'Save' : 'Add category'}</Button>
      </div>
    </div>
  );
}

export default async function Categories() {
  await requirePermission('categories:edit');
  const [cats, counts] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.name)] }),
    db.select({ id: schema.products.categoryId, n: sql<number>`count(*)::int` }).from(schema.products).groupBy(schema.products.categoryId),
  ]);
  const count = new Map(counts.map((c) => [c.id, c.n]));
  const roots = cats.filter((c) => !c.parentId);
  const ordered = roots.flatMap((r) => [r, ...cats.filter((c) => c.parentId === r.id)]);
  return (
    <>
      <AdminHeader title="Categories" text="Order sets the sequence on the homepage and menus. Categories with products are hidden rather than deleted." />
      <details className="mb-6 rounded-2xl border border-brand-ink/10 bg-white p-5"><summary className="cursor-pointer font-semibold text-brand">+ Add category</summary><ActionForm action={saveCategory} className="mt-4"><CategoryFields all={cats} /></ActionForm></details>
      <ul className="space-y-3">
        {ordered.map((c) => (
          <li key={c.id} className={`rounded-2xl border border-brand-ink/10 bg-white ${c.parentId ? 'ml-8' : ''}`}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-brand-ink/55">/{c.slug} · {count.get(c.id) ?? 0} products · order {c.sortOrder}</span>
                {c.kind !== 'FOOD' && <Badge tone="blue">{c.kind.toLowerCase()}</Badge>}
                {!c.isActive && <Badge tone="gray">hidden</Badge>}
                <span className="ml-auto text-sm font-semibold text-brand">Edit</span>
              </summary>
              <div className="border-t border-brand-ink/8 p-4">
                <ActionForm action={saveCategory}><CategoryFields c={c} all={cats} /></ActionForm>
                <form action={deleteCategory} className="mt-3"><input type="hidden" name="id" value={c.id} /><button className="text-sm font-semibold text-red-700">{count.get(c.id) ? 'Hide category' : 'Delete category'}</button></form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
