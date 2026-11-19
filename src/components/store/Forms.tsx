import { Alert } from '@/components/ui';

// Static demo: forms are disabled — nothing is submitted or stored.
export function NewsletterForm() {
  return <Alert className="w-full max-w-md">This is a demo store, so the newsletter is turned off.</Alert>;
}

export function ContactForm() {
  return <Alert>This is a demo store, so the contact form is turned off.</Alert>;
}
