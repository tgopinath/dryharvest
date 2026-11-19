import type { Metadata } from 'next';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { getSetting } from '@/server/settings';
import { ContactForm } from '@/components/store/Forms';
import { PageHeader } from '@/components/store/Listing';

export const metadata: Metadata = { title: 'Contact us' };
export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const s = await getSetting('store');
  const rows = [
    s.email && { icon: Mail, label: 'Email', value: s.email, href: `mailto:${s.email}` },
    s.phone && { icon: Phone, label: 'Phone', value: s.phone, href: `tel:${s.phone}` },
    s.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: s.whatsapp, href: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}` },
    s.address && { icon: MapPin, label: 'Address', value: s.address },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];
  return (
    <div className="container-x py-12">
      <PageHeader title="Contact us" text="Questions about an order, a product or bulk buying? Send us a message." crumbs={[{ href: '/', label: 'Home' }, { href: '/contact', label: 'Contact' }]} />
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-brand-ink/10 bg-white p-6 sm:p-8"><ContactForm /></div>
        <aside className="space-y-4">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex gap-3 rounded-2xl bg-white p-4">
              <Icon className="mt-0.5 size-5 text-brand" />
              <div><p className="text-sm font-bold">{label}</p>{href ? <a className="text-sm underline" href={href}>{value}</a> : <p className="whitespace-pre-line text-sm">{value}</p>}</div>
            </div>
          ))}
          <p className="text-sm text-brand-ink/60">For order issues, include your order number so we can help faster.</p>
        </aside>
      </div>
    </div>
  );
}
