/** أنواع ومساعدات مشتركة بين الواجهة والخادم — بدون أي اعتماد على Node أو المتصفح. */

export const ROLE_KEYS = ["owner", "manager", "inventory_staff", "order_staff"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "المالك",
  manager: "مدير",
  inventory_staff: "موظف مخزون",
  order_staff: "موظف طلبات",
};

export const PERMISSION_KEYS = [
  "dashboard.view",
  "products.read",
  "products.write",
  "orders.read",
  "orders.write",
  "inventory.read",
  "inventory.write",
  "customers.read",
  "settings.read",
  "settings.write",
  "content.write",
  "media.write",
  "offers.write",
  "staff.manage",
  "audit.read",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  owner: PERMISSION_KEYS,
  manager: [
    "dashboard.view",
    "products.read",
    "products.write",
    "orders.read",
    "orders.write",
    "inventory.read",
    "inventory.write",
    "customers.read",
    "settings.read",
    "settings.write",
    "content.write",
    "media.write",
    "offers.write",
    "audit.read",
  ],
  inventory_staff: ["dashboard.view", "products.read", "inventory.read", "inventory.write"],
  order_staff: ["dashboard.view", "orders.read", "orders.write", "customers.read", "products.read"],
};

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "تم التأكيد",
  preparing: "قيد التجهيز",
  out_for_delivery: "خرج للتوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const PRODUCT_STATUSES = ["draft", "published", "hidden"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  hidden: "مخفي",
};

export type VariantSize = string;
export const VARIANT_TYPES = ["decant", "full_bottle"] as const;
export type VariantType = (typeof VARIANT_TYPES)[number];

export const FAMILIES = ["fresh", "woody", "sweet", "leather", "fruity", "oriental"] as const;
export type Family = (typeof FAMILIES)[number];
export const FAMILY_LABELS: Record<Family, string> = {
  fresh: "منعش",
  woody: "خشبي",
  sweet: "حلو",
  leather: "جلدي",
  fruity: "فاكهي",
  oriental: "شرقي",
};

export const TIME_TAGS = ["day", "evening", "work", "occasion"] as const;
export type TimeTag = (typeof TIME_TAGS)[number];
export const TIME_LABELS: Record<TimeTag, string> = {
  day: "للنهار",
  evening: "للمساء",
  work: "للعمل",
  occasion: "للمناسبات",
};

export const INVENTORY_REASONS = ["order", "cancel", "restock", "adjustment", "correction"] as const;
export type InventoryReason = (typeof INVENTORY_REASONS)[number];
export const INVENTORY_REASON_LABELS: Record<InventoryReason, string> = {
  order: "طلب",
  cancel: "إلغاء طلب",
  restock: "توريد",
  adjustment: "تسوية",
  correction: "تصحيح",
};

/** عرض الأسعار: الأوقية الجديدة أو القديمة (القديمة = الجديدة × 10، عرضًا فقط). */
export type CurrencyDisplay = "mru" | "ouguiya_ancienne";

export interface MoneyFormatOptions {
  display?: CurrencyDisplay;
}

export function formatMoneyMRU(amountMru: number, opts: MoneyFormatOptions = {}): string {
  if (opts.display === "ouguiya_ancienne") {
    return `${(amountMru * 10).toLocaleString("en-US")} أوقية قديمة`;
  }
  return `${amountMru.toLocaleString("en-US")} MRU`;
}

export function orderNumberFromSeq(seq: number): string {
  return `FLC-${String(1000 + seq)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── DTOs shared with the storefront ─────────────────────────── */

export interface VariantDTO {
  id: string;
  sizeLabel: string;
  sizeMl: number;
  sku: string;
  priceMru: number;
  compareAtPriceMru: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  type: VariantType;
  isAvailable: boolean;
  availability: "available" | "low_stock" | "out_of_stock";
}

export interface ProductCardDTO {
  id: string;
  slug: string;
  brandName: string;
  nameAr: string;
  nameFr: string | null;
  image: string | null;
  imageAlt: string | null;
  featured: boolean;
  glow: string;
  families: Family[];
  times: TimeTag[];
  startingPriceMru: number | null;
  hasDecant: boolean;
  inStock: boolean;
  variants: VariantDTO[];
}

export interface ProductDetailDTO extends ProductCardDTO {
  descriptionAr: string | null;
  concentration: string | null;
  gender: string | null;
  origin: string | null;
  seasons: string | null;
  projection: string | null;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  images: { url: string; alt: string | null }[];
  variants: VariantDTO[];
}

export interface PublicPaymentMethodDTO {
  id: string;
  key: string;
  labelAr: string;
  instructionsAr: string | null;
}

export interface PublicDeliveryZoneDTO {
  id: string;
  nameAr: string;
  feeMru: number | null;
  etaAr: string | null;
}

export interface PublicSettingsDTO {
  identity: {
    nameAr: string | null;
    nameLatin: string | null;
    description: string | null;
    logoUrl: string | null;
  };
  contact: {
    whatsapp: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    mapUrl: string | null;
  };
  commerce: {
    currencyDisplay: CurrencyDisplay;
    pickupAvailable: boolean;
    codNote: string | null;
  };
  policies: {
    authenticity: string | null;
    returns: string | null;
    privacy: string | null;
    terms: string | null;
  };
  social: { instagram: string | null; facebook: string | null; tiktok: string | null; other: string | null };
  operations: { hoursAr: string | null };
  checkoutReady: boolean;
  paymentMethods: PublicPaymentMethodDTO[];
  deliveryZones: PublicDeliveryZoneDTO[];
}

export interface SessionUserDTO {
  id: string;
  email: string;
  displayName: string;
  roles: RoleKey[];
  permissions: PermissionKey[];
  totpEnabled: boolean;
  mustChangePassword: boolean;
}

export function waMessageForOrder(input: {
  orderNumber: string;
  customerName: string;
  phone: string;
  area: string;
  paymentLabel: string;
  deliveryNote?: string | null;
  lines: { nameAr: string; size: string; qty: number; lineTotalMru: number | null }[];
  totalMru: number;
  display?: CurrencyDisplay;
}): string {
  const items = input.lines
    .map(
      (l) =>
        `${l.nameAr} — ${l.size} × ${l.qty}${l.lineTotalMru === null ? "" : ` — ${formatMoneyMRU(l.lineTotalMru, { display: input.display })}`}`
    )
    .join("\n");
  return [
    `طلب جديد #${input.orderNumber}`,
    "",
    `العميل: ${input.customerName}`,
    `الهاتف: ${input.phone}`,
    `المنطقة: ${input.area}`,
    `طريقة الدفع: ${input.paymentLabel}`,
    input.deliveryNote ? `ملاحظة: ${input.deliveryNote}` : null,
    "",
    items,
    "",
    `الإجمالي المبدئي: ${formatMoneyMRU(input.totalMru, { display: input.display })}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
