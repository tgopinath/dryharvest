import 'server-only';
import { getSetting } from './settings';

/** Things that must be true before a product can be published (demo items are exempt from food-label checks). */
export async function complianceIssues(p: { kind: string; isDemo: boolean; ingredients?: string | null; manufacturer?: string | null; packer?: string | null; fssaiLicense?: string | null; storage?: string | null; safetyNote?: string | null }, imageCount: number, activeVariants: number) {
  const issues: string[] = [];
  if (activeVariants < 1) issues.push('Add at least one active pack size.');
  if (p.isDemo) return issues;
  if (imageCount < 1) issues.push('Upload at least one product photo.');
  if (p.kind === 'FOOD') {
    const store = await getSetting('store');
    if (!p.ingredients) issues.push('Ingredients are required for food products.');
    if (!p.manufacturer && !p.packer) issues.push('Manufacturer or packer name and address is required.');
    if (!p.fssaiLicense && !store.fssaiLicense) issues.push('An FSSAI licence number is required (on the product or in Settings).');
    if (!p.storage) issues.push('Storage instructions are required.');
  } else if (!p.safetyNote) {
    issues.push(p.kind === 'PET' ? 'Add a safety note (e.g. "For animal use only").' : 'Add a safety note (e.g. "Decorative — not edible").');
  }
  return issues;
}

