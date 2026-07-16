import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { mediaStorageMode } from "../lib/media-storage.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req, reply) => {
    let dbStatus: "ok" | "down" = "ok";
    try {
      await app.db.execute(sql`select 1`);
    } catch {
      dbStatus = "down";
    }
    const status = dbStatus === "ok" ? 200 : 503;
    return reply.status(status).send({
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      mediaStorage: mediaStorageMode(app.env),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
}
