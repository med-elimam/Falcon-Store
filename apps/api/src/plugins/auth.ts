import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import type { PermissionKey, RoleKey } from "@falcon/shared";
import { SESSION_COOKIE } from "@falcon/config";
import {
  permissions as permissionsTable,
  rolePermissions,
  roles as rolesTable,
  sessions,
  userRoles,
  users,
} from "@falcon/database";
import { sha256 } from "../lib/crypto.js";
import { forbidden, unauthorized } from "../lib/errors.js";

/** يحمّل الجلسة والمستخدم وصلاحياته من الكوكي — يعمل على كل طلب. */
export async function resolveSession(app: FastifyInstance, req: FastifyRequest): Promise<void> {
  req.authUser = null;
  req.authSession = null;
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return;
  const tokenHash = sha256(raw);
  const now = new Date();

  const rows = await app.db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row || !row.user.isActive || row.user.deletedAt) return;

  const roleRows = await app.db
    .select({ key: rolesTable.key, roleId: rolesTable.id })
    .from(userRoles)
    .innerJoin(rolesTable, eq(rolesTable.id, userRoles.roleId))
    .where(eq(userRoles.userId, row.user.id));
  const roleIds = roleRows.map((r) => r.roleId);
  const permRows = roleIds.length
    ? await app.db
        .select({ key: permissionsTable.key })
        .from(rolePermissions)
        .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
        .where(inArray(rolePermissions.roleId, roleIds))
    : [];

  req.authUser = {
    id: row.user.id,
    email: row.user.email,
    displayName: row.user.displayName,
    roles: roleRows.map((r) => r.key as RoleKey),
    permissions: new Set(permRows.map((p) => p.key as PermissionKey)),
    totpEnabled: row.user.totpEnabled,
    mustChangePassword: row.user.mustChangePassword,
  };
  req.authSession = { id: row.session.id, tokenHash };

  // تحديث آخر استخدام (مخفف: مرة كل 5 دقائق)
  if (now.getTime() - row.session.lastUsedAt.getTime() > 5 * 60_000) {
    await app.db.update(sessions).set({ lastUsedAt: now }).where(eq(sessions.id, row.session.id));
  }
}

export function requireAuth(): preHandlerHookHandler {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.authUser) throw unauthorized();
  };
}

export function requirePermission(...keys: PermissionKey[]): preHandlerHookHandler {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.authUser) throw unauthorized();
    const ok = keys.some((k) => req.authUser!.permissions.has(k));
    if (!ok) throw forbidden();
  };
}
