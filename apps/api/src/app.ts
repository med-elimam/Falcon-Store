import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import type { ApiEnv } from "@falcon/config";
import { MAX_BODY_BYTES } from "@falcon/config";
import type { AnyDb } from "@falcon/database";
import { AppError } from "./lib/errors.js";
import { resolveSession } from "./plugins/auth.js";
import "./types.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerBootstrapRoutes } from "./routes/bootstrap.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerPublicSettingsRoutes } from "./routes/public-settings.js";
import { registerOrderPublicRoutes } from "./routes/orders-public.js";
import { registerAdminProductRoutes } from "./routes/admin-products.js";
import { registerAdminTaxonomyRoutes } from "./routes/admin-taxonomy.js";
import { registerAdminOrderRoutes } from "./routes/admin-orders.js";
import { registerAdminInventoryRoutes } from "./routes/admin-inventory.js";
import { registerAdminSettingsRoutes } from "./routes/admin-settings.js";
import { registerAdminContentRoutes } from "./routes/admin-content.js";
import { registerAdminStaffRoutes } from "./routes/admin-staff.js";
import { registerAdminAuditRoutes } from "./routes/admin-audit.js";
import { registerAdminOverviewRoutes } from "./routes/admin-overview.js";
import { registerAdminMediaRoutes } from "./routes/admin-media.js";

export interface BuildAppOptions {
  env: ApiEnv;
  db: AnyDb;
  /** يسمح للاختبارات بتعطيل حدود المعدل العامة. */
  disableRateLimit?: boolean;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const { env, db } = opts;
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: ["req.headers.cookie", "req.headers.authorization", "*.password", "*.newPassword", "*.tempPassword"],
        censor: "[REDACTED]",
      },
    },
    trustProxy: env.TRUST_PROXY === true,
    bodyLimit: MAX_BODY_BYTES,
    disableRequestLogging: env.NODE_ENV === "test",
  });

  app.decorate("env", env);
  app.decorate("db", db);
  app.decorateRequest("authUser", null);
  app.decorateRequest("authSession", null);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xContentTypeOptions: true,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // طلبات بدون Origin (خوادم، فحوصات صحية) مسموحة — لا كوكيز متصفح فيها.
      if (!origin) return cb(null, true);
      if (env.WEB_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-falcon-csrf", "idempotency-key"],
    maxAge: 86400,
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET });

  if (!opts.disableRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: 300,
      timeWindow: "1 minute",
      errorResponseBuilder: () => ({
        error: { code: "rate_limited", message: "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة." },
      }),
    });
  }

  /* جلسة + حماية CSRF عبر التحقق من الأصل للطلبات المتصفحية المُعدِّلة */
  app.addHook("preHandler", async (req) => {
    await resolveSession(app, req);
    if (MUTATING.has(req.method) && req.authSession) {
      const origin = req.headers.origin;
      if (!origin || !env.WEB_ORIGINS.includes(origin)) {
        throw new AppError(403, "csrf_rejected", "طلب مرفوض: مصدر غير موثوق.");
      }
    }
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message, details: err.details ?? undefined } });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return reply.status(400).send({
        error: {
          code: "validation_error",
          message: first ? `${first.path.join(".") || "الطلب"}: ${first.message}` : "بيانات غير صالحة",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      });
    }
    if (typeof (err as { statusCode?: number }).statusCode === "number" && (err as { statusCode: number }).statusCode < 500) {
      const status = (err as { statusCode: number }).statusCode;
      return reply.status(status).send({
        error: { code: (err as { code?: string }).code ?? "request_error", message: (err as Error).message },
      });
    }
    req.log.error({ err }, "unhandled error");
    return reply.status(500).send({
      error: { code: "internal_error", message: "حدث خطأ غير متوقع. أعد المحاولة بعد قليل." },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: { code: "not_found", message: "المسار غير موجود" } });
  });

  await registerHealthRoutes(app);
  await registerBootstrapRoutes(app);
  await registerAuthRoutes(app);
  await registerCatalogRoutes(app);
  await registerPublicSettingsRoutes(app);
  await registerOrderPublicRoutes(app);
  await registerAdminOverviewRoutes(app);
  await registerAdminProductRoutes(app);
  await registerAdminTaxonomyRoutes(app);
  await registerAdminOrderRoutes(app);
  await registerAdminInventoryRoutes(app);
  await registerAdminSettingsRoutes(app);
  await registerAdminContentRoutes(app);
  await registerAdminStaffRoutes(app);
  await registerAdminAuditRoutes(app);
  await registerAdminMediaRoutes(app);

  return app;
}
