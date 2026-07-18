import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ── الهوية والصلاحيات ─────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    username: text("username"),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    uniqueIndex("users_username_uq").on(t.username),
  ]
);

export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  createdAt: createdAt(),
});

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })]
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("recovery_codes_user_idx").on(t.userId)]
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    ip: text("ip").notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("login_attempts_identifier_idx").on(t.identifier, t.createdAt),
    index("login_attempts_ip_idx").on(t.ip, t.createdAt),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: jsonb("meta"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_entity_idx").on(t.entity, t.entityId)]
);

/* ── الكتالوج ───────────────────────────────────────────── */

export const brands = pgTable("brands", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameFr: text("name_fr"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    gender: text("gender"),
    concentration: text("concentration"),
    origin: text("origin"),
    seasons: text("seasons"),
    projection: text("projection"),
    glow: text("glow").notNull().default("#5e0a22"),
    families: jsonb("families").$type<string[]>().notNull().default([]),
    times: jsonb("times").$type<string[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_brand_idx").on(t.brandId),
    check("products_status_chk", sql`${t.status} in ('draft','published','hidden')`),
  ]
);

export const productTranslations = pgTable(
  "product_translations",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    notesTop: jsonb("notes_top").$type<string[]>().notNull().default([]),
    notesHeart: jsonb("notes_heart").$type<string[]>().notNull().default([]),
    notesBase: jsonb("notes_base").$type<string[]>().notNull().default([]),
  },
  (t) => [
    uniqueIndex("product_translations_uq").on(t.productId, t.locale),
    check("product_translations_locale_chk", sql`${t.locale} in ('ar','fr')`),
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sizeLabel: text("size_label").notNull(),
    sizeMl: integer("size_ml").notNull(),
    sku: text("sku").notNull(),
    priceMru: integer("price_mru"),
    compareAtPriceMru: integer("compare_at_price_mru"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    type: text("type").notNull().default("full_bottle"),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_variants_label_uq").on(t.productId, t.sizeLabel),
    uniqueIndex("product_variants_sku_uq").on(t.sku),
    check("product_variants_size_ml_chk", sql`${t.sizeMl} > 0`),
    check("product_variants_price_chk", sql`${t.priceMru} is null or ${t.priceMru} >= 0`),
    check(
      "product_variants_compare_price_chk",
      sql`${t.compareAtPriceMru} is null or (${t.priceMru} is not null and ${t.compareAtPriceMru} >= ${t.priceMru})`
    ),
    check("product_variants_stock_chk", sql`${t.stockQuantity} >= 0`),
    check("product_variants_low_stock_chk", sql`${t.lowStockThreshold} >= 0`),
    check("product_variants_type_chk", sql`${t.type} in ('decant','full_bottle')`),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)]
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    orderId: uuid("order_id"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("inventory_movements_variant_idx").on(t.variantId, t.createdAt),
    check(
      "inventory_movements_reason_chk",
      sql`${t.reason} in ('order','cancel','restock','adjustment','correction')`
    ),
  ]
);

/* ── العملاء والطلبات ───────────────────────────────────── */

export const customers = pgTable("customers", {
  id: id(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const addresses = pgTable(
  "addresses",
  {
    id: id(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    area: text("area").notNull(),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("addresses_customer_idx").on(t.customerId)]
);

export const paymentMethods = pgTable("payment_methods", {
  id: id(),
  key: text("key").notNull().unique(),
  labelAr: text("label_ar").notNull(),
  labelFr: text("label_fr"),
  instructionsAr: text("instructions_ar"),
  enabled: boolean("enabled").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const deliveryZones = pgTable("delivery_zones", {
  id: id(),
  nameAr: text("name_ar").notNull(),
  nameFr: text("name_fr"),
  feeMru: integer("fee_mru"),
  etaAr: text("eta_ar"),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number").notNull().unique(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    area: text("area").notNull(),
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, { onDelete: "set null" }),
    deliveryFeeMru: integer("delivery_fee_mru"),
    deliveryNote: text("delivery_note"),
    paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id, { onDelete: "set null" }),
    paymentMethodLabel: text("payment_method_label").notNull(),
    subtotalMru: integer("subtotal_mru").notNull().default(0),
    totalMru: integer("total_mru").notNull().default(0),
    hasUnpricedItems: boolean("has_unpriced_items").notNull().default(false),
    status: text("status").notNull().default("new"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_phone_idx").on(t.phone),
    check(
      "orders_status_chk",
      sql`${t.status} in ('new','confirmed','preparing','out_for_delivery','completed','cancelled')`
    ),
    check("orders_total_chk", sql`${t.totalMru} >= 0 and ${t.subtotalMru} >= 0`),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productSlug: text("product_slug"),
    nameAr: text("name_ar").notNull(),
    brandName: text("brand_name"),
    size: text("size").notNull(),
    qty: integer("qty").notNull(),
    unitPriceMru: integer("unit_price_mru"),
    lineTotalMru: integer("line_total_mru"),
    createdAt: createdAt(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), check("order_items_qty_chk", sql`${t.qty} > 0`)]
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId, t.createdAt)]
);

/* ── الإعدادات والمحتوى والوسائط ────────────────────────── */

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const setupProgress = pgTable("setup_progress", {
  key: text("key").primaryKey(),
  completed: boolean("completed").notNull().default(false),
  data: jsonb("data"),
  updatedAt: updatedAt(),
});

export const contentSections = pgTable(
  "content_sections",
  {
    id: id(),
    key: text("key").notNull().unique(),
    type: text("type").notNull().default("section"),
    titleAr: text("title_ar"),
    bodyAr: text("body_ar"),
    titleFr: text("title_fr"),
    bodyFr: text("body_fr"),
    data: jsonb("data"),
    enabled: boolean("enabled").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: updatedAt(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [check("content_sections_type_chk", sql`${t.type} in ('hero','section','offer','banner','faq','testimonial')`)]
);

export const mediaAssets = pgTable("media_assets", {
  id: id(),
  fileName: text("file_name").notNull(),
  url: text("url").notNull().unique(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
