import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { loadApiEnv } from "@falcon/config";
import { seedCore, type AnyDb } from "@falcon/database";
import { createTestDb } from "@falcon/database/pglite";
import { buildApp } from "../src/app.js";

export const TEST_ORIGIN = "http://localhost:3000";
export const BOOTSTRAP_TOKEN = "test-bootstrap-token-0123456789abcdef";
export const OWNER_EMAIL = "owner@falcon.test";
export const OWNER_PASSWORD = "OwnerPass1234!";

export interface TestContext {
  app: FastifyInstance;
  db: AnyDb;
}

export async function createTestApp(envOverrides: Record<string, string | undefined> = {}): Promise<TestContext> {
  const { db } = await createTestDb();
  await seedCore(db as unknown as AnyDb);
  const env = loadApiEnv({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://unused-in-tests",
    COOKIE_SECRET: "test-cookie-secret-test-cookie-secret-123456",
    WEB_ORIGINS: TEST_ORIGIN,
    BOOTSTRAP_TOKEN,
    MEDIA_DIR: mkdtempSync(path.join(tmpdir(), "falcon-media-")),
    LOG_LEVEL: "fatal",
    ...envOverrides,
  });
  const app = await buildApp({ env, db: db as unknown as AnyDb, disableRateLimit: true });
  await app.ready();
  return { app, db: db as unknown as AnyDb };
}

export async function bootstrapOwner(app: FastifyInstance): Promise<void> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/bootstrap/owner",
    headers: { origin: TEST_ORIGIN },
    payload: { token: BOOTSTRAP_TOKEN, email: OWNER_EMAIL, displayName: "المالك", password: OWNER_PASSWORD },
  });
  if (res.statusCode !== 201) throw new Error(`bootstrap failed: ${res.statusCode} ${res.body}`);
}

export async function login(
  app: FastifyInstance,
  identifier = OWNER_EMAIL,
  password = OWNER_PASSWORD
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: TEST_ORIGIN },
    payload: { identifier, password },
  });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  const cookie = res.cookies.find((c) => c.name === "falcon_session");
  if (!cookie) throw new Error("session cookie missing");
  return `falcon_session=${cookie.value}`;
}

export function authed(cookie: string) {
  return { cookie, origin: TEST_ORIGIN };
}
