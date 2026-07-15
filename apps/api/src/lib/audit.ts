import type { FastifyRequest } from "fastify";
import { auditLogs, type AnyDb } from "@falcon/database";

export interface AuditInput {
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

/** يكتب سجل تدقيق — لا يفشل الطلب الأساسي إذا فشل السجل، لكنه يُسجَّل في اللوج. */
export async function writeAudit(db: AnyDb, req: FastifyRequest, input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: req.authUser?.id ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
      ip: req.ip,
    });
  } catch (err) {
    req.log.error({ err, action: input.action }, "audit write failed");
  }
}
