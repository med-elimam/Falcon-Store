import { fileURLToPath } from "node:url";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../.env") });
loadDotenv({ path: path.resolve(here, "../../../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Aborting migration.");
  process.exit(1);
}

const { db, pool } = createDb(url);
try {
  await migrate(db, { migrationsFolder: path.resolve(here, "../migrations") });
  console.log("Migrations applied successfully.");
} finally {
  await pool.end();
}
