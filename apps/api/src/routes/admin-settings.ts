import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { deliveryZones, paymentMethods, setupProgress } from "@falcon/database";
import {
  deliveryZoneSchema,
  paymentMethodSchema,
  setupStepSchema,
  SETTINGS_GROUPS,
  uuidSchema,
  type SettingsGroup,
} from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getAllSettings, invalidatePublicSettingsCache, saveSettingsGroup } from "../lib/settings.js";

export async function registerAdminSettingsRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/settings`;

  app.get(P, { preHandler: requirePermission("settings.read") }, async () => {
    const [settings, pm, zones, progress] = await Promise.all([
      getAllSettings(app.db),
      app.db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder)),
      app.db.select().from(deliveryZones).orderBy(asc(deliveryZones.sortOrder)),
      app.db.select().from(setupProgress),
    ]);
    return { settings, paymentMethods: pm, deliveryZones: zones, setupProgress: progress };
  });

  app.put(P + "/:group", { preHandler: requirePermission("settings.write") }, async (req) => {
    const group = (req.params as { group: string }).group as SettingsGroup;
    if (!SETTINGS_GROUPS.includes(group)) throw badRequest("مجموعة إعدادات غير معروفة.");
    const saved = await saveSettingsGroup(app.db, group, req.body as Record<string, unknown>, req.authUser!.id);
    await writeAudit(app.db, req, { action: "settings.updated", entity: "settings", entityId: group });
    return { ok: true, value: saved };
  });

  /* طرق الدفع */
  app.patch(P + "/payment-methods/:id", { preHandler: requirePermission("settings.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = paymentMethodSchema.partial().parse(req.body);
    const [row] = await app.db
      .update(paymentMethods)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id, key: paymentMethods.key });
    if (!row) throw notFound("طريقة الدفع غير موجودة.");
    invalidatePublicSettingsCache();
    await writeAudit(app.db, req, { action: "settings.payment_method_updated", entity: "payment_method", entityId: id, meta: { key: row.key, enabled: body.enabled } });
    return { ok: true };
  });

  /* مناطق التوصيل */
  app.post(P + "/delivery-zones", { preHandler: requirePermission("settings.write") }, async (req, reply) => {
    const body = deliveryZoneSchema.parse(req.body);
    const [created] = await app.db.insert(deliveryZones).values(body).returning({ id: deliveryZones.id });
    invalidatePublicSettingsCache();
    await writeAudit(app.db, req, { action: "settings.delivery_zone_created", entity: "delivery_zone", entityId: created!.id });
    return reply.status(201).send({ id: created!.id });
  });

  app.patch(P + "/delivery-zones/:id", { preHandler: requirePermission("settings.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = deliveryZoneSchema.partial().parse(req.body);
    const [row] = await app.db
      .update(deliveryZones)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(deliveryZones.id, id))
      .returning({ id: deliveryZones.id });
    if (!row) throw notFound("منطقة التوصيل غير موجودة.");
    invalidatePublicSettingsCache();
    await writeAudit(app.db, req, { action: "settings.delivery_zone_updated", entity: "delivery_zone", entityId: id });
    return { ok: true };
  });

  app.delete(P + "/delivery-zones/:id", { preHandler: requirePermission("settings.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [row] = await app.db.delete(deliveryZones).where(eq(deliveryZones.id, id)).returning({ id: deliveryZones.id });
    if (!row) throw notFound("منطقة التوصيل غير موجودة.");
    invalidatePublicSettingsCache();
    await writeAudit(app.db, req, { action: "settings.delivery_zone_deleted", entity: "delivery_zone", entityId: id });
    return { ok: true };
  });

  /* تقدم معالج الإعداد */
  app.put(`${API_PREFIX}/admin/setup/step`, { preHandler: requirePermission("settings.write") }, async (req) => {
    const body = setupStepSchema.parse(req.body);
    await app.db
      .insert(setupProgress)
      .values({ key: body.key, completed: body.completed, data: body.data })
      .onConflictDoUpdate({
        target: setupProgress.key,
        set: { completed: body.completed, data: body.data, updatedAt: new Date() },
      });
    await writeAudit(app.db, req, { action: "setup.step_updated", entity: "setup", entityId: body.key, meta: { completed: body.completed } });
    return { ok: true };
  });
}
