import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { roles, userRoles, users } from "@falcon/database";
import { bootstrapOwnerSchema } from "@falcon/validation";
import { hashPassword } from "../lib/crypto.js";
import { writeAudit } from "../lib/audit.js";
import { AppError, badRequest } from "../lib/errors.js";

async function ownerExists(app: FastifyInstance): Promise<boolean> {
  const rows = await app.db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.key, "owner"))
    .limit(1);
  return rows.length > 0;
}

/**
 * إنشاء حساب المالك الأول — محمي برمز BOOTSTRAP_TOKEN من متغيرات بيئة Railway،
 * ويتعطل نهائيًا بمجرد وجود مالك.
 */
export async function registerBootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.get(`${API_PREFIX}/bootstrap/status`, async () => {
    const exists = await ownerExists(app);
    return { ownerExists: exists, bootstrapAvailable: !exists && Boolean(app.env.BOOTSTRAP_TOKEN) };
  });

  app.post(
    `${API_PREFIX}/bootstrap/owner`,
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (await ownerExists(app)) {
        throw new AppError(410, "bootstrap_disabled", "تم إنشاء حساب المالك مسبقًا وهذه الخطوة معطلة نهائيًا.");
      }
      const configured = app.env.BOOTSTRAP_TOKEN;
      if (!configured) {
        throw new AppError(503, "bootstrap_unconfigured", "رمز التهيئة غير مضبوط في بيئة الخادم.");
      }
      const body = bootstrapOwnerSchema.parse(req.body);
      const a = Buffer.from(body.token);
      const b = Buffer.from(configured);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw badRequest("رمز التهيئة غير صحيح.");
      }

      const passwordHash = await hashPassword(body.password);
      const created = await app.db
        .insert(users)
        .values({ email: body.email, displayName: body.displayName, passwordHash })
        .returning({ id: users.id });
      const userId = created[0]!.id;
      const ownerRole = await app.db.select().from(roles).where(eq(roles.key, "owner")).limit(1);
      if (!ownerRole[0]) throw new AppError(500, "seed_missing", "الأدوار غير مهيأة. شغّل أمر الزرع أولًا.");
      await app.db.insert(userRoles).values({ userId, roleId: ownerRole[0].id });

      await writeAudit(app.db, req, { action: "bootstrap.owner_created", entity: "user", entityId: userId });
      req.log.info({ userId }, "owner account bootstrapped");
      return reply.status(201).send({ ok: true, message: "تم إنشاء حساب المالك. يمكنك تسجيل الدخول الآن." });
    }
  );
}
