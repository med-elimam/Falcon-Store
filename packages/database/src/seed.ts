import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { createDb } from "./index.js";
import { seedCore } from "./seed-core.js";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(here, "../.env") });
loadDotenv({ path: path.resolve(here, "../../../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Aborting seed.");
  process.exit(1);
}

const { db, pool } = createDb(url);
try {
  await seedCore(db);
  console.log("Seed completed: roles, permissions, catalog, payment options, delivery zone suggestions.");
} finally {
  await pool.end();
}
