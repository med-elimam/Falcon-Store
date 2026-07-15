import type { FastifyInstance } from "fastify";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { auditLogs, users } from "@falcon/database";
import { paginationSchema } from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";

export async function registerAdminAuditRoutes(app: FastifyInstance): Promise<void> {
  app.get(`${API_PREFIX}/admin/audit`, { preHandler: requirePermission("audit.read") }, async (req) => {
    const q = paginationSchema.parse(req.query);
    const where = q.q ? or(ilike(auditLogs.action, `%${q.q}%`), ilike(auditLogs.entity, `%${q.q}%`)) : undefined;
    const [rows, totalRows] = await Promise.all([
      app.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          meta: auditLogs.meta,
          ip: auditLogs.ip,
          createdAt: auditLogs.createdAt,
          actorName: users.displayName,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(q.perPage)
        .offset((q.page - 1) * q.perPage),
      app.db.select({ n: sql<number>`count(*)::int` }).from(auditLogs).where(where),
    ]);
    return { logs: rows, total: totalRows[0]?.n ?? 0, page: q.page, perPage: q.perPage };
  });
}
