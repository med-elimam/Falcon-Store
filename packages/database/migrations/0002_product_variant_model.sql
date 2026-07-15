DROP INDEX IF EXISTS "product_variants_uq";--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_size_chk";--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_price_chk";--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_stock_chk";--> statement-breakpoint
ALTER TABLE "product_variants" RENAME COLUMN "size" TO "size_label";--> statement-breakpoint
ALTER TABLE "product_variants" RENAME COLUMN "stock" TO "stock_quantity";--> statement-breakpoint
ALTER TABLE "product_variants" RENAME COLUMN "available" TO "is_available";--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "size_ml" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "compare_at_price_mru" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "low_stock_threshold" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "type" text DEFAULT 'full_bottle' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "product_variants"
SET
  "size_ml" = COALESCE(NULLIF(regexp_replace("size_label", '[^0-9]', '', 'g'), '')::integer, 1),
  "sku" = 'FLC-' || upper(substr(replace("id"::text, '-', ''), 1, 12)),
  "type" = CASE WHEN "is_decant" THEN 'decant' ELSE 'full_bottle' END;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "size_ml" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "sku" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "is_decant";--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_size_ml_chk" CHECK ("size_ml" > 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_chk" CHECK ("price_mru" is null or "price_mru" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_compare_price_chk" CHECK ("compare_at_price_mru" is null or ("price_mru" is not null and "compare_at_price_mru" >= "price_mru"));--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_chk" CHECK ("stock_quantity" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_low_stock_chk" CHECK ("low_stock_threshold" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_type_chk" CHECK ("type" in ('decant','full_bottle'));--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_label_uq" ON "product_variants" USING btree ("product_id","size_label");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_uq" ON "product_variants" USING btree ("sku");
