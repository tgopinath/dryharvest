import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'DryHarvest — Naturally Dried. Naturally Better.', template: '%s | DryHarvest' },
  description: 'Premium dried fruits, vegetables, herbs, flowers, spices and traditional South Indian dried foods, packed fresh and delivered across India.',
  openGraph: { type: 'website', siteName: 'DryHarvest', locale: 'en_IN' },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#176B36' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
