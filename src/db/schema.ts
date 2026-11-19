// DryHarvest data model. All money values are integer paise (₹1 = 100).
import { relations, sql } from 'drizzle-orm';
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const roleEnum = pgEnum('role', ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN']);
// FOOD = human food. PET = animal treats/feed. DECOR = non-edible decorative botanicals.
export const kindEnum = pgEnum('product_kind', ['FOOD', 'PET', 'DECOR']);
export const productStatusEnum = pgEnum('product_status', ['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED',
  'RETURN_REQUESTED', 'RETURNED',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED',
]);
export const paymentMethodEnum = pgEnum('payment_method', ['RAZORPAY', 'COD']);
export const couponTypeEnum = pgEnum('coupon_type', ['PERCENT', 'FLAT']);
export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const requestTypeEnum = pgEnum('request_type', ['CANCEL', 'RETURN']);
export const requestStatusEnum = pgEnum('request_status', ['OPEN', 'APPROVED', 'REJECTED', 'COMPLETED']);
export const stockReasonEnum = pgEnum('stock_reason', [
  'INITIAL', 'PURCHASE', 'SALE', 'CANCELLATION', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'EXPIRY',
]);

export type Role = (typeof roleEnum.enumValues)[number];
export type ProductKind = (typeof kindEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type StockReason = (typeof stockReasonEnum.enumValues)[number];

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  role: roleEnum('role').notNull().default('CUSTOMER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // sha256 of cookie token
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

export const addresses = pgTable('addresses', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  line1: text('line1').notNull(),
  line2: text('line2'),
  landmark: text('landmark'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index('addresses_user_idx').on(t.userId)]);

export const categories = pgTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  bannerUrl: text('banner_url'),
  imageUrl: text('image_url'),
  kind: kindEnum('kind').notNull().default('FOOD'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const suppliers = pgTable('suppliers', {
  id: id(),
  name: text('name').notNull(),
  contact: text('contact'),
  email: text('email'),
  phone: text('phone'),
  gstin: text('gstin'),
  address: text('address'),
  notes: text('notes'),
  createdAt: createdAt(),
});

export type NutritionRow = { label: string; per100g: string };

export const products = pgTable('products', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  description: text('description'),
  categoryId: text('category_id').notNull().references(() => categories.id),
  kind: kindEnum('kind').notNull().default('FOOD'),
  status: productStatusEnum('status').notNull().default('DRAFT'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  // e.g. best-sellers, south-indian, combo, natural-snacks
  collections: text('collections').array().notNull().default(sql`'{}'::text[]`),
  isFeatured: boolean('is_featured').notNull().default(false),
  // Food information: only displayed when filled in, never auto-generated.
  ingredients: text('ingredients'),
  allergens: text('allergens'),
  nutrition: jsonb('nutrition').$type<NutritionRow[]>(),
  nutritionBasis: text('nutrition_basis'),
  storage: text('storage'),
  usage: text('usage'),
  shelfLife: text('shelf_life'),
  countryOfOrigin: text('country_of_origin').default('India'),
  manufacturer: text('manufacturer'),
  packer: text('packer'),
  fssaiLicense: text('fssai_license'),
  vegMark: boolean('veg_mark'),
  safetyNote: text('safety_note'),
  hsnCode: text('hsn_code'),
  gstRate: integer('gst_rate'), // percent, prices are tax-inclusive
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('products_cat_status_idx').on(t.categoryId, t.status), index('products_status_idx').on(t.status)]);

export const productImages = pgTable('product_images', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: text('alt'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index('product_images_product_idx').on(t.productId)]);

export const variants = pgTable('variants', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  label: text('label').notNull(),
  weightGrams: integer('weight_grams').notNull(),
  price: integer('price').notNull(),
  mrp: integer('mrp').notNull(),
  cost: integer('cost'),
  stock: integer('stock').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('variants_product_idx').on(t.productId)]);

export const batches = pgTable('batches', {
  id: id(),
  variantId: text('variant_id').notNull().references(() => variants.id, { onDelete: 'cascade' }),
  batchNumber: text('batch_number').notNull(),
  mfgDate: timestamp('mfg_date', { withTimezone: true }),
  bestBefore: timestamp('best_before', { withTimezone: true }),
  quantity: integer('quantity').notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  unitCost: integer('unit_cost'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('batches_variant_number_uq').on(t.variantId, t.batchNumber), index('batches_bb_idx').on(t.bestBefore)]);

export const stockMovements = pgTable('stock_movements', {
  id: id(),
  variantId: text('variant_id').notNull().references(() => variants.id, { onDelete: 'cascade' }),
  batchId: text('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  change: integer('change').notNull(),
  balance: integer('balance').notNull(),
  reason: stockReasonEnum('reason').notNull(),
  note: text('note'),
  orderId: text('order_id'),
  userId: text('user_id'),
  createdAt: createdAt(),
}, (t) => [index('stock_movements_variant_idx').on(t.variantId, t.createdAt)]);

export const carts = pgTable('carts', {
  id: id(),
  userId: text('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  couponCode: text('coupon_code'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable('cart_items', {
  id: id(),
  cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').notNull().references(() => variants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
}, (t) => [uniqueIndex('cart_items_cart_variant_uq').on(t.cartId, t.variantId)]);

export const wishlistItems = pgTable('wishlist_items', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const coupons = pgTable('coupons', {
  id: id(),
  code: text('code').notNull().unique(),
  description: text('description'),
  type: couponTypeEnum('type').notNull(),
  value: integer('value').notNull(), // percent or paise
  minOrder: integer('min_order').notNull().default(0),
  maxDiscount: integer('max_discount'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  perUserLimit: integer('per_user_limit'),
  usedCount: integer('used_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
});

export type ShippingAddress = {
  fullName: string; phone: string; line1: string; line2?: string | null; landmark?: string | null;
  city: string; state: string; pincode: string;
};

export const orders = pgTable('orders', {
  id: id(),
  number: text('number').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  status: orderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  total: integer('total').notNull(),
  couponCode: text('coupon_code'),
  shippingAddress: jsonb('shipping_address').$type<ShippingAddress>().notNull(),
  razorpayOrderId: text('razorpay_order_id').unique(),
  razorpayPaymentId: text('razorpay_payment_id'),
  courier: text('courier'),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  notes: text('notes'),
  stockReleased: boolean('stock_released').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index('orders_user_idx').on(t.userId), index('orders_status_idx').on(t.status, t.createdAt)]);

export const orderItems = pgTable('order_items', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => variants.id, { onDelete: 'set null' }),
  productId: text('product_id'),
  productName: text('product_name').notNull(),
  productSlug: text('product_slug'),
  categoryName: text('category_name'),
  variantLabel: text('variant_label').notNull(),
  sku: text('sku').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitMrp: integer('unit_mrp').notNull(),
  hsnCode: text('hsn_code'),
  gstRate: integer('gst_rate'),
  quantity: integer('quantity').notNull(),
}, (t) => [index('order_items_order_idx').on(t.orderId)]);

export const orderEvents = pgTable('order_events', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status'),
  message: text('message').notNull(),
  userId: text('user_id'),
  createdAt: createdAt(),
}, (t) => [index('order_events_order_idx').on(t.orderId)]);

export const refunds = pgTable('refunds', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  razorpayRefundId: text('razorpay_refund_id'),
  status: text('status').notNull().default('processed'),
  userId: text('user_id'),
  createdAt: createdAt(),
});

export const orderRequests = pgTable('order_requests', {
  id: id(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: requestTypeEnum('type').notNull(),
  reason: text('reason').notNull(),
  status: requestStatusEnum('status').notNull().default('OPEN'),
  adminNote: text('admin_note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const reviews = pgTable('reviews', {
  id: id(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: text('title'),
  body: text('body').notNull(),
  status: reviewStatusEnum('status').notNull().default('PENDING'),
  verifiedPurchase: boolean('verified_purchase').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('reviews_product_user_uq').on(t.productId, t.userId), index('reviews_product_status_idx').on(t.productId, t.status)]);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
});

export const homeSections = pgTable('home_sections', {
  id: id(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  eyebrow: text('eyebrow'),
  isVisible: boolean('is_visible').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  data: jsonb('data').$type<Record<string, unknown>>(),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  data: jsonb('data'),
  createdAt: createdAt(),
}, (t) => [index('audit_entity_idx').on(t.entity, t.entityId), index('audit_created_idx').on(t.createdAt)]);

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: id(),
  email: text('email').notNull().unique(),
  createdAt: createdAt(),
});

export const contactMessages = pgTable('contact_messages', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: createdAt(),
});

// ---------- relations (for db.query.*) ----------
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses), orders: many(orders), reviews: many(reviews),
}));
export const categoriesRelations = relations(categories, ({ many, one }) => ({
  products: many(products),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'tree' }),
  children: many(categories, { relationName: 'tree' }),
}));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  images: many(productImages),
  variants: many(variants),
  reviews: many(reviews),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
  batches: many(batches),
  movements: many(stockMovements),
}));
export const batchesRelations = relations(batches, ({ one }) => ({
  variant: one(variants, { fields: [batches.variantId], references: [variants.id] }),
  supplier: one(suppliers, { fields: [batches.supplierId], references: [suppliers.id] }),
}));
export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  variant: one(variants, { fields: [stockMovements.variantId], references: [variants.id] }),
  batch: one(batches, { fields: [stockMovements.batchId], references: [batches.id] }),
}));
export const cartsRelations = relations(carts, ({ many }) => ({ items: many(cartItems) }));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(variants, { fields: [cartItems.variantId], references: [variants.id] }),
}));
export const wishlistRelations = relations(wishlistItems, ({ one }) => ({
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems), events: many(orderEvents), refunds: many(refunds), requests: many(orderRequests),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(variants, { fields: [orderItems.variantId], references: [variants.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
}));
export const orderRequestsRelations = relations(orderRequests, ({ one }) => ({
  order: one(orders, { fields: [orderRequests.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderRequests.userId], references: [users.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
