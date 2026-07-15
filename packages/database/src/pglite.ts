/**
 * قاعدة بيانات PGlite داخل الذاكرة للاختبارات — تشغّل نفس ملفات الهجرة الحقيقية.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema.js";

export type TestDatabase = PgliteDatabase<typeof schema>;

export async function createTestDb(): Promise<{ db: TestDatabase; client: PGlite }> {
  const client = new PGlite({ extensions: { uuid_ossp } });
  const db = drizzle(client, { schema });
  const here = path.dirname(fileURLToPath(import.meta.url));
  await migrate(db, { migrationsFolder: path.resolve(here, "../migrations") });
  return { db, client };
}
