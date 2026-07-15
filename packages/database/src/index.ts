import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export * as schema from "./schema.js";
export * from "./schema.js";
export { seedCore, type AnyDb } from "./seed-core.js";

export type Database = NodePgDatabase<typeof schema>;

export interface CreateDbResult {
  db: Database;
  pool: pg.Pool;
}

export function createDb(connectionString: string): CreateDbResult {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
