import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { API_PREFIX, LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES, SESSION_COOKIE } from "@falcon/config";
import { loginAttempts, recoveryCodes, sessions, users } from "@falcon/database";
import {
  changePasswordSchema,
  loginSchema,
  recoveryResetSchema,
  totpVerifySchema,
} from "@falcon/validation";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@falcon/shared/totp";
import {
  DUMMY_HASH_PROMISE,
  generateRecoveryCodes,
  hashPassword,
  newSessionToken,
  sha256,
  verifyPassword,
} from "../lib/crypto.js";
import { writeAudit } from "../lib/audit.js";
import { AppError, badRequest, notFound, tooMany, unauthorized } from "../lib/errors.js";
import { requireAuth } from "../plugins/auth.js";

function sessionCookieSecurity(app: FastifyInstance) {
  /*
   * Vercel and Railway use different sites, so a production host-only cookie
   * must explicitly opt into cross-site requests. Partitioning keeps that
   * cookie scoped to the storefront that created it on supporting browsers.
   * A configured shared cookie domain keeps the stricter same-site policy.
   */
  const crossSite = app.env.NODE_ENV === "production" && !app.env.COOKIE_DOMAIN;
  return {
    secure: app.env.NODE_ENV === "production",
    sameSite: crossSite ? ("none" as const) : ("lax" as const),
    partitioned: crossSite || undefined,
  };
}

function setSessionCookie(app: FastifyInstance, reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    ...sessionCookieSecurity(app),
    path: "/",
    domain: app.env.COOKIE_DOMAIN || undefined,
    maxAge: app.env.SESSION_TTL_HOURS * 3600,
  });
}

function clearSessionCookie(app: FastifyInstance, reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, {
    ...sessionCookieSecurity(app),
    path: "/",
    domain: app.env.COOKIE_DOMAIN || undefined,
  });
}

/**
 * قفل تدريجي: 5 إخفاقات على نفس الحساب أو 30 إخفاقًا من نفس العنوان خلال نافذة القفل.
 * عتبة العنوان أعلى حتى لا يُحجب مكتب كامل خلف عنوان واحد بسبب حساب واحد.
 */
async function isLockedOut(app: FastifyInstance, identifier: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_LOCK_MINUTES * 60_000);
  const [byIdentifier, byIp] = await Promise.all([
    app.db
      .select({ n: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since), eq(loginAttempts.identifier, identifier))
      ),
    app.db
      .select({ n: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since), eq(loginAttempts.ip, ip))),
  ]);
  return (byIdentifier[0]?.n ?? 0) >= LOGIN_MAX_FAILURES || (byIp[0]?.n ?? 0) >= LOGIN_MAX_FAILURES * 6;
}

async function createSession(app: FastifyInstance, req: FastifyRequest, userId: string): Promise<string> {
  const { token, tokenHash } = newSessionToken();
  await app.db.insert(sessions).values({
    userId,
    tokenHash,
    ip: req.ip,
    userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
    expiresAt: new Date(Date.now() + app.env.SESSION_TTL_HOURS * 3600_000),
  });
  return token;
}

