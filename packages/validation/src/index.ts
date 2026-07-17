import { z } from "zod";
import {
  FAMILIES,
  INVENTORY_REASONS,
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  ROLE_KEYS,
  TIME_TAGS,
  VARIANT_TYPES,
} from "@falcon/shared";

/* ── قواعد الحقول الأساسية ──────────────────────────────── */

export const passwordSchema = z
  .string()
  .min(12, "كلمة المرور يجب ألا تقل عن 12 محرفًا")
  .max(128, "كلمة المرور طويلة جدًا")
  .refine(
    (v) => v.length >= 16 || (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)),
    "استخدم حروفًا كبيرة وصغيرة وأرقامًا، أو 16 محرفًا على الأقل"
  );

export const emailSchema = z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح").max(190);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{8,15}$/, "رقم هاتف غير صالح");
export const uuidSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "المعرّف اللاتيني يقبل حروفًا صغيرة وأرقامًا وشرطات فقط");
const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null))
    .nullish()
    .transform((v) => v ?? null);

/* ── المصادقة ───────────────────────────────────────────── */

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(190),
  password: z.string().min(1).max(128),
  totp: z.string().trim().max(12).optional(),
});

export const bootstrapOwnerSchema = z.object({
  token: z.string().min(24).max(256),
  email: emailSchema,
  displayName: trimmed(80),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const totpVerifySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

export const recoveryResetSchema = z.object({
  identifier: z.string().trim().min(3).max(190),
  recoveryCode: z.string().trim().min(8).max(64),
  newPassword: passwordSchema,
});

export const staffResetSchema = z.object({
  userId: uuidSchema,
  tempPassword: passwordSchema,
});

export const staffCreateSchema = z.object({
  email: emailSchema,
  displayName: trimmed(80),
  role: z.enum(ROLE_KEYS),
  tempPassword: passwordSchema,
});

export const staffUpdateSchema = z.object({
  displayName: trimmed(80).optional(),
  role: z.enum(ROLE_KEYS).optional(),
  isActive: z.boolean().optional(),
});

/* ── الكتالوج ───────────────────────────────────────────── */

export const brandSchema = z.object({
  name: trimmed(120),
  nameAr: optionalText(120),
  slug: slugSchema,
});

export const categorySchema = z.object({
  nameAr: trimmed(120),
  nameFr: optionalText(120),
  slug: slugSchema,
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const translationSchema = z.object({
  name: trimmed(160),
  description: optionalText(1200),
  notesTop: z.array(trimmed(60)).max(10).default([]),
  notesHeart: z.array(trimmed(60)).max(10).default([]),
  notesBase: z.array(trimmed(60)).max(10).default([]),
});

export const productUpsertSchema = z.object({
  slug: slugSchema,
  brandId: uuidSchema.nullish().transform((v) => v ?? null),
  categoryId: uuidSchema.nullish().transform((v) => v ?? null),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  gender: optionalText(40),
  concentration: optionalText(60),
  origin: optionalText(60),
  seasons: optionalText(80),
  projection: optionalText(80),
  glow: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#5e0a22"),
  families: z.array(z.enum(FAMILIES)).max(6).default([]),
  times: z.array(z.enum(TIME_TAGS)).max(4).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  translations: z.object({
    ar: translationSchema,
    fr: translationSchema.partial({ name: true }).nullish().transform((v) => v ?? null),
  }),
});

/**
 * مخطط تعديل جزئي صريح: الحقول الغائبة تبقى undefined ولا تُحوَّل إلى null،
 * حتى لا يمسح التعديل الجزئي بيانات موجودة.
 */
export const productPatchSchema = z.object({
  slug: slugSchema.optional(),
  brandId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  featured: z.boolean().optional(),
  gender: z.string().trim().min(1).max(40).nullable().optional(),
  concentration: z.string().trim().min(1).max(60).nullable().optional(),
  origin: z.string().trim().min(1).max(60).nullable().optional(),
  seasons: z.string().trim().min(1).max(80).nullable().optional(),
  projection: z.string().trim().min(1).max(80).nullable().optional(),
  glow: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  families: z.array(z.enum(FAMILIES)).max(6).optional(),
  times: z.array(z.enum(TIME_TAGS)).max(4).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  translations: z
    .object({
      ar: translationSchema,
      fr: translationSchema.partial({ name: true }).nullable().optional(),
    })
    .optional(),
});

export const variantUpsertSchema = z
  .object({
    id: uuidSchema.optional(),
    sizeLabel: trimmed(32),
    sizeMl: z.number().int().min(1).max(10_000),
    sku: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._-]+$/, "رمز SKU يقبل الحروف والأرقام والنقاط والشرطات فقط"),
    priceMru: z.number().int().min(0).max(100_000_000).nullable(),
    compareAtPriceMru: z.number().int().min(0).max(100_000_000).nullable().default(null),
    stockQuantity: z.number().int().min(0).max(1_000_000).default(0),
    lowStockThreshold: z.number().int().min(0).max(1_000_000).default(3),
    type: z.enum(VARIANT_TYPES).default("full_bottle"),
    isActive: z.boolean().default(true),
    isAvailable: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .superRefine((value, ctx) => {
    if (value.compareAtPriceMru !== null && (value.priceMru === null || value.compareAtPriceMru < value.priceMru)) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPriceMru"],
        message: "سعر المقارنة يجب أن يكون أكبر من السعر الحالي أو مساويًا له",
      });
    }
  });

export const productImagesSchema = z.object({
  images: z
    .array(z.object({ url: trimmed(500), alt: optionalText(200) }))
    .max(12),
});

/* ── المخزون ────────────────────────────────────────────── */

export const stockAdjustSchema = z.object({
  variantId: uuidSchema,
  delta: z
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((v) => v !== 0, "قيمة التعديل لا يمكن أن تكون صفرًا"),
  reason: z.enum(INVENTORY_REASONS),
  note: optionalText(300),
});

/* ── الطلبات ────────────────────────────────────────────── */

export const orderCreateSchema = z.object({
  customerName: trimmed(120),
  phone: phoneSchema,
  deliveryZoneId: uuidSchema,
  deliveryNote: optionalText(300),
  paymentMethodId: uuidSchema,
  idempotencyKey: uuidSchema,
  items: z
    .array(z.object({ variantId: uuidSchema, qty: z.number().int().min(1).max(20) }))
    .min(1, "أضف منتجًا واحدًا على الأقل")
    .max(20),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(300),
});

/* ── الإعدادات ──────────────────────────────────────────── */

export const settingsIdentitySchema = z.object({
  nameAr: optionalText(120),
  nameLatin: optionalText(120),
  description: optionalText(400),
  logoUrl: optionalText(500),
});

export const settingsContactSchema = z.object({
  whatsapp: phoneSchema.nullish().transform((v) => v ?? null),
  phone: phoneSchema.nullish().transform((v) => v ?? null),
  email: emailSchema.nullish().transform((v) => v ?? null),
  address: optionalText(300),
  mapUrl: optionalText(500),
});

export const settingsCommerceSchema = z.object({
  currencyDisplay: z.enum(["mru", "ouguiya_ancienne"]).default("mru"),
  pickupAvailable: z.boolean().default(false),
  codNote: optionalText(300),
});

export const settingsPoliciesSchema = z.object({
  authenticity: optionalText(2000),
  returns: optionalText(4000),
  privacy: optionalText(4000),
  terms: optionalText(4000),
});

export const settingsSocialSchema = z.object({
  instagram: optionalText(200),
  facebook: optionalText(200),
  tiktok: optionalText(200),
  other: optionalText(200),
});

export const settingsOperationsSchema = z.object({
  orderNotifyWhatsapp: phoneSchema.nullish().transform((v) => v ?? null),
  defaultStockBehavior: z.enum(["deduct", "manual"]).default("deduct"),
  lowStockThreshold: z.number().int().min(0).max(1000).default(3),
  hoursAr: optionalText(300),
});

export const settingsAppearanceSchema = z.object({
  defaultTheme: z.enum(["light", "dark", "system"]).default("light"),
});

export const SETTINGS_SCHEMAS = {
  identity: settingsIdentitySchema,
  contact: settingsContactSchema,
  commerce: settingsCommerceSchema,
  policies: settingsPoliciesSchema,
  social: settingsSocialSchema,
  operations: settingsOperationsSchema,
  appearance: settingsAppearanceSchema,
} as const;
export type SettingsGroup = keyof typeof SETTINGS_SCHEMAS;
export const SETTINGS_GROUPS = Object.keys(SETTINGS_SCHEMAS) as SettingsGroup[];

/* ── التوصيل والدفع ─────────────────────────────────────── */

export const deliveryZoneSchema = z.object({
  nameAr: trimmed(120),
  nameFr: optionalText(120),
  feeMru: z.number().int().min(0).max(1_000_000).nullable(),
  etaAr: optionalText(120),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const paymentMethodSchema = z.object({
  key: slugSchema,
  labelAr: trimmed(80),
  labelFr: optionalText(80),
  instructionsAr: optionalText(500),
  enabled: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(99).default(0),
});

/* ── المحتوى ────────────────────────────────────────────── */

export const contentSectionSchema = z.object({
  key: slugSchema,
  type: z.enum(["hero", "section", "offer", "banner", "faq", "testimonial"]).default("section"),
  titleAr: optionalText(200),
  bodyAr: optionalText(2000),
  titleFr: optionalText(200),
  bodyFr: optionalText(2000),
  enabled: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
  data: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? null),
});

/* ── الاستعلامات العامة ─────────────────────────────────── */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v?.length ? v : undefined)),
});

export const setupStepSchema = z.object({
  key: z.enum(["identity", "contact", "commerce", "delivery", "payments", "policies", "social", "operations"]),
  completed: z.boolean(),
  data: z.record(z.string(), z.unknown()).nullish().transform((v) => v ?? null),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;
export type VariantUpsertInput = z.infer<typeof variantUpsertSchema>;
