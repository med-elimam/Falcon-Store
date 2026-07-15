/**
 * تشغيل محلي بدون خادم PostgreSQL منفصل: يستخدم PGlite (محرك Postgres داخل العملية)
 * مع نفس ملفات الهجرة والزرع الحقيقية. الإنتاج يستخدم src/index.ts مع Railway PostgreSQL.
 * البيانات هنا داخل الذاكرة وتُعاد تهيئتها مع كل تشغيل.
 */
import { loadApiEnv } from "@falcon/config";
import { seedCore, type AnyDb } from "@falcon/database";
import { createTestDb } from "@falcon/database/pglite";
import { buildApp } from "./app.js";

const env = loadApiEnv({
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://pglite-in-process",
});

const { db } = await createTestDb();
await seedCore(db as unknown as AnyDb);

const app = await buildApp({ env, db: db as unknown as AnyDb });
await app.listen({ host: env.HOST, port: env.PORT });
app.log.info("API running on PGlite (in-memory Postgres) for local development");
