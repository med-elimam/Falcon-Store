export const HOME_IMAGES_SECTION_KEY = "home-images";

export const HOME_IMAGE_SLOTS = [
  {
    key: "categoryNiche",
    label: "بطاقة عطور النيش",
    hint: "صورة عمودية أو مربعة؛ سيُقصّ جزء منها بحسب حجم البطاقة.",
    fallback: "/images/vault-boxes.jpg",
  },
  {
    key: "categoryDesigner",
    label: "بطاقة عطور الديزاينر",
    hint: "صورة عمودية أو مربعة؛ اجعل المنتج في منتصف الصورة.",
    fallback: "/images/collection.jpg",
  },
  {
    key: "categoryArabic",
    label: "بطاقة العطور العربية",
    hint: "صورة عمودية أو مربعة بخلفية واضحة.",
    fallback: "/images/uniquee-duo.jpg",
  },
  {
    key: "categoryDecants",
    label: "بطاقة عينات 10ml",
    hint: "صورة عمودية أو مربعة تُظهر عبوات التجربة بوضوح.",
    fallback: "/images/decants.jpg",
  },
  {
    key: "decants",
    label: "قسم جرّب الفخامة",
    hint: "يفضّل مقاسًا أفقيًا بنسبة قريبة من 4:3.",
    fallback: "/images/decants.jpg",
  },
  {
    key: "story",
    label: "قسم قصتنا",
    hint: "يفضّل صورة شخصية أو صورة فريق بنسبة قريبة من 4:3.",
    fallback: "/images/falcon-founder.jpg",
  },
  {
    key: "visit",
    label: "قسم موقع المتجر والتوصيل",
    hint: "يفضّل مقاسًا أفقيًا يُظهر واجهة المتجر أو موقع الاستلام.",
    fallback: "/images/storefront.jpg",
  },
] as const;

export type HomeImageKey = (typeof HOME_IMAGE_SLOTS)[number]["key"];
export type HomeImagesData = Partial<Record<HomeImageKey, string>>;

const SLOT_KEYS = new Set<string>(HOME_IMAGE_SLOTS.map((slot) => slot.key));

/** Only media uploaded by the admin or bundled site images are accepted. */
export function isManagedImageUrl(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("/media/") || value.startsWith("/images/"));
}

export function readHomeImages(data: Record<string, unknown> | null | undefined): HomeImagesData {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => SLOT_KEYS.has(key) && isManagedImageUrl(value))
  ) as HomeImagesData;
}

export function homeImage(data: Record<string, unknown> | null | undefined, key: HomeImageKey): string {
  const custom = readHomeImages(data)[key];
  return custom ?? HOME_IMAGE_SLOTS.find((slot) => slot.key === key)!.fallback;
}
