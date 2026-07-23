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
  /**
   * عدد الوكلاء الموثوقين أمام التطبيق (قفزات). القيمة الرقمية تعني: ثق بهذا العدد
   * من الوكلاء فقط عند قراءة X-Forwarded-For — فلا يستطيع العميل تزوير عنوانه لتجاوز
   * حدود المعدل. على Railway هناك وكيل واحد ⇒ TRUST_PROXY=1.
   * القيم: عدد صحيح موجب (قفزات) · 0/فارغ ⇒ لا ثقة (اتصال مباشر) · "true" ⇒ قفزة واحدة (توافق قديم).
   */
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v): number | boolean => {
      if (!v) return false;
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0) return n === 0 ? false : n;
      if (v.toLowerCase() === "true") return 1;
      return false;
    }),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  /* إن وُجد قرص Railway الدائم ولم يحدد المالك MEDIA_DIR صراحةً، نخزّن الصور داخل
     القرص تلقائياً بدل نظام الملفات المؤقت الذي يُمحى مع كل نشر — فلا تختفي صور
     المنتجات بعد push. تحديد MEDIA_DIR يدوياً يتقدّم على هذا دائماً. */
  const volumeMount = source.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  const patched =
    !source.MEDIA_DIR && volumeMount
      ? { ...source, MEDIA_DIR: `${volumeMount.replace(/[/\\]+$/, "")}/media-uploads` }
      : source;
  const parsed = apiEnvSchema.safeParse(patched);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid API environment configuration → ${details}`);
  }
  return parsed.data;
}
