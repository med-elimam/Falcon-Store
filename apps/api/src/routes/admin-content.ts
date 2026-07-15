import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { contentSections } from "@falcon/database";
import { contentSectionSchema } from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

export async function registerAdminContentRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/content`;

  app.get(P, { preHandler: requirePermission("content.write") }, async () => ({
    sections: await app.db.select().from(contentSections).orderBy(asc(contentSections.sortOrder)),
  }));

  app.put(P + "/:key", { preHandler: requirePermission("content.write") }, async (req) => {
    const key = (req.params as { key: string }).key;
    const body = contentSectionSchema.parse({ ...(req.body as Record<string, unknown>), key });
    const existing = await app.db
      .select({ id: contentSections.id })
      .from(contentSections)
      .where(eq(contentSections.key, key))
      .limit(1);
    if (existing[0]) {
      await app.db
        .update(contentSections)
        .set({
          type: body.type,
          titleAr: body.titleAr,
          bodyAr: body.bodyAr,
          titleFr: body.titleFr,
          bodyFr: body.bodyFr,
          data: body.data,
          enabled: body.enabled,
          sortOrder: body.sortOrder,
          updatedAt: new Date(),
          updatedBy: req.authUser!.id,
        })
        .where(eq(contentSections.key, key));
    } else {
      await app.db.insert(contentSections).values({ ...body, updatedBy: req.authUser!.id });
    }
    await writeAudit(app.db, req, { action: "content.section_updated", entity: "content_section", entityId: key, meta: { enabled: body.enabled } });
    return { ok: true };
  });

  app.delete(P + "/:key", { preHandler: requirePermission("content.write") }, async (req) => {
    const key = (req.params as { key: string }).key;
    const [row] = await app.db.delete(contentSections).where(eq(contentSections.key, key)).returning({ id: contentSections.id });
    if (!row) throw notFound("القسم غير موجود.");
    await writeAudit(app.db, req, { action: "content.section_deleted", entity: "content_section", entityId: key });
    return { ok: true };
  });
}
