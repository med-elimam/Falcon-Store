import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { sessions } from "@falcon/database";
import { totpCode } from "@falcon/shared/totp";
import { sha256 } from "../src/lib/crypto.js";
import {
  authed,
  bootstrapOwner,
  createTestApp,
  login,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  TEST_ORIGIN,
  type TestContext,
} from "./helpers.js";

describe("authentication & sessions", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  it("rejects bootstrap with a wrong token and accepts the correct one exactly once", async () => {
    const bad = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/bootstrap/owner",
      headers: { origin: TEST_ORIGIN },
      payload: { token: "wrong-token-wrong-token-wrong", email: OWNER_EMAIL, displayName: "x", password: OWNER_PASSWORD },
    });
    expect(bad.statusCode).toBe(400);

    await bootstrapOwner(ctx.app);

    const again = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/bootstrap/owner",
      headers: { origin: TEST_ORIGIN },
      payload: { token: "test-bootstrap-token-0123456789abcdef", email: "second@falcon.test", displayName: "x", password: OWNER_PASSWORD },
    });
    expect(again.statusCode).toBe(410);
  });

  it("returns a generic 401 for wrong password and does not reveal account existence", async () => {
    const wrongPass = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: TEST_ORIGIN },
      payload: { identifier: OWNER_EMAIL, password: "WrongPassword123" },
    });
    const noAccount = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: TEST_ORIGIN },
      payload: { identifier: "ghost@falcon.test", password: "WrongPassword123" },
    });
    expect(wrongPass.statusCode).toBe(401);
    expect(noAccount.statusCode).toBe(401);
    expect(wrongPass.json().error.message).toBe(noAccount.json().error.message);
  });

  it("locks the account after repeated failures", async () => {
    for (let i = 0; i < 5; i++) {
      await ctx.app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        headers: { origin: TEST_ORIGIN },
        payload: { identifier: "locked@falcon.test", password: "WrongPassword123" },
      });
    }
    const locked = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: TEST_ORIGIN },
      payload: { identifier: "locked@falcon.test", password: "WrongPassword123" },
    });
    expect(locked.statusCode).toBe(429);
  });

  it("logs in, exposes the session user, and rejects protected routes without a cookie", async () => {
    const cookie = await login(ctx.app);
    const me = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(cookie) });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(OWNER_EMAIL);
    expect(me.json().user.roles).toContain("owner");

    const anon = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/overview" });
    expect(anon.statusCode).toBe(401);
  });

  it("sets a secure partitioned cross-site session cookie for split production domains", async () => {
    const prod = await createTestApp({ NODE_ENV: "production" });
    try {
      await bootstrapOwner(prod.app);
      const res = await prod.app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        headers: { origin: TEST_ORIGIN },
        payload: { identifier: OWNER_EMAIL, password: OWNER_PASSWORD },
      });
      const setCookie = String(res.headers["set-cookie"]);

      expect(res.statusCode).toBe(200);
      expect(setCookie).toContain("Secure");
      expect(setCookie).toContain("Partitioned");
      expect(setCookie).toContain("SameSite=None");
    } finally {
      await prod.app.close();
    }
  });

  it("returns a structured 429 response when the login rate limit is exceeded", async () => {
    const limited = await createTestApp({}, { disableRateLimit: false });
    try {
      await bootstrapOwner(limited.app);
      const responses = [];

      for (let attempt = 0; attempt < 11; attempt += 1) {
        responses.push(
          await limited.app.inject({
            method: "POST",
            url: "/api/v1/auth/login",
            headers: { origin: TEST_ORIGIN },
            payload: { identifier: OWNER_EMAIL, password: OWNER_PASSWORD },
          })
        );
      }

      const response = responses.at(-1)!;
      expect(response.statusCode).toBe(429);
      expect(response.json()).toMatchObject({
        error: { code: "rate_limited" },
      });
    } finally {
      await limited.app.close();
    }
  });

  it("rejects mutating authenticated requests without a trusted origin (CSRF)", async () => {
    const cookie = await login(ctx.app);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie, origin: "https://evil.example" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("csrf_rejected");
  });

  it("expires sessions and honors logout-all revocation", async () => {
    const cookie = await login(ctx.app);
    const token = cookie.split("=")[1]!;
    await ctx.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.tokenHash, sha256(token)));
    const expired = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(cookie) });
    expect(expired.statusCode).toBe(401);

    const c2 = await login(ctx.app);
    const out = await ctx.app.inject({ method: "POST", url: "/api/v1/auth/logout-all", headers: authed(c2) });
    expect(out.statusCode).toBe(200);
    const afterRevoke = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(c2) });
    expect(afterRevoke.statusCode).toBe(401);
  });

  it("changes the password, revokes other sessions, and keeps a rotated session", async () => {
    const other = await login(ctx.app);
    const cookie = await login(ctx.app);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/change-password",
      headers: authed(cookie),
      payload: { currentPassword: OWNER_PASSWORD, newPassword: "NewOwnerPass1234!" },
    });
    expect(res.statusCode).toBe(200);
    const rotated = res.cookies.find((c) => c.name === "falcon_session");
    expect(rotated).toBeTruthy();

    const otherDead = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(other) });
    expect(otherDead.statusCode).toBe(401);

    const newLogin = await login(ctx.app, OWNER_EMAIL, "NewOwnerPass1234!");
    expect(newLogin).toContain("falcon_session=");
    /* إعادة كلمة المرور الأصلية لبقية الاختبارات */
    await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/change-password",
      headers: authed(newLogin),
      payload: { currentPassword: "NewOwnerPass1234!", newPassword: OWNER_PASSWORD },
    });
  });

  it("enables TOTP, requires it on login, and accepts a valid code", async () => {
    const cookie = await login(ctx.app);
    const setup = await ctx.app.inject({ method: "POST", url: "/api/v1/auth/totp/setup", headers: authed(cookie) });
    expect(setup.statusCode).toBe(200);
    const secret = setup.json().secret as string;

    const enable = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/totp/enable",
      headers: authed(cookie),
      payload: { code: totpCode(secret) },
    });
    expect(enable.statusCode).toBe(200);
    expect(enable.json().recoveryCodes).toHaveLength(10);

    const missingCode = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: TEST_ORIGIN },
      payload: { identifier: OWNER_EMAIL, password: OWNER_PASSWORD },
    });
    expect(missingCode.statusCode).toBe(401);
    expect(missingCode.json().error.code).toBe("totp_required");

    const withCode = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: TEST_ORIGIN },
      payload: { identifier: OWNER_EMAIL, password: OWNER_PASSWORD, totp: totpCode(secret) },
    });
    expect(withCode.statusCode).toBe(200);

    /* التعطيل لبقية الاختبارات */
    const c3 = `falcon_session=${withCode.cookies.find((c) => c.name === "falcon_session")!.value}`;
    const disable = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/auth/totp/disable",
      headers: authed(c3),
      payload: { code: totpCode(secret) },
    });
    expect(disable.statusCode).toBe(200);
  });
});

describe("totp implementation", () => {
  it("matches the RFC 6238 SHA-1 test vector", () => {
    /* السر النصي "12345678901234567890" بترميز Base32 */
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    /* عند t=59s القيمة الكاملة 94287082 — آخر 6 أرقام */
    expect(totpCode(secret, 59_000)).toBe("287082");
  });
});
