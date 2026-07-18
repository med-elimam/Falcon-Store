import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let productUrls: Array<{ url: string; lastModified?: Date }> = [];
  try {
    const catalog = await getCatalog();
    if (catalog && Array.isArray(catalog)) {
      productUrls = catalog.map((p) => ({
        url: `${baseUrl}/product/${p.slug}`,
        lastModified: new Date(),
      }));
    }
  } catch (err) {
    console.error("Failed to generate product sitemap", err);
  }

  const staticRoutes = ["", "/shop", "/faq", "/contact", "/track"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...productUrls];
}
