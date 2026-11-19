'use client';
import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ImagePlus } from 'lucide-react';
import { saveProduct, setProductStatus, duplicateProduct, type ProductFormState } from '@/app/admin/products/actions';
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { ProductArt } from '@/components/store/ProductArt';
import { useToast } from '@/components/ui/toast';
import { cn, slugify } from '@/lib/utils';
import type { ProductFormData, V } from '@/lib/product-form';
export type { ProductFormData };

export const COLLECTIONS = [
  ['best-sellers', 'Best sellers'], ['south-indian', 'Traditional South Indian'], ['natural-snacks', 'Dried fruits & natural snacks'],
  ['veg-herbs', 'Vegetables, herbs & powders'], ['tea', 'Flowers & herbal tea'], ['ready-to-cook', 'Ready-to-cook'], ['combo', 'Combo packs & gift boxes'],
] as const;

const NUTRIENTS = ['Energy (kcal)', 'Protein (g)', 'Carbohydrate (g)', 'Total sugars (g)', 'Added sugars (g)', 'Total fat (g)', 'Saturated fat (g)', 'Trans fat (g)', 'Sodium (mg)', 'Dietary fibre (g)'];

export function ProductForm({ p, categories, suppliers, canEdit }: { p: ProductFormData; categories: { id: string; name: string; kind: string }[]; suppliers: { id: string; name: string }[]; canEdit: boolean }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const [variants, setVariants] = useState<V[]>(p.variants.length ? p.variants : [{ sku: '', label: '100g', weightGrams: 100, price: '', mrp: '', cost: '', reorderLevel: 10, isActive: true, openingStock: 0 }]);
  const [images, setImages] = useState(p.images.map((i) => ({ ...i, remove: false })));
  const [nutrition, setNutrition] = useState(p.nutrition);
  const [name, setName] = useState(p.name);
  const [slug, setSlug] = useState(p.slug);
  const [kind, setKind] = useState(p.kind);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, start] = useTransition();
  const toast = useToast();
  const upd = (i: number, patch: Partial<V>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  const skuBase = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).map((w) => w.slice(0, 3)).join('').toUpperCase().slice(0, 9);

  return (
    <form action={action} className="space-y-6">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="nutrition" value={JSON.stringify(nutrition)} />
      <input type="hidden" name="images" value={JSON.stringify(images.map(({ id, alt, sortOrder, remove }) => ({ id, alt, sortOrder, remove })))} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone={state.issues?.length ? 'warn' : 'success'}>{state.message}{state.issues?.length ? <ul className="mt-2 list-disc pl-5">{state.issues.map((i) => <li key={i}>{i}</li>)}</ul> : null}</Alert>}
      {p.isDemo && <Alert tone="warn">This is a demo product. Replace the description, prices and images with real, verified information — or delete it.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" htmlFor="name" className="sm:col-span-2"><Input id="name" name="name" value={name} onChange={(e) => { setName(e.target.value); if (!p.id) setSlug(slugify(e.target.value)); }} required /></Field>
              <Field label="URL slug" htmlFor="slug" hint={`/product/${slug || '…'}`}><Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></Field>
              <Field label="Category" htmlFor="categoryId">
                <Select id="categoryId" name="categoryId" defaultValue={p.categoryId} required onChange={(e) => { const c = categories.find((x) => x.id === e.target.value); if (c) setKind(c.kind as 'FOOD'); }}>
                  <option value="" disabled>Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Product type" htmlFor="kind" hint="Pet and decorative items are kept separate from human food and show a safety notice.">
                <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as 'FOOD')}><option value="FOOD">Food (human consumption)</option><option value="PET">Pet product</option><option value="DECOR">Decorative / non-edible</option></Select>
              </Field>
              <Field label="Supplier" htmlFor="supplierId"><Select id="supplierId" name="supplierId" defaultValue={p.supplierId}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Short description" htmlFor="sd" hint="Shown on product cards and search results" className="sm:col-span-2"><Input id="sd" name="shortDescription" defaultValue={p.shortDescription} maxLength={300} /></Field>
              <Field label="Full description" htmlFor="desc" className="sm:col-span-2"><Textarea id="desc" name="description" defaultValue={p.description} rows={6} /></Field>
              <Field label="Search tags" htmlFor="tags" hint="Comma separated — include local names, e.g. vendakkai, bhindi" className="sm:col-span-2"><Input id="tags" name="tags" defaultValue={p.tags} /></Field>
            </div>
          </Section>

          <Section title="Pack sizes, prices & stock" text="Prices in ₹ including GST. Stock for existing pack sizes is changed from Inventory so every change is logged.">
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className={cn('rounded-xl border p-4', v.isActive ? 'border-brand-ink/10' : 'border-dashed border-brand-ink/15 opacity-70')}>
                  <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    <Field label="Label" htmlFor={`v${i}l`}><Input id={`v${i}l`} value={v.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="100g" /></Field>
                    <Field label="Weight (g)" htmlFor={`v${i}w`}><Input id={`v${i}w`} type="number" min={0} value={v.weightGrams} onChange={(e) => upd(i, { weightGrams: Number(e.target.value) })} /></Field>
                    <Field label="SKU" htmlFor={`v${i}s`} className="sm:col-span-2"><Input id={`v${i}s`} value={v.sku} onChange={(e) => upd(i, { sku: e.target.value.toUpperCase() })} placeholder={`DH-${skuBase}-${v.label.toUpperCase()}`} onFocus={() => !v.sku && upd(i, { sku: `DH-${skuBase}-${v.label.replace(/[^0-9a-z]/gi, '').toUpperCase()}` })} /></Field>
                    <Field label="Price ₹" htmlFor={`v${i}p`}><Input id={`v${i}p`} inputMode="decimal" value={v.price} onChange={(e) => upd(i, { price: e.target.value })} /></Field>
                    <Field label="MRP ₹" htmlFor={`v${i}m`}><Input id={`v${i}m`} inputMode="decimal" value={v.mrp} onChange={(e) => upd(i, { mrp: e.target.value })} /></Field>
                    <Field label="Cost ₹" htmlFor={`v${i}c`}><Input id={`v${i}c`} inputMode="decimal" value={v.cost} onChange={(e) => upd(i, { cost: e.target.value })} /></Field>
                    <Field label="Reorder at" htmlFor={`v${i}r`}><Input id={`v${i}r`} type="number" min={0} value={v.reorderLevel} onChange={(e) => upd(i, { reorderLevel: Number(e.target.value) })} /></Field>
                  </div>
                  {v.id ? (
                    <p className="mt-3 text-sm text-brand-ink/65">In stock: <b>{v.stock ?? 0}</b> · <Link className="font-semibold text-brand underline" href={`/admin/inventory/${v.id}`}>Receive stock, batches &amp; history</Link></p>
                  ) : (
                    <div className="mt-3 grid gap-3 rounded-lg bg-brand-pale/60 p-3 sm:grid-cols-4">
                      <Field label="Opening stock" htmlFor={`v${i}o`}><Input id={`v${i}o`} type="number" min={0} value={v.openingStock ?? 0} onChange={(e) => upd(i, { openingStock: Number(e.target.value) })} /></Field>
                      <Field label="Batch no." htmlFor={`v${i}b`}><Input id={`v${i}b`} value={v.batchNumber ?? ''} onChange={(e) => upd(i, { batchNumber: e.target.value })} /></Field>
                      <Field label="Mfg / packed date" htmlFor={`v${i}md`}><Input id={`v${i}md`} type="date" value={v.mfgDate ?? ''} onChange={(e) => upd(i, { mfgDate: e.target.value })} /></Field>
                      <Field label="Best before" htmlFor={`v${i}bb`}><Input id={`v${i}bb`} type="date" value={v.bestBefore ?? ''} onChange={(e) => upd(i, { bestBefore: e.target.value })} /></Field>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand" checked={v.isActive} onChange={(e) => upd(i, { isActive: e.target.checked })} /> Available for sale</label>
                    {!v.id && variants.length > 1 && <button type="button" onClick={() => setVariants((vs) => vs.filter((_, k) => k !== i))} className="flex items-center gap-1 font-semibold text-red-700"><Trash2 className="size-3.5" /> Remove</button>}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setVariants((vs) => [...vs, { sku: '', label: '', weightGrams: 0, price: '', mrp: '', cost: '', reorderLevel: 10, isActive: true, openingStock: 0 }])}><Plus className="size-4" /> Add pack size</Button>
            </div>
          </Section>

          <Section title="Images" text="Square 1:1, JPG/PNG/WebP up to 5 MB. Use real product photos only — one SKU per image, no collages. The first image is the main photo.">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((im, i) => (
                <li key={im.id} className={cn('space-y-2 rounded-xl border p-2', im.remove ? 'border-red-300 opacity-50' : 'border-brand-ink/10')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={im.alt} className="aspect-square w-full rounded-lg object-cover" />
                  <Input aria-label="Alt text" value={im.alt} onChange={(e) => setImages((x) => x.map((y, k) => (k === i ? { ...y, alt: e.target.value } : y)))} placeholder="Alt text" />
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1">Order <input type="number" className="w-12 rounded border px-1" value={im.sortOrder} onChange={(e) => setImages((x) => x.map((y, k) => (k === i ? { ...y, sortOrder: Number(e.target.value) } : y)))} /></label>
                    <label className="flex items-center gap-1 text-red-700"><input type="checkbox" checked={im.remove} onChange={(e) => setImages((x) => x.map((y, k) => (k === i ? { ...y, remove: e.target.checked } : y)))} /> Remove</label>
                  </div>
                </li>
              ))}
              {previews.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <li key={u} className="rounded-xl border border-dashed border-brand p-2"><img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" /><p className="mt-1 text-center text-xs text-brand">New — uploads on save</p></li>
              ))}
              {!images.length && !previews.length && <li className="overflow-hidden rounded-xl border border-dashed border-brand-ink/20"><ProductArt name={name || 'Product'} /></li>}
            </ul>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-ink/15 bg-white px-4 py-2 text-sm font-semibold hover:border-brand">
              <ImagePlus className="size-4" /> Add images
              <input type="file" name="newImages" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
            </label>
          </Section>

          <Section title={kind === 'FOOD' ? 'Food information & label' : 'Product information'} text="Only fill in verified information. Empty fields are hidden on the store — nothing is auto-generated.">
            <div className="grid gap-4 sm:grid-cols-2">
              {kind === 'FOOD' && <Field label="Ingredients" htmlFor="ing" className="sm:col-span-2"><Textarea id="ing" name="ingredients" defaultValue={p.ingredients} rows={2} /></Field>}
              {kind === 'FOOD' && <Field label="Allergen information" htmlFor="alg" className="sm:col-span-2"><Input id="alg" name="allergens" defaultValue={p.allergens} placeholder="e.g. Packed in a facility that also handles nuts" /></Field>}
              {kind !== 'FOOD' && <Field label="Safety note (shown prominently)" htmlFor="safe" className="sm:col-span-2"><Input id="safe" name="safetyNote" defaultValue={p.safetyNote} /></Field>}
              <Field label="Storage instructions" htmlFor="sto"><Textarea id="sto" name="storage" defaultValue={p.storage} rows={2} /></Field>
              <Field label={kind === 'FOOD' ? 'Usage / preparation' : 'How to use'} htmlFor="use"><Textarea id="use" name="usage" defaultValue={p.usage} rows={2} /></Field>
              {kind === 'FOOD' && <Field label="Shelf life" htmlFor="shelf"><Input id="shelf" name="shelfLife" defaultValue={p.shelfLife} placeholder="e.g. 9 months from packing" /></Field>}
              <Field label="Country of origin" htmlFor="coo"><Input id="coo" name="countryOfOrigin" defaultValue={p.countryOfOrigin} /></Field>
              <Field label="Manufactured by (name & address)" htmlFor="mfr"><Textarea id="mfr" name="manufacturer" defaultValue={p.manufacturer} rows={2} /></Field>
              <Field label="Packed by (name & address)" htmlFor="pkr"><Textarea id="pkr" name="packer" defaultValue={p.packer} rows={2} /></Field>
              {kind === 'FOOD' && <Field label="FSSAI licence no." htmlFor="fssai" hint="14 digits. Leave blank to use the store licence from Settings."><Input id="fssai" name="fssaiLicense" defaultValue={p.fssaiLicense} inputMode="numeric" maxLength={14} /></Field>}
              {kind === 'FOOD' && <Field label="Veg / non-veg mark" htmlFor="veg"><Select id="veg" name="vegMark" defaultValue={p.vegMark}><option value="">Not shown</option><option value="veg">Vegetarian (green dot)</option><option value="nonveg">Non-vegetarian (brown dot)</option></Select></Field>}
              <Field label="HSN code" htmlFor="hsn"><Input id="hsn" name="hsnCode" defaultValue={p.hsnCode} /></Field>
              <Field label="GST rate" htmlFor="gst" hint="Used for tax breakdown on invoices"><Select id="gst" name="gstRate" defaultValue={p.gstRate}><option value="">Not set</option>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</Select></Field>
            </div>
            {kind === 'FOOD' && (
              <div className="mt-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <p className="text-sm font-semibold">Nutrition panel <span className="font-normal text-brand-ink/55">(from your lab report — leave empty if you don’t have one)</span></p>
                  <Field label="Basis" htmlFor="nb"><Input id="nb" name="nutritionBasis" defaultValue={p.nutritionBasis} placeholder="Per 100 g" className="h-9" /></Field>
                </div>
                <div className="mt-3 space-y-2">
                  {nutrition.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input aria-label="Nutrient" list="nutrients" value={n.label} onChange={(e) => setNutrition((x) => x.map((y, k) => (k === i ? { ...y, label: e.target.value } : y)))} />
                      <Input aria-label="Value" value={n.per100g} onChange={(e) => setNutrition((x) => x.map((y, k) => (k === i ? { ...y, per100g: e.target.value } : y)))} className="max-w-36" />
                      <button type="button" aria-label="Remove row" onClick={() => setNutrition((x) => x.filter((_, k) => k !== i))}><Trash2 className="size-4 text-red-700" /></button>
                    </div>
                  ))}
                  <datalist id="nutrients">{NUTRIENTS.map((n) => <option key={n} value={n} />)}</datalist>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNutrition((x) => [...x, { label: '', per100g: '' }])}><Plus className="size-4" /> Add nutrient</Button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Search engine listing">
            <div className="grid gap-4">
              <Field label="SEO title" htmlFor="st" hint="Up to 70 characters. Defaults to the product name."><Input id="st" name="seoTitle" defaultValue={p.seoTitle} maxLength={70} /></Field>
              <Field label="Meta description" htmlFor="sdx" hint="Up to 170 characters. Defaults to the short description."><Textarea id="sdx" name="seoDescription" defaultValue={p.seoDescription} maxLength={170} rows={2} /></Field>
            </div>
          </Section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Section title="Publishing">
            <Field label="Status" htmlFor="status" hint="Publishing checks photos and label information first."><Select id="status" name="status" defaultValue={p.status}><option value="DRAFT">Draft (hidden)</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></Select></Field>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured} className="accent-brand" /> Featured (sorted first)</label>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Homepage collections</legend>
              <div className="mt-2 space-y-1.5 text-sm">{COLLECTIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="collections" value={k} defaultChecked={p.collections.includes(k)} className="accent-brand" /> {l}</label>)}</div>
            </fieldset>
            {canEdit && <Button size="lg" className="mt-5 w-full" disabled={pending}>{pending && <Spinner />}{p.id ? 'Save product' : 'Create product'}</Button>}
          </Section>
          {p.id && canEdit && (
            <Section title="Actions">
              <div className="flex flex-col gap-2">
                <Link href={`/product/${p.slug}`} target="_blank" className="text-sm font-semibold text-brand underline">View on store</Link>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => start(() => duplicateProduct(p.id!))}>Duplicate</Button>
                {p.status !== 'ARCHIVED' && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => start(async () => { const r = await setProductStatus(p.id!, 'ARCHIVED'); toast(r.ok ? 'Archived' : r.error ?? 'Failed', r.ok ? 'success' : 'error'); })}>Archive</Button>}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </form>
  );
}

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-ink/10 bg-white p-5 sm:p-6">
      <h2 className="font-sans text-base font-bold tracking-normal">{title}</h2>
      {text && <p className="mt-1 text-sm text-brand-ink/60">{text}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

