import type { FastifyInstance } from "fastify";
import { asc, eq, isNull } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { brands, categories } from "@falcon/database";
import { brandSchema, categorySchema, uuidSchema } from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { conflict, notFound } from "../lib/errors.js";

export async function registerAdminTaxonomyRoutes(app: FastifyInstance): Promise<void> {
  const B = `${API_PREFIX}/admin/brands`;
  const C = `${API_PREFIX}/admin/categories`;

  app.get(B, { preHandler: requirePermission("products.read") }, async () => ({
    brands: await app.db.select().from(brands).where(isNull(brands.deletedAt)).orderBy(asc(brands.name)),
  }));

  app.post(B, { preHandler: requirePermission("products.write") }, async (req, reply) => {
    const body = brandSchema.parse(req.body);
    const dupe = await app.db.select({ id: brands.id }).from(brands).where(eq(brands.slug, body.slug)).limit(1);
    if (dupe[0]) throw conflict("توجد علامة بنفس المعرّف.");
    const [created] = await app.db.insert(brands).values(body).returning({ id: brands.id });
    await writeAudit(app.db, req, { action: "brand.created", entity: "brand", entityId: created!.id, meta: { name: body.name } });
    return reply.status(201).send({ id: created!.id });
  });

  app.patch(B + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = brandSchema.partial().parse(req.body);
    const [row] = await app.db.update(brands).set(body).where(eq(brands.id, id)).returning({ id: brands.id });
    if (!row) throw notFound("العلامة غير موجودة.");
    await writeAudit(app.db, req, { action: "brand.updated", entity: "brand", entityId: id });
    return { ok: true };
  });

  app.delete(B + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [row] = await app.db
      .update(brands)
      .set({ deletedAt: new Date() })
      .where(eq(brands.id, id))
      .returning({ id: brands.id });
    if (!row) throw notFound("العلامة غير موجودة.");
    await writeAudit(app.db, req, { action: "brand.deleted", entity: "brand", entityId: id });
    return { ok: true };
  });

  app.get(C, { preHandler: requirePermission("products.read") }, async () => ({
    categories: await app.db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.sortOrder)),
  }));

  app.post(C, { preHandler: requirePermission("products.write") }, async (req, reply) => {
    const body = categorySchema.parse(req.body);
    const dupe = await app.db.select({ id: categories.id }).from(categories).where(eq(categories.slug, body.slug)).limit(1);
    if (dupe[0]) throw conflict("يوجد تصنيف بنفس المعرّف.");
    const [created] = await app.db.insert(categories).values(body).returning({ id: categories.id });
    await writeAudit(app.db, req, { action: "category.created", entity: "category", entityId: created!.id });
    return reply.status(201).send({ id: created!.id });
  });

  app.patch(C + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = categorySchema.partial().parse(req.body);
    const [row] = await app.db.update(categories).set(body).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!row) throw notFound("التصنيف غير موجود.");
    await writeAudit(app.db, req, { action: "category.updated", entity: "category", entityId: id });
    return { ok: true };
  });

  app.delete(C + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [row] = await app.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (!row) throw notFound("التصنيف غير موجود.");
    await writeAudit(app.db, req, { action: "category.deleted", entity: "category", entityId: id });
    return { ok: true };
  });
}
