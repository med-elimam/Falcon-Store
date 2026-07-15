import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { contentSections } from "@falcon/database";
import { getPublicSettings } from "../lib/settings.js";

export async function registerPublicSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get(`${API_PREFIX}/public/settings`, async (_req, reply) => {
    const settings = await getPublicSettings(app.db);
    reply.header("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return { settings };
  });

  app.get(`${API_PREFIX}/public/content`, async (_req, reply) => {
    const rows = await app.db
      .select({
        key: contentSections.key,
        type: contentSections.type,
        titleAr: contentSections.titleAr,
        bodyAr: contentSections.bodyAr,
        titleFr: contentSections.titleFr,
        bodyFr: contentSections.bodyFr,
        data: contentSections.data,
        sortOrder: contentSections.sortOrder,
      })
      .from(contentSections)
      .where(eq(contentSections.enabled, true))
      .orderBy(asc(contentSections.sortOrder));
    reply.header("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return { sections: rows };
  });
}
