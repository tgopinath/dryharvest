import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { getSetting } from '@/server/settings';
import { AdminHeader, Panel } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Badge, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { saveSection, saveClaims, saveContent } from '../settings-actions';

export const metadata = { title: 'Homepage & content' };

export default async function Cms() {
  await requirePermission('cms:edit');
  const [sections, claims, policies, about] = await Promise.all([
    db.query.homeSections.findMany({ orderBy: [asc(schema.homeSections.sortOrder)] }),
    getSetting('heroClaims'), getSetting('policies'), getSetting('about'),
  ]);
  return (
    <>
      <AdminHeader title="Homepage & content" text="Reorder, hide and edit homepage sections. Product rows pull from the collections you tick on each product." />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Homepage sections">
          <ul className="space-y-3">
            {sections.map((s) => {
              const d = (s.data ?? {}) as { primaryCta?: { label: string; href: string }; secondaryCta?: { label: string; href: string }; imageUrl?: string; points?: { title: string; text: string }[]; collection?: string };
              return (
                <li key={s.id} className="rounded-xl border border-brand-ink/10">
                  <details>
                    <summary className="flex cursor-pointer items-center gap-3 p-3 text-sm"><span className="w-6 text-brand-ink/50">{s.sortOrder}</span><span className="font-semibold">{s.title}</span><span className="text-brand-ink/50">{s.key}{d.collection ? ` · collection “${d.collection}”` : ''}</span>{!s.isVisible && <Badge tone="gray">hidden</Badge>}<span className="ml-auto font-semibold text-brand">Edit</span></summary>
                    <ActionForm action={saveSection} className="grid gap-3 border-t border-brand-ink/8 p-4 sm:grid-cols-2">
                      <input type="hidden" name="id" value={s.id} />
                      <Field label="Heading" htmlFor={`${s.id}t`} className="sm:col-span-2"><Input id={`${s.id}t`} name="title" defaultValue={s.title} /></Field>
                      <Field label="Small label above heading" htmlFor={`${s.id}e`}><Input id={`${s.id}e`} name="eyebrow" defaultValue={s.eyebrow ?? ''} /></Field>
                      <Field label="Order" htmlFor={`${s.id}o`}><Input id={`${s.id}o`} name="sortOrder" type="number" defaultValue={s.sortOrder} /></Field>
                      <Field label="Supporting text" htmlFor={`${s.id}s`} className="sm:col-span-2"><Textarea id={`${s.id}s`} name="subtitle" rows={2} defaultValue={s.subtitle ?? ''} /></Field>
                      {s.key === 'hero' && (
                        <>
                          <Field label="Primary button" htmlFor={`${s.id}pl`}><Input id={`${s.id}pl`} name="primaryLabel" defaultValue={d.primaryCta?.label} /></Field>
                          <Field label="Primary link" htmlFor={`${s.id}ph`}><Input id={`${s.id}ph`} name="primaryHref" defaultValue={d.primaryCta?.href} /></Field>
                          <Field label="Secondary button" htmlFor={`${s.id}sl`}><Input id={`${s.id}sl`} name="secondaryLabel" defaultValue={d.secondaryCta?.label} /></Field>
                          <Field label="Secondary link" htmlFor={`${s.id}sh`}><Input id={`${s.id}sh`} name="secondaryHref" defaultValue={d.secondaryCta?.href} /></Field>
                          <Field label="Hero image (5:4 studio composition)" htmlFor={`${s.id}hi`} hint={d.imageUrl ? 'Current image set — uploading replaces it' : 'Until uploaded, an illustrated composition is shown'} className="sm:col-span-2"><Input id={`${s.id}hi`} name="heroImage" type="file" accept="image/*" /></Field>
                          {d.imageUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" /> Remove hero image</label>}
                        </>
                      )}
                      {s.key === 'why' && [0, 1, 2, 3].map((i) => (
                        <div key={i} className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_2fr]">
                          <Input aria-label={`Point ${i + 1} title`} name={`p${i}t`} defaultValue={d.points?.[i]?.title} placeholder="Title" />
                          <Input aria-label={`Point ${i + 1} text`} name={`p${i}x`} defaultValue={d.points?.[i]?.text} placeholder="Text" />
                        </div>
                      ))}
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked={s.isVisible} className="accent-brand" /> Visible</label>
                      <div className="text-right"><Button size="sm">Save section</Button></div>
                    </ActionForm>
                  </details>
                </li>
              );
            })}
          </ul>
        </Panel>
        <div className="space-y-6">
          <Panel title="Hero claim cards">
            <p className="mb-4 text-sm text-brand-ink/65">Floating cards on the hero (quality, delivery, rating). They stay hidden until you tick “verified” — only publish claims you can back up.</p>
            <ActionForm action={saveClaims} className="space-y-4">
              {claims.map((c) => (
                <fieldset key={c.id} className="space-y-2 rounded-xl border border-brand-ink/10 p-3">
                  <legend className="px-1 text-xs font-semibold text-brand-ink/60">{c.id}</legend>
                  <div className="grid grid-cols-[1fr_120px] gap-2"><Input aria-label="Title" name={`${c.id}.title`} defaultValue={c.title} /><Select aria-label="Icon" name={`${c.id}.icon`} defaultValue={c.icon}><option value="leaf">Leaf</option><option value="truck">Truck</option><option value="star">Star</option><option value="shield">Shield</option></Select></div>
                  <Input aria-label="Text" name={`${c.id}.text`} defaultValue={c.text} />
                  <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name={`${c.id}.verified`} defaultChecked={c.verified} className="accent-brand" /> Claim verified</label><label className="flex items-center gap-2"><input type="checkbox" name={`${c.id}.visible`} defaultChecked={c.visible} className="accent-brand" /> Show on homepage</label></div>
                </fieldset>
              ))}
              <Button size="sm">Save claims</Button>
            </ActionForm>
          </Panel>
          <Panel title="About & policy pages">
            <ActionForm action={saveContent} className="space-y-3">
              <Field label="About heading" htmlFor="ah"><Input id="ah" name="aboutHeading" defaultValue={about.heading} /></Field>
              <Field label="About story" htmlFor="ab"><Textarea id="ab" name="aboutBody" rows={5} defaultValue={about.body} /></Field>
              {(['shipping', 'returns', 'refund', 'privacy', 'terms'] as const).map((k) => <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} policy`} htmlFor={`pol-${k}`}><Textarea id={`pol-${k}`} name={k} rows={4} defaultValue={policies[k]} /></Field>)}
              <Button size="sm">Save pages</Button>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
