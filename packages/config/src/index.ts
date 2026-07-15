import { z } from "zod";

/** ثوابت المنصة المشتركة. */
export const API_PREFIX = "/api/v1";
export const SESSION_COOKIE = "falcon_session";
export const CSRF_HEADER = "x-falcon-csrf";
export const MAX_BODY_BYTES = 1_048_576; // 1MB للطلبات العادية
export const MAX_UPLOAD_BYTES = 6 * 1_048_576; // 6MB للصور
export const SESSION_TTL_HOURS_DEFAULT = 24 * 14;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const LOW_STOCK_DEFAULT = 3;

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** مفتاح توقيع الكوكيز — 32 محرفًا على الأقل. */
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
  /** قائمة أصول الواجهة المسموح بها، مفصولة بفواصل. */
  WEB_ORIGINS: z
    .string()
    .min(1)
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  /** نطاق الكوكي في الإنتاج، مثل .falconstore.mr — يُترك فارغًا في التطوير. */
  COOKIE_DOMAIN: z.string().optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 90).default(SESSION_TTL_HOURS_DEFAULT),
  /** رمز إنشاء حساب المالك الأول — يُحذف من البيئة بعد الاستخدام. */
  BOOTSTRAP_TOKEN: z.string().min(24).optional(),
  /** مجلد تخزين الوسائط (Volume على Railway). */
  MEDIA_DIR: z.string().default("./media-uploads"),
  /** الأساس العام لروابط الوسائط، مثل https://api.example.com */
  PUBLIC_API_BASE: z.string().url().optional(),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = apiEnvSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid API environment configuration → ${details}`);
  }
  return parsed.data;
}
