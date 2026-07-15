import { loadApiEnv } from "@falcon/config";
import { createDb } from "@falcon/database";
import { buildApp } from "./app.js";

const env = loadApiEnv();
const { db, pool } = createDb(env.DATABASE_URL);
const app = await buildApp({ env, db });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.fatal({ err }, "failed to start server");
  process.exit(1);
}
