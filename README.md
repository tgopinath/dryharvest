# DryHarvest — e-commerce store

Production-ready storefront and admin for **DryHarvest** (*Naturally Dried. Naturally Better.*):
dried fruits, vegetables, mushrooms, herbs, flowers & tea, spices, traditional South Indian foods,
seeds, ready-to-cook mixes, pet products and decorative botanicals.

**Stack:** Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS ·
PostgreSQL (works with Supabase, Neon, RDS or any Postgres 14+) · Drizzle ORM ·
Razorpay · Google OAuth (optional) · S3-compatible image storage (Supabase Storage / R2 / S3) · Recharts.

> Drizzle is used instead of Prisma because it is pure TypeScript with no native engine binary,
> so it deploys anywhere (including edge-adjacent serverless) and migrations are plain SQL files in `drizzle/`.

---

## 1. Quick start (local)

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL, SESSION_SECRET, SEED_ADMIN_*
createdb dryharvest             # or create a Supabase project and paste its connection string
npm run db:migrate              # applies SQL migrations in ./drizzle
npm run db:seed                 # demo catalogue (only if the DB is empty) + first admin user
npm run dev                     # http://localhost:3000   admin: http://localhost:3000/admin
```

Log in at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, then change the password from **My account**.
Another admin can be added any time with `npm run admin:create -- you@example.com "Your Name"`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run db:migrate` | Apply pending migrations (safe to run on every deploy) |
| `npm run db:generate` | After editing `src/db/schema.ts`, generate a new SQL migration |
| `npm run db:seed` | Seed demo data **only when there are no categories**; always ensures the seed admin exists |
| `npm run db:studio` | Browse the database |
| `npm run admin:create -- email "Name"` | Create or promote an admin (prints a temporary password) |
| `npm run typecheck` / `lint` | Static checks |

---

## 2. Environment variables

See `.env.example` for the annotated template. Never commit `.env`. Only variables prefixed `NEXT_PUBLIC_` reach the browser — **none are used**; the Razorpay *key id* is sent to the browser per order by the server.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✓ | Postgres connection string. Supabase: Project → Settings → Database → *Session pooler* string. |
| `DATABASE_SSL` |  | `true` if your provider needs SSL without a verifiable chain. |
| `APP_URL` | ✓ | Public URL without trailing slash, e.g. `https://dryharvest.in`. Used for OAuth redirects, sitemap, canonical URLs. |
| `SESSION_SECRET` | ✓ | 32+ random characters (`openssl rand -hex 32`). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for online payments | Online checkout stays **off** until both are set. Nothing is ever faked. |
| `RAZORPAY_WEBHOOK_SECRET` | recommended | Razorpay Dashboard → Webhooks → `{APP_URL}/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid`, `payment.failed`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | "Continue with Google" appears only when set. Redirect URI: `{APP_URL}/api/auth/google/callback`. |
| `STORAGE_DRIVER` | ✓ | `local` (dev / single server) or `s3` (production). |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL` | when `s3` | Supabase Storage: enable S3 access, create a **public** bucket, endpoint `https://<ref>.supabase.co/storage/v1/s3`, public URL `https://<ref>.supabase.co/storage/v1/object/public/<bucket>`. |
| `CRON_SECRET` | recommended | Protects `/api/cron/release-stale`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | first run | Used by `db:seed` to create the first admin. |

---

## 3. Deployment

### Vercel (recommended) + Supabase
1. Create a Supabase project; copy the Session-pooler connection string into `DATABASE_URL`.
2. Create a public storage bucket (e.g. `media`), enable S3 access keys, set the `S3_*` / `STORAGE_PUBLIC_URL` vars and `STORAGE_DRIVER=s3`.
3. Import the repo into Vercel, add all env vars, deploy.
4. Run migrations once from your machine (or a CI step) against the production DB:
   `DATABASE_URL=... npm run db:migrate && DATABASE_URL=... npm run db:seed`
5. `vercel.json` already schedules `/api/cron/release-stale` every 15 minutes; Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.
6. Add the Razorpay webhook (above) and switch Razorpay to live keys when you're ready.

### Any Node host / VPS / Docker
`npm ci && npm run build && npm run db:migrate && npm start` behind a reverse proxy with HTTPS.
With `STORAGE_DRIVER=local` uploads go to `public/uploads` — use a persistent volume, or prefer S3.
Schedule the cron: `*/15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/release-stale`.

---

## 4. How things work

### Storefront
Home (CMS-driven sections), Shop, Search (with autocomplete), 11 category pages + a Combo Packs category,
product detail, cart, checkout, account (profile, password, addresses, orders, tracking, invoices, wishlist, reviews,
cancellation/return requests), About, Contact, policy pages, `sitemap.xml`, `robots.txt`, JSON-LD product data.
Every listing has filters (price, pack size, availability, category), sorting, pagination and loading/empty/error states.

