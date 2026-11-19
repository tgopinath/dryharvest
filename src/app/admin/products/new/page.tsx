import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requirePermission } from '@/server/auth';
import { AdminHeader } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata = { title: 'Add product' };

export default async function NewProduct() {
  await requirePermission('products:edit');
  const [categories, suppliers] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder)] }),
    db.query.suppliers.findMany({ orderBy: [asc(schema.suppliers.name)] }),
  ]);
  return (
    <>
      <AdminHeader title="Add product" text="Saved as a draft until photos and label details are complete." />
      <ProductForm canEdit categories={categories} suppliers={suppliers} p={{
        name: '', slug: '', categoryId: '', kind: 'FOOD', status: 'DRAFT', shortDescription: '', description: '', tags: '', collections: [], isFeatured: false,
        ingredients: '', allergens: '', storage: 'Store in a cool, dry place. Reseal after opening.', usage: '', shelfLife: '', countryOfOrigin: 'India', manufacturer: '', packer: '',
        fssaiLicense: '', vegMark: 'veg', safetyNote: '', hsnCode: '', gstRate: '', nutritionBasis: 'Per 100 g', nutrition: [], seoTitle: '', seoDescription: '', supplierId: '', isDemo: false,
        variants: [], images: [],
      }} />
    </>
  );
}
