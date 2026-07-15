import type { FastifyInstance } from "fastify";
import { API_PREFIX } from "@falcon/config";
import { loadProducts, toCardDTO, toDetailDTO } from "../lib/catalog.js";
import { notFound } from "../lib/errors.js";

const CACHE_HEADER = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function registerCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get(`${API_PREFIX}/catalog/products`, async (req, reply) => {
    const all = await loadProducts(app.db);
    const cards = all
      .filter((p) => p.product.status === "published")
      .map((p) => toCardDTO(p))
      .filter((p) => p.variants.length > 0);
    reply.header("cache-control", CACHE_HEADER);
    return { products: cards };
  });

  app.get(`${API_PREFIX}/catalog/products/:slug`, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const all = await loadProducts(app.db);
    const found = all.find((p) => p.product.slug === slug && p.product.status === "published");
    if (!found) throw notFound("هذا العطر غير معروض حاليًا.");
    reply.header("cache-control", CACHE_HEADER);
    const product = toDetailDTO(found);
    if (product.variants.length === 0) throw notFound("هذا العطر غير مكتمل أو غير متاح حاليًا.");
    return { product };
  });
}
