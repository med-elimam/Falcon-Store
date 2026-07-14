/**
 * كتالوج المنتجات — الأسعار بالأوقية الجديدة (MRU).
 * السعر null = غير محسوم بعد؛ يظهر للزبون "السعر عبر واتساب".
 * ⚠️ حدّث الأسعار والتوفر من هذا الملف (أو من لوحة الإدارة لاحقًا).
 */

export type Family =
  | "fresh"
  | "woody"
  | "sweet"
  | "leather"
  | "fruity"
  | "oriental";

export type TimeTag = "day" | "evening" | "work" | "occasion";

export const FAMILY_LABELS: Record<Family, string> = {
  fresh: "منعش",
  woody: "خشبي",
  sweet: "حلو",
  leather: "جلدي",
  fruity: "فاكهي",
  oriental: "شرقي",
};

export const TIME_LABELS: Record<TimeTag, string> = {
  day: "للنهار",
  evening: "للمساء",
  work: "للعمل",
  occasion: "للمناسبات",
};

export type Size = "10ml" | "50ml" | "100ml";

export interface SizeOffer {
  size: Size;
  /** بالأوقية الجديدة MRU — null = السعر عبر واتساب */
  price: number | null;
  available: boolean;
  /** هل هي تعبئة من الزجاجة الأصلية؟ */
  decant?: boolean;
}

export interface Product {
  slug: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  brandAr: string;
  concentration: "Eau de Parfum" | "Extrait de Parfum";
  gender: "رجالي" | "نسائي" | "للجنسين";
  origin: string;
  families: Family[];
  times: TimeTag[];
  seasons: string;
  projection: string;
  image: string;
  /** صورة عريضة/إضافية للمعرض */
  gallery: string[];
  descriptionAr: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  sizes: SizeOffer[];
  featured: boolean;
  /** لون توهّج البطاقة (halo) مستمد من الزجاجة */
  glow: string;
  retailOrTester: "Retail" | "Tester";
}