function meDto(req: FastifyRequest) {
  const u = req.authUser!;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roles: u.roles,
    permissions: [...u.permissions],
    totpEnabled: u.totpEnabled,
    mustChangePassword: u.mustChangePassword,
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/auth`;

  app.post(P + "/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const identifier = body.identifier.toLowerCase();

    if (await isLockedOut(app, identifier, req.ip)) {
      throw tooMany(`تم إيقاف المحاولات مؤقتًا. أعد المحاولة بعد ${LOGIN_LOCK_MINUTES} دقيقة.`);
    }

    const rows = await app.db
      .select()
      .from(users)
      .where(and(or(sql`lower(${users.email}) = ${identifier}`, eq(users.username, identifier)), isNull(users.deletedAt)))
      .limit(1);
    const user = rows[0];

    const recordFailure = async () => {
      await app.db.insert(loginAttempts).values({ identifier, ip: req.ip, success: false });
      await writeAudit(app.db, req, { action: "auth.login_failed", meta: { identifier } });
    };

    if (!user || !user.isActive) {
      await verifyPassword(await DUMMY_HASH_PROMISE, body.password);
      await recordFailure();
      throw unauthorized("بيانات الدخول غير صحيحة.");
    }
    const passwordOk = await verifyPassword(user.passwordHash, body.password);
    if (!passwordOk) {
      await recordFailure();
      throw unauthorized("بيانات الدخول غير صحيحة.");
    }
    if (user.totpEnabled) {
      if (!body.totp) {
        return reply.status(401).send({ error: { code: "totp_required", message: "أدخل رمز التحقق من تطبيق المصادقة." } });
      }
      if (!verifyTotp(user.totpSecret ?? "", body.totp)) {
        await recordFailure();
        throw unauthorized("رمز التحقق غير صحيح.");
      }
    }

    // تدوير الجلسة: جلسة جديدة عند كل تسجيل دخول
    const token = await createSession(app, req, user.id);
    setSessionCookie(app, reply, token);
    await app.db.insert(loginAttempts).values({ identifier, ip: req.ip, success: true });
    await writeAudit(app.db, req, { action: "auth.login_success", entity: "user", entityId: user.id });
    return { ok: true };
  });

  app.post(P + "/logout", { preHandler: requireAuth() }, async (req, reply) => {
    await app.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, req.authSession!.tokenHash));
    clearSessionCookie(app, reply);
    await writeAudit(app.db, req, { action: "auth.logout" });
    return { ok: true };
  });

  app.post(P + "/logout-all", { preHandler: requireAuth() }, async (req, reply) => {
    await app.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, req.authUser!.id), isNull(sessions.revokedAt)));
    clearSessionCookie(app, reply);
    await writeAudit(app.db, req, { action: "auth.logout_all" });
    return { ok: true };
  });

  app.get(P + "/me", { preHandler: requireAuth() }, async (req) => ({ user: meDto(req) }));

  app.get(P + "/sessions", { preHandler: requireAuth() }, async (req) => {
    const rows = await app.db
      .select({
        id: sessions.id,
        ip: sessions.ip,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, req.authUser!.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.lastUsedAt));
    return { sessions: rows.map((r) => ({ ...r, current: false })), currentId: req.authSession!.id };
  });

  app.delete(P + "/sessions/:id", { preHandler: requireAuth() }, async (req) => {
    const { id } = req.params as { id: string };
    const result = await app.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, id), eq(sessions.userId, req.authUser!.id)))
      .returning({ id: sessions.id });
    if (!result[0]) throw notFound("الجلسة غير موجودة.");
    await writeAudit(app.db, req, { action: "auth.session_revoked", entity: "session", entityId: id });
    return { ok: true };
  });

  app.post(P + "/change-password", { preHandler: requireAuth() }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body);
    const rows = await app.db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(user.passwordHash, body.currentPassword))) {
      throw unauthorized("كلمة المرور الحالية غير صحيحة.");
    }
    const passwordHash = await hashPassword(body.newPassword);
    await app.db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    // إبطال بقية الجلسات وتدوير الجلسة الحالية
    await app.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
    const token = await createSession(app, req, user.id);
    setSessionCookie(app, reply, token);
    await writeAudit(app.db, req, { action: "auth.password_changed", entity: "user", entityId: user.id });
    return { ok: true };
  });

  /* ── المصادقة الثنائية TOTP ─────────────────────────── */

  app.post(P + "/totp/setup", { preHandler: requireAuth() }, async (req) => {
    if (req.authUser!.totpEnabled) throw badRequest("المصادقة الثنائية مفعلة بالفعل.");
    const secret = generateTotpSecret();
    await app.db
      .update(users)
      .set({ totpSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, req.authUser!.id));
    return {
      secret,
      otpauthUrl: otpauthUrl(secret, req.authUser!.email, "Falcon Store"),
    };
  });

  app.post(P + "/totp/enable", { preHandler: requireAuth() }, async (req) => {
    const body = totpVerifySchema.parse(req.body);
    const rows = await app.db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);
    const user = rows[0];
    if (!user?.totpSecret) throw badRequest("ابدأ بتهيئة المصادقة الثنائية أولًا.");
    if (user.totpEnabled) throw badRequest("المصادقة الثنائية مفعلة بالفعل.");
    if (!verifyTotp(user.totpSecret, body.code)) throw badRequest("رمز التحقق غير صحيح.");

    const codes = generateRecoveryCodes();
    await app.db.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
    for (const code of codes) {
      await app.db.insert(recoveryCodes).values({ userId: user.id, codeHash: sha256(code) });
    }
    await app.db.update(users).set({ totpEnabled: true, updatedAt: new Date() }).where(eq(users.id, user.id));
    await writeAudit(app.db, req, { action: "auth.totp_enabled", entity: "user", entityId: user.id });
    return { ok: true, recoveryCodes: codes };
  });

  app.post(P + "/totp/disable", { preHandler: requireAuth() }, async (req) => {
    const body = totpVerifySchema.parse(req.body);
    const rows = await app.db.select().from(users).where(eq(users.id, req.authUser!.id)).limit(1);
    const user = rows[0];
    if (!user?.totpEnabled || !user.totpSecret) throw badRequest("المصادقة الثنائية غير مفعلة.");
    if (!verifyTotp(user.totpSecret, body.code)) throw badRequest("رمز التحقق غير صحيح.");
    await app.db
      .update(users)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await app.db.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
    await writeAudit(app.db, req, { action: "auth.totp_disabled", entity: "user", entityId: user.id });
    return { ok: true };
  });

  /* إعادة تعيين كلمة المرور برمز استرداد — للطوارئ عند فقدان كلمة المرور */
  app.post(
    P + "/recovery/reset",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req) => {
      const body = recoveryResetSchema.parse(req.body);
      const identifier = body.identifier.toLowerCase();
      if (await isLockedOut(app, identifier, req.ip)) throw tooMany();

      const rows = await app.db
        .select()
        .from(users)
        .where(and(sql`lower(${users.email}) = ${identifier}`, isNull(users.deletedAt)))
        .limit(1);
      const user = rows[0];
      const fail = async (): Promise<never> => {
        await app.db.insert(loginAttempts).values({ identifier, ip: req.ip, success: false });
        throw unauthorized("بيانات الاسترداد غير صحيحة.");
      };
      if (!user) return fail();
      const codeHash = sha256(body.recoveryCode.trim().toUpperCase());
      const codeRows = await app.db
        .select()
        .from(recoveryCodes)
        .where(and(eq(recoveryCodes.userId, user.id), eq(recoveryCodes.codeHash, codeHash), isNull(recoveryCodes.usedAt)))
        .limit(1);
      if (!codeRows[0]) return fail();

      await app.db.update(recoveryCodes).set({ usedAt: new Date() }).where(eq(recoveryCodes.id, codeRows[0].id));
      const passwordHash = await hashPassword(body.newPassword);
      await app.db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
      await app.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
      await writeAudit(app.db, req, { action: "auth.recovery_reset", entity: "user", entityId: user.id });
      return { ok: true, message: "تم تغيير كلمة المرور. سجّل الدخول من جديد." };
    }
  );
}
