import { sql, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { getSetting } from '@/server/settings';
import { razorpayConfigured } from '@/server/razorpay';
import { AdminHeader, Panel } from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/ActionForm';
import { Alert, Badge, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { INDIAN_STATES, paiseToRupees } from '@/lib/utils';
import { saveStore, saveShipping, removeDemoData } from '../settings-actions';

export const metadata = { title: 'Settings' };

export default async function Settings() {
  await requirePermission('settings:edit');
  const [store, ship, [demo]] = await Promise.all([getSetting('store'), getSetting('shipping'), db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.isDemo, true))]);
  const env = [
    ['Razorpay payments', razorpayConfigured()],
    ['Razorpay webhook', !!process.env.RAZORPAY_WEBHOOK_SECRET],
    ['Google sign-in', !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)],
    ['Cloud image storage', process.env.STORAGE_DRIVER === 's3'],
    ['Stale-order cron', !!process.env.CRON_SECRET],
  ] as const;
  return (
    <>
      <AdminHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Store & legal details">
          <ActionForm action={saveStore} className="grid gap-3 sm:grid-cols-2">
            <Field label="Store name" htmlFor="sn"><Input id="sn" name="name" defaultValue={store.name} /></Field>
            <Field label="Tagline" htmlFor="tg"><Input id="tg" name="tagline" defaultValue={store.tagline} /></Field>
            <Field label="Registered business name" htmlFor="ln" hint="Shown on invoices"><Input id="ln" name="legalName" defaultValue={store.legalName} /></Field>
            <Field label="GSTIN" htmlFor="gs"><Input id="gs" name="gstin" defaultValue={store.gstin} maxLength={15} /></Field>
            <Field label="FSSAI licence no." htmlFor="fs" hint="Shown on food product pages and the footer"><Input id="fs" name="fssaiLicense" defaultValue={store.fssaiLicense} inputMode="numeric" maxLength={14} /></Field>
            <Field label="Business state" htmlFor="st" hint="Decides CGST+SGST vs IGST on invoices"><Select id="st" name="state" defaultValue={store.state}>{INDIAN_STATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Support email" htmlFor="em"><Input id="em" name="email" type="email" defaultValue={store.email} /></Field>
            <Field label="Support phone" htmlFor="ph"><Input id="ph" name="phone" defaultValue={store.phone} /></Field>
            <Field label="WhatsApp number" htmlFor="wa"><Input id="wa" name="whatsapp" defaultValue={store.whatsapp} /></Field>
            <Field label="Instagram URL" htmlFor="ig"><Input id="ig" name="instagram" defaultValue={store.instagram} /></Field>
            <Field label="Facebook URL" htmlFor="fb"><Input id="fb" name="facebook" defaultValue={store.facebook} /></Field>
            <Field label="YouTube URL" htmlFor="yt"><Input id="yt" name="youtube" defaultValue={store.youtube} /></Field>
            <Field label="Registered address" htmlFor="ad" className="sm:col-span-2"><Textarea id="ad" name="address" rows={3} defaultValue={store.address} /></Field>
            <Field label="Announcement bar (blank to hide)" htmlFor="an" className="sm:col-span-2"><Input id="an" name="announcement" defaultValue={store.announcement} /></Field>
            <div><Button>Save store details</Button></div>
          </ActionForm>
        </Panel>
        <div className="space-y-6">
          <Panel title="Shipping & payments">
            <ActionForm action={saveShipping} className="grid gap-3 sm:grid-cols-2">
              <Field label="Flat shipping charge (₹)" htmlFor="fr"><Input id="fr" name="flatRate" inputMode="decimal" defaultValue={paiseToRupees(ship.flatRate)} /></Field>
              <Field label="Free shipping above (₹)" htmlFor="fa" hint="Blank = never free"><Input id="fa" name="freeAbove" inputMode="decimal" defaultValue={paiseToRupees(ship.freeAbove)} /></Field>
              <Field label="Serviceable pincode prefixes" htmlFor="pc" hint="e.g. 600, 641 — blank = all India" className="sm:col-span-2"><Input id="pc" name="pincodes" defaultValue={ship.serviceablePincodePrefixes.join(', ')} /></Field>
              <Field label="Dispatch note" htmlFor="dn" className="sm:col-span-2"><Input id="dn" name="dispatchNote" defaultValue={ship.dispatchNote} /></Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="codEnabled" defaultChecked={ship.codEnabled} className="accent-brand" /> Offer cash on delivery</label>
              <Field label="COD fee (₹)" htmlFor="cf"><Input id="cf" name="codFee" inputMode="decimal" defaultValue={paiseToRupees(ship.codFee)} /></Field>
              <Field label="COD max order value (₹)" htmlFor="cm"><Input id="cm" name="codMaxOrder" inputMode="decimal" defaultValue={paiseToRupees(ship.codMaxOrder)} /></Field>
              <div><Button>Save shipping</Button></div>
            </ActionForm>
          </Panel>
          <Panel title="Integrations (set in environment variables)">
            <ul className="space-y-2 text-sm">{env.map(([l, ok]) => <li key={l} className="flex justify-between"><span>{l}</span><Badge tone={ok ? 'green' : 'gray'}>{ok ? 'configured' : 'not configured'}</Badge></li>)}</ul>
            {!razorpayConfigured() && <Alert tone="warn" className="mt-4">Online payment is off until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. Customers cannot check out unless COD is enabled.</Alert>}
          </Panel>
          <Panel title="Demo data">
            {demo.n ? (
              <ActionForm action={removeDemoData} className="space-y-3">
                <p className="text-sm">{demo.n} demo products, demo suppliers and the WELCOME10 demo coupon are in the store. Products that appear in orders are archived instead of deleted.</p>
                <Field label="Type REMOVE DEMO to confirm" htmlFor="cf2"><Input id="cf2" name="confirm" autoComplete="off" /></Field>
                <Button variant="danger">Remove demo data</Button>
              </ActionForm>
            ) : <p className="text-sm text-brand-ink/60">No demo products remain.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