export const PRODUCTS: Product[] = [
  {
    slug: "creed-aventus",
    nameAr: "أفينتوس",
    nameEn: "Aventus",
    brand: "Creed",
    brandAr: "كريد",
    concentration: "Eau de Parfum",
    gender: "رجالي",
    origin: "فرنسا",
    families: ["fruity", "woody", "leather"],
    times: ["evening", "occasion", "work"],
    seasons: "كل المواسم",
    projection: "قوي",
    image: "/images/p-aventus.jpg",
    gallery: ["/images/p-aventus.jpg", "/images/hero-wide.jpg"],
    descriptionAr:
      "أيقونة العطور الحديثة: افتتاحية أناناس مدخّنة على قاعدة خشبية واثقة. عطر الحضور الذي لا يحتاج تقديمًا.",
    notes: {
      top: ["برغموت", "ليمون", "أناناس", "تفاح"],
      heart: ["بتولا مدخّنة", "باتشولي", "ياسمين"],
      base: ["مسك", "عنبر", "طحلب البلوط"],
    },
    sizes: [
      { size: "10ml", price: 1700, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#3a4a42",
    retailOrTester: "Retail",
  },
  {
    slug: "creed-silver-mountain-water",
    nameAr: "سيلفر ماونتن ووتر",
    nameEn: "Silver Mountain Water",
    brand: "Creed",
    brandAr: "كريد",
    concentration: "Eau de Parfum",
    gender: "للجنسين",
    origin: "فرنسا",
    families: ["fresh"],
    times: ["day", "work"],
    seasons: "الربيع والصيف",
    projection: "متوسط إلى قوي",
    image: "/images/p-smw.jpg",
    gallery: ["/images/p-smw.jpg", "/images/collection.jpg"],
    descriptionAr:
      "انتعاش جليدي نظيف: شاي أخضر وكشمش أسود على مسك أبيض. اختيار النهار الذي لا يخطئ.",
    notes: {
      top: ["برغموت", "ماندرين"],
      heart: ["شاي أخضر", "كشمش أسود"],
      base: ["مسك", "خشب الصندل"],
    },
    sizes: [
      { size: "10ml", price: 1700, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#8a8f96",
    retailOrTester: "Retail",
  },
  {
    slug: "tiziana-terenzi-kirke",
    nameAr: "كيركه",
    nameEn: "Kirkè",
    brand: "Tiziana Terenzi",
    brandAr: "تيزيانا تيرينزي",
    concentration: "Extrait de Parfum",
    gender: "للجنسين",
    origin: "إيطاليا",
    families: ["fruity", "sweet"],
    times: ["evening", "occasion"],
    seasons: "كل المواسم",
    projection: "قوي جدًا",
    image: "/images/p-kirke.jpg",
    gallery: ["/images/p-kirke.jpg", "/images/vault-boxes.jpg"],
    descriptionAr:
      "خلطة الفواكه الأشهر في عالم النيش: باشن فروت وخوخ على فانيليا ومسك. ثبات الإكسترية بكامل قوته.",
    notes: {
      top: ["باشن فروت", "خوخ", "توت العليق"],
      heart: ["زنبق الوادي", "كشمش"],
      base: ["فانيليا", "مسك", "باتشولي"],
    },
    sizes: [
      { size: "10ml", price: null, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#7a1024",
    retailOrTester: "Retail",
  },
  {
    slug: "memo-madurai",
    nameAr: "مادوراي",
    nameEn: "Madurai",
    brand: "Memo Paris",
    brandAr: "ميمو باريس",
    concentration: "Eau de Parfum",
    gender: "للجنسين",
    origin: "فرنسا",
    families: ["oriental", "sweet"],
    times: ["evening", "occasion"],
    seasons: "المساء والمناسبات",
    projection: "متوسط إلى قوي",
    image: "/images/p-madurai.jpg",
    gallery: ["/images/p-madurai.jpg"],
    descriptionAr:
      "ياسمين سامباك هندي ملفوف بالهيل والتين على قاعدة دافئة. قطعة فنية بقدر ما هي عطر.",
    notes: {
      top: ["هيل", "برتقال"],
      heart: ["ياسمين سامباك", "تين"],
      base: ["فانيليا", "خشب الصندل"],
    },
    sizes: [
      { size: "10ml", price: null, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#31506e",
    retailOrTester: "Retail",
  },
  {
    slug: "uniquee-mangonifiscent",
    nameAr: "مانغونيفيسنت",
    nameEn: "Mangonifiscent",
    brand: "Unique'e Luxury",
    brandAr: "يونيكي لكجري",
    concentration: "Extrait de Parfum",
    gender: "للجنسين",
    origin: "تركيا",
    families: ["fruity", "sweet"],
    times: ["day", "occasion"],
    seasons: "الصيف",
    projection: "قوي",
    image: "/images/p-mangonifiscent.jpg",
    gallery: ["/images/p-mangonifiscent.jpg", "/images/uniquee-duo.jpg"],
    descriptionAr:
      "مانجو استوائية ناضجة بتوقيع الإكسترية: حلاوة فاكهية كثيفة تدوم يومًا كاملاً.",
    notes: {
      top: ["مانجو", "برتقال"],
      heart: ["فواكه استوائية", "ياسمين"],
      base: ["مسك", "عنبر"],
    },
    sizes: [
      { size: "10ml", price: 1400, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#1d5c40",
    retailOrTester: "Retail",
  },
  {
    slug: "uniquee-akdeniz",
    nameAr: "أكدينيز",
    nameEn: "Akdeniz",
    brand: "Unique'e Luxury",
    brandAr: "يونيكي لكجري",
    concentration: "Extrait de Parfum",
    gender: "للجنسين",
    origin: "تركيا",
    families: ["fresh"],
    times: ["day", "work"],
    seasons: "الصيف",
    projection: "متوسط إلى قوي",
    image: "/images/p-akdeniz.jpg",
    gallery: ["/images/p-akdeniz.jpg", "/images/uniquee-duo.jpg"],
    descriptionAr:
      "نسيم المتوسط في زجاجة: حمضيات مالحة وأعشاب ساحلية بثبات الإكسترية.",
    notes: {
      top: ["ليمون", "نوتات بحرية"],
      heart: ["ياسمين", "إكليل الجبل"],
      base: ["مسك", "أخشاب فاتحة"],
    },
    sizes: [
      { size: "10ml", price: 1300, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: true,
    glow: "#6e5a1d",
    retailOrTester: "Retail",
  },
  {
    slug: "goldfield-banks-pacific-rock-moss",
    nameAr: "باسيفيك روك موس",
    nameEn: "Pacific Rock Moss",
    brand: "Goldfield & Banks",
    brandAr: "غولدفيلد & بانكس",
    concentration: "Eau de Parfum",
    gender: "للجنسين",
    origin: "أستراليا",
    families: ["fresh"],
    times: ["day", "work"],
    seasons: "الربيع والصيف",
    projection: "متوسط",
    image: "/images/p-prm.jpg",
    gallery: ["/images/p-prm.jpg", "/images/collection.jpg"],
    descriptionAr:
      "المحيط الأسترالي: حمضيات على طحلب صخري وأخشاب مالحة. انتعاش نظيف يدوم.",
    notes: {
      top: ["حمضيات", "نوتات بحرية"],
      heart: ["جيرانيوم", "مريمية"],
      base: ["طحلب البلوط", "خشب الأرز"],
    },
    sizes: [
      { size: "10ml", price: 1200, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: false,
    glow: "#4a5a52",
    retailOrTester: "Retail",
  },
  {
    slug: "xerjoff-decas",
    nameAr: "ديكاس",
    nameEn: "Decas",
    brand: "Xerjoff",
    brandAr: "زيرجوف",
    concentration: "Extrait de Parfum",
    gender: "للجنسين",
    origin: "إيطاليا",
    families: ["oriental", "woody"],
    times: ["evening", "occasion"],
    seasons: "الشتاء والمساء",
    projection: "قوي",
    image: "/images/p-decas.jpg",
    gallery: ["/images/p-decas.jpg", "/images/vault-boxes.jpg"],
    descriptionAr:
      "فخامة إيطالية خالصة من مجموعة XJ 1861: توابل وورد على عنبر ولبان. للمناسبات التي تستحق.",
    notes: {
      top: ["برغموت", "توابل"],
      heart: ["ورد", "عنبر"],
      base: ["مسك", "خشب الصندل", "لبان"],
    },
    sizes: [
      { size: "10ml", price: null, available: true, decant: true },
      { size: "100ml", price: null, available: true },
    ],
    featured: false,
    glow: "#6e4a1d",
    retailOrTester: "Retail",
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function relatedProducts(p: Product, count = 3) {
  return PRODUCTS.filter(
    (o) => o.slug !== p.slug && o.families.some((f) => p.families.includes(f))
  ).slice(0, count);
}

/** محرك ترشيح بسيط: عائلة عطرية + وقت الاستخدام */
export function recommend(family: Family, time: TimeTag, count = 3) {
  return [...PRODUCTS]
    .map((p) => ({
      p,
      score:
        (p.families.includes(family) ? 2 : 0) +
        (p.times.includes(time) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, count)
    .map((x) => x.p);
}

export function startingPrice(p: Product): number | null {
  const prices = p.sizes
    .filter((s) => s.available && s.price !== null)
    .map((s) => s.price as number);
  return prices.length ? Math.min(...prices) : null;
}
