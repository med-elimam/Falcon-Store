import type { ProductCardDTO, ProductDetailDTO, PublicSettingsDTO } from "@falcon/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ContentSectionDTO {
  key: string;
  type: string;
  titleAr: string | null;
  bodyAr: string | null;
  titleFr: string | null;
  bodyFr: string | null;
  data: Record<string, unknown> | null;
  sortOrder: number;
}

async function serverFetch<T>(path: string, revalidate: number, tags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate, tags },
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    /* واجهة API غير متاحة مؤقتًا — الصفحات تعرض حالة هادئة بدل الانهيار */
    return null;
  }
}

export async function getCatalog(): Promise<ProductCardDTO[] | null> {
  const data = await serverFetch<{ products: ProductCardDTO[] }>("/api/v1/catalog/products", 300, ["catalog"]);
  if (!data || !Array.isArray(data.products)) return null;
  return data.products.filter(
    (product) =>
      Array.isArray(product.variants) &&
      product.variants.length > 0 &&
      product.variants.every(
        (variant) =>
          typeof variant.id === "string" &&
          typeof variant.sizeLabel === "string" &&
          typeof variant.priceMru === "number" &&
          typeof variant.stockQuantity === "number"
      )
  );
}

export async function getProductDetail(slug: string): Promise<ProductDetailDTO | null | "unavailable"> {
  try {
    const res = await fetch(`${API_URL}/api/v1/catalog/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300, tags: ["catalog", `product-${slug}`] },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { product: ProductDetailDTO };
    if (!data.product || !Array.isArray(data.product.variants) || data.product.variants.length === 0) return "unavailable";
    return data.product;
  } catch {
    return "unavailable";
  }
}

export async function getPublicSettings(): Promise<PublicSettingsDTO | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/settings`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings: PublicSettingsDTO };
    return data.settings ?? null;
  } catch {
    return null;
  }
}

export async function getContentSections(): Promise<ContentSectionDTO[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/content`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { sections: ContentSectionDTO[] };
    return data.sections ?? [];
  } catch {
    return [];
  }
}
