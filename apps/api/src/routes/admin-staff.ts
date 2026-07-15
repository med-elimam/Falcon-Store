import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import type { RoleKey } from "@falcon/shared";
import { roles, sessions, userRoles, users } from "@falcon/database";
import { staffCreateSchema, staffResetSchema, staffUpdateSchema, uuidSchema } from "@falcon/validation";
import { hashPassword } from "../lib/crypto.js";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

export async function registerAdminStaffRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/staff`;

  app.get(P, { preHandler: requirePermission("staff.manage") }, async () => {
    const rows = await app.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isActive: users.isActive,
        totpEnabled: users.totpEnabled,
        mustChangePassword: users.mustChangePassword,
        createdAt: users.createdAt,
        roleKey: roles.key,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt));
    return { staff: rows };
  });

  app.post(P, { preHandler: requirePermission("staff.manage") }, async (req, reply) => {
    const body = staffCreateSchema.parse(req.body);
    if (body.role === "owner") throw badRequest("لا يمكن إنشاء حساب مالك إضافي من هنا.");
    const dupe = await app.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${body.email}`)
      .limit(1);
    if (dupe[0]) throw conflict("يوجد حساب بهذا البريد الإلكتروني.");

    const passwordHash = await hashPassword(body.tempPassword);
    const userId = await app.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ email: body.email, displayName: body.displayName, passwordHash, mustChangePassword: true })
        .returning({ id: users.id });
      const [role] = await tx.select().from(roles).where(eq(roles.key, body.role)).limit(1);
      if (!role) throw badRequest("الدور غير معروف.");
      await tx.insert(userRoles).values({ userId: created!.id, roleId: role.id, assignedBy: req.authUser!.id });
      return created!.id;
    });

    await writeAudit(app.db, req, {
      action: "staff.created",
      entity: "user",
      entityId: userId,
      meta: { role: body.role },
    });
    return reply.status(201).send({ id: userId });
  });

  app.patch(P + "/:id", { preHandler: requirePermission("staff.manage") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = staffUpdateSchema.parse(req.body);
    const [target] = await app.db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
    if (!target) throw notFound("الحساب غير موجود.");

    const targetRoles = await app.db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, id));
    const isOwnerAccount = targetRoles.some((r) => r.key === "owner");
    if (isOwnerAccount && (body.role || body.isActive === false)) {
      throw badRequest("لا يمكن تعديل دور حساب المالك أو تعطيله.");
    }

    await app.db.transaction(async (tx) => {
      if (body.displayName || body.isActive !== undefined) {
        await tx
          .update(users)
          .set({
            ...(body.displayName ? { displayName: body.displayName } : {}),
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.id, id));
      }
      if (body.role) {
        const [role] = await tx.select().from(roles).where(eq(roles.key, body.role as RoleKey)).limit(1);
        if (!role) throw badRequest("الدور غير معروف.");
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        await tx.insert(userRoles).values({ userId: id, roleId: role.id, assignedBy: req.authUser!.id });
      }
      if (body.isActive === false) {
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
      }
    });

    await writeAudit(app.db, req, {
      action: "staff.updated",
      entity: "user",
      entityId: id,
      meta: { role: body.role, isActive: body.isActive },
    });
    return { ok: true };
  });

  /* إعادة تعيين كلمة مرور موظف — يصدر كلمة مؤقتة تُغيَّر عند أول دخول */
  app.post(P + "/reset-password", { preHandler: requirePermission("staff.manage") }, async (req) => {
    const body = staffResetSchema.parse(req.body);
    const [target] = await app.db
      .select()
      .from(users)
      .where(and(eq(users.id, body.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!target) throw notFound("الحساب غير موجود.");
    const targetRoles = await app.db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, body.userId));
    if (targetRoles.some((r) => r.key === "owner") && req.authUser!.id !== body.userId) {
      throw badRequest("كلمة مرور المالك تُغيَّر من حسابه فقط أو برمز استرداد.");
    }
    const passwordHash = await hashPassword(body.tempPassword);
    await app.db
      .update(users)
      .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, body.userId));
    await app.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, body.userId), isNull(sessions.revokedAt)));
    await writeAudit(app.db, req, { action: "staff.password_reset", entity: "user", entityId: body.userId });
    return { ok: true };
  });
}