### Honest-by-default content
- **No invented claims.** Hero "quality / delivery / rating" cards are editable in *Admin → Homepage & content* and stay hidden until marked *verified*.
- **Ratings only from real reviews**: only customers who ordered a product can review it, and reviews are published after moderation. No placeholder testimonials — the reviews section is hidden until there are approved reviews.
- **Discounts only when valid**: "% off" shows only when MRP > price; price can never exceed MRP.
- **Compliance gate**: a real (non-demo) food product cannot be published without a photo, ingredients, manufacturer/packer, an FSSAI licence (product or store-wide) and storage instructions. Pet and décor items require a safety note. Nutrition panels appear only when filled from a lab report.
- **Food vs non-food separation**: products and categories have a type (`FOOD`, `PET`, `DECOR`). Pet and décor pages and cart lines carry clear "not for human consumption / not edible" notices.
- **Demo data** is flagged (`is_demo`), labelled "Demo product" on the store, and removable from *Admin → Settings → Demo data*.

### Product images
Until real photos are uploaded, every product shows an illustrated *pouch + tray* placeholder coloured to the product (marked "Photo coming soon"). Upload square 1:1 packshots per SKU in the product editor (JPG/PNG/WebP/AVIF ≤ 5 MB, validated by file signature). Category banners (16:9) and the hero image are uploaded in *Categories* and *Homepage & content*. Never use the composite reference boards as product images. Suggested naming: `dried_mango_slices_100g_front.webp`.

### Payments (Razorpay)
1. Checkout creates the order (`PENDING_PAYMENT`), **reserves stock**, and creates a Razorpay order for the exact total.
2. The browser opens Razorpay Checkout (UPI, cards, netbanking, wallets — whatever your account enables).
3. `/api/payments/razorpay/verify` checks the HMAC signature **and** fetches the payment from Razorpay to confirm order id, amount, currency and `captured` status (capturing if only authorised). Only then is the order marked `PAID`.
4. The webhook does the same independently and idempotently (covers closed tabs / network drops).
5. Unpaid orders are cancelled after 30 minutes and their stock is returned (cron + on every dashboard load).
6. Cancellations of paid orders refund automatically through the Razorpay Refunds API; partial refunds are available on the order page.

Cash on delivery is optional (off by default) with a fee and maximum order value in *Settings*. COD orders become `PAID` when marked *Delivered*.

### Inventory
Stock lives on each SKU (pack size) and is broken down into **batches** with mfg/packed and best-before dates. Sales draw from the earliest-expiring batch first (FEFO). Every change — opening stock, purchase receipts, sales, cancellations, returns, damage, expiry write-offs, count corrections — writes a row to the **stock movement log**, and stock can never go negative even under concurrent checkouts (guarded atomic update). Low-stock and expiry alerts appear on the dashboard.

### Admin (`/admin`) and roles
| Role | Access |
|---|---|
| **Staff** | Dashboard, view products, orders & fulfilment, inventory, review moderation |
| **Manager** | + product/category editing, refunds, customers, suppliers, coupons, CMS, reports |
| **Admin** | + staff & roles, settings, audit log |

The exact matrix is in `src/server/auth.ts` (`PERMISSIONS`) and shown on *Staff & roles*. Every server action re-checks permissions; the UI hiding is only convenience.
All price, stock, order, refund, role, settings and export actions are written to the **audit log**.

### Security notes
- Sessions: random 256-bit tokens in `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookies; only the SHA-256 hash is stored. Passwords hashed with bcrypt (cost 12). Changing a password or role signs out other sessions.
- All input validated server-side with Zod; prices and totals are always recomputed on the server.
- Login, registration, checkout, contact, newsletter and review endpoints are rate-limited (in-memory per instance — add an edge/WAF rate limit for scale).
- Security headers set in `next.config.mjs`. CSV exports are protected against formula injection.
- Not included (add when needed): transactional email/SMS (order confirmations, password reset) — plug a provider like Resend / AWS SES / MSG91 into `src/server/orders.ts` where order events are created. Until then, password resets are done by an admin via `npm run admin:create` or by setting a new temporary password.

---

## 5. Project structure

```
drizzle/                  SQL migrations
scripts/                  migrate, seed (+ demo catalogue), create-admin
src/db/                   schema.ts (all tables) and client
src/server/               auth & RBAC, cart, pricing/coupons, orders & payments, catalogue queries,
                          razorpay, storage, settings, audit & stock movements, rate limit
src/app/(store)/          storefront routes
src/app/admin/            admin routes + server actions
src/app/api/              search suggest, Google OAuth, Razorpay verify/webhook, cron
src/components/           ui primitives, store components, admin components
```

## 6. Before launch — checklist
- [ ] Settings → store details, registered business name, GSTIN, FSSAI licence, business state, support contacts
- [ ] Settings → shipping charges, free-shipping threshold, COD on/off, serviceable pincodes
- [ ] Homepage & content → About story and all five policy pages (they ship with TODO text)
- [ ] Replace or remove the demo catalogue (Settings → Demo data); upload real photos per SKU
- [ ] For each food product: ingredients, allergens, storage, manufacturer/packer, HSN & GST rate, nutrition (only from a lab report)
- [ ] Verify any hero claims before ticking *verified*
- [ ] Razorpay live keys + webhook; place a small real order end-to-end and refund it
- [ ] `STORAGE_DRIVER=s3`, `CRON_SECRET`, `APP_URL` set; change the seed admin password
