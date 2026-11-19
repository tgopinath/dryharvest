import { paiseToRupees } from './utils';

export type V = { id?: string; sku: string; label: string; weightGrams: number; price: string; mrp: string; cost: string; reorderLevel: number; isActive: boolean; stock?: number; openingStock?: number; batchNumber?: string; mfgDate?: string; bestBefore?: string };
export type ProductFormData = {
  id?: string; name: string; slug: string; categoryId: string; kind: 'FOOD' | 'PET' | 'DECOR'; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  shortDescription: string; description: string; tags: string; collections: string[]; isFeatured: boolean;
  ingredients: string; allergens: string; storage: string; usage: string; shelfLife: string; countryOfOrigin: string;
  manufacturer: string; packer: string; fssaiLicense: string; vegMark: '' | 'veg' | 'nonveg'; safetyNote: string; hsnCode: string; gstRate: string;
  nutritionBasis: string; nutrition: { label: string; per100g: string }[]; seoTitle: string; seoDescription: string; supplierId: string; isDemo: boolean;
  variants: V[]; images: { id: string; url: string; alt: string; sortOrder: number }[];
};


export function toFormData(p: {
  id: string; name: string; slug: string; categoryId: string; kind: 'FOOD' | 'PET' | 'DECOR'; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; shortDescription: string | null; description: string | null; tags: string[]; collections: string[]; isFeatured: boolean;
  ingredients: string | null; allergens: string | null; storage: string | null; usage: string | null; shelfLife: string | null; countryOfOrigin: string | null; manufacturer: string | null; packer: string | null; fssaiLicense: string | null; vegMark: boolean | null; safetyNote: string | null; hsnCode: string | null; gstRate: number | null;
  nutritionBasis: string | null; nutrition: { label: string; per100g: string }[] | null; seoTitle: string | null; seoDescription: string | null; supplierId: string | null; isDemo: boolean;
  variants: { id: string; sku: string; label: string; weightGrams: number; price: number; mrp: number; cost: number | null; reorderLevel: number; isActive: boolean; stock: number }[];
  images: { id: string; url: string; alt: string | null; sortOrder: number }[];
}): ProductFormData {
  const s = (x: string | null) => x ?? '';
  return {
    id: p.id, name: p.name, slug: p.slug, categoryId: p.categoryId, kind: p.kind, status: p.status, shortDescription: s(p.shortDescription), description: s(p.description),
    tags: p.tags.join(', '), collections: p.collections, isFeatured: p.isFeatured, ingredients: s(p.ingredients), allergens: s(p.allergens), storage: s(p.storage), usage: s(p.usage),
    shelfLife: s(p.shelfLife), countryOfOrigin: s(p.countryOfOrigin), manufacturer: s(p.manufacturer), packer: s(p.packer), fssaiLicense: s(p.fssaiLicense),
    vegMark: p.vegMark === true ? 'veg' : p.vegMark === false ? 'nonveg' : '', safetyNote: s(p.safetyNote), hsnCode: s(p.hsnCode), gstRate: p.gstRate == null ? '' : String(p.gstRate),
    nutritionBasis: s(p.nutritionBasis), nutrition: p.nutrition ?? [], seoTitle: s(p.seoTitle), seoDescription: s(p.seoDescription), supplierId: s(p.supplierId), isDemo: p.isDemo,
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label, weightGrams: v.weightGrams, price: paiseToRupees(v.price), mrp: paiseToRupees(v.mrp), cost: paiseToRupees(v.cost), reorderLevel: v.reorderLevel, isActive: v.isActive, stock: v.stock })),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? '', sortOrder: i.sortOrder })),
  };
}
