ALTER TABLE "products" ADD COLUMN "benefits" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "avoid" text[] DEFAULT '{}'::text[] NOT NULL;
