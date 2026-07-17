import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Family, ProductCardDTO, ProductDetailDTO, TimeTag, VariantDTO, VariantType } from "@falcon/shared";
import {
  brands,
  categories,
  productImages,
  products,
  productTranslations,
  productVariants,
  type AnyDb,
} from "@falcon/database";

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type ImageRow = typeof productImages.$inferSelect;
type TranslationRow = typeof productTranslations.$inferSelect;
type BrandRow = typeof brands.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

export interface LoadedProduct {
  product: ProductRow;
  brand: BrandRow | null;
  category: CategoryRow | null;
  translations: TranslationRow[];
  variants: VariantRow[];
  images: ImageRow[];
}

export async function loadProducts(db: AnyDb, ids?: string[]): Promise<LoadedProduct[]> {
  const base = await db
    .select({ product: products, brand: brands, category: categories })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(isNull(products.deletedAt), ids && ids.length ? inArray(products.id, ids) : undefined))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
  if (base.length === 0) return [];
  const productIds = base.map((r) => r.product.id);
  const [trs, vars, imgs] = await Promise.all([
    db.select().from(productTranslations).where(inArray(productTranslations.productId, productIds)),
    db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .orderBy(asc(productVariants.sortOrder)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder)),
  ]);
  return base.map((r) => ({
    product: r.product,
    brand: r.brand,
    category: r.category,
    translations: trs.filter((t) => t.productId === r.product.id),
    variants: vars.filter((v) => v.productId === r.product.id),
    images: imgs.filter((i) => i.productId === r.product.id),
  }));
}

function toPublicVariants(p: LoadedProduct): VariantDTO[] {
  return p.variants
    .filter((v) => v.isActive && v.isAvailable && v.priceMru !== null)
    .map((v) => ({
      id: v.id,
      sizeLabel: v.sizeLabel,
      sizeMl: v.sizeMl,
      sku: v.sku,
      priceMru: v.priceMru!,
      compareAtPriceMru: v.compareAtPriceMru,
      stockQuantity: v.stockQuantity,
      lowStockThreshold: v.lowStockThreshold,
      type: v.type as VariantType,
      isAvailable: v.stockQuantity > 0,
      availability:
        v.stockQuantity === 0
          ? "out_of_stock"
          : v.stockQuantity <= v.lowStockThreshold
            ? "low_stock"
            : "available",
    }));
}

export function toCardDTO(p: LoadedProduct): ProductCardDTO {
  const ar = p.translations.find((t) => t.locale === "ar");
  const fr = p.translations.find((t) => t.locale === "fr");
  const variants = toPublicVariants(p);
  const inStock = variants.some((v) => v.isAvailable);
  return {
    id: p.product.id,
    slug: p.product.slug,
    brandName: p.brand?.name ?? "",
    nameAr: ar?.name ?? p.product.slug,
    nameFr: fr?.name ?? null,
    image: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    featured: p.product.featured,
    glow: p.product.glow,
    families: p.product.families as Family[],
    times: p.product.times as TimeTag[],
    startingPriceMru: variants.length ? Math.min(...variants.map((v) => v.priceMru)) : null,
    hasDecant: variants.some((v) => v.type === "decant"),
    inStock,
    variants,
    gender: p.product.gender,
    categorySlug: p.category?.slug ?? null,
  };
}

export function toDetailDTO(p: LoadedProduct): ProductDetailDTO {
  const ar = p.translations.find((t) => t.locale === "ar");
  return {
    ...toCardDTO(p),
    descriptionAr: ar?.description ?? null,
    concentration: p.product.concentration,
    gender: p.product.gender,
    origin: p.product.origin,
    seasons: p.product.seasons,
    projection: p.product.projection,
    notesTop: (ar?.notesTop ?? []) as string[],
    notesHeart: (ar?.notesHeart ?? []) as string[],
    notesBase: (ar?.notesBase ?? []) as string[],
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
  };
}

/** يتحقق من اكتمال منتج قبل نشره — يمنع نشر محتوى ناقص للزبائن. */
export function publishProblems(p: LoadedProduct): string[] {
  const problems: string[] = [];
  const ar = p.translations.find((t) => t.locale === "ar");
  if (!ar?.name?.trim()) problems.push("الاسم العربي مطلوب");
  if (!ar?.description?.trim()) problems.push("الوصف العربي مطلوب");
  if (!p.brand) problems.push("العلامة التجارية مطلوبة");
  if (p.images.length === 0) problems.push("صورة واحدة على الأقل مطلوبة");
  if (!p.variants.some((v) => v.isActive && v.isAvailable && v.priceMru !== null))
    problems.push("متغير نشط ومتاح بسعر محدد مطلوب على الأقل");
  for (const variant of p.variants) {
    if (!variant.sizeLabel.trim()) problems.push("كل متغير يحتاج اسم حجم");
    if (!variant.sku.trim()) problems.push("كل متغير يحتاج SKU");
    if (variant.isActive && variant.isAvailable && variant.priceMru === null)
      problems.push(`المتغير ${variant.sizeLabel} غير مكتمل: السعر مطلوب قبل عرضه`);
  }
  return problems;
}
