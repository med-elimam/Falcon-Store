/**
 * بيانات الكتالوج الفعلية لمتجر الصقر — الأسعار بالأوقية الجديدة MRU.
 * المنتجات التي لم يحسم صاحب المتجر سعرها تبقى بحالة draft ولا تُعرض للزبائن
 * حتى يكمل بياناتها من لوحة الإدارة.
 */

export interface SeedVariant {
  size: "10ml" | "50ml" | "100ml";
  priceMru: number | null;
  isDecant: boolean;
  available: boolean;
}

export interface SeedProduct {
  slug: string;
  brand: string;
  brandSlug: string;
  nameAr: string;
  nameFr: string;
  status: "draft" | "published";
  featured: boolean;
  gender: string;
  concentration: string;
  origin: string;
  seasons: string;
  projection: string;
  glow: string;
  families: string[];
  times: string[];
  descriptionAr: string;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  image: string;
  gallery: { url: string; alt: string }[];
  variants: SeedVariant[];
  sortOrder: number;
}

export const SEED_BRANDS = [
  { slug: "creed", name: "Creed", nameAr: "كريد" },
  { slug: "tiziana-terenzi", name: "Tiziana Terenzi", nameAr: "تيزيانا تيرينزي" },
  { slug: "memo-paris", name: "Memo Paris", nameAr: "ميمو باريس" },
  { slug: "uniquee-luxury", name: "Unique'e Luxury", nameAr: "يونيكي لكجري" },
  { slug: "goldfield-banks", name: "Goldfield & Banks", nameAr: "غولدفيلد & بانكس" },
  { slug: "xerjoff", name: "Xerjoff", nameAr: "زيرجوف" },
] as const;

export const SEED_CATEGORIES = [
  { slug: "niche", nameAr: "عطور نيش", nameFr: "Parfums de niche", sortOrder: 0 },
  { slug: "designer", nameAr: "عطور مصممين", nameFr: "Parfums de créateurs", sortOrder: 1 },
  { slug: "decants-10ml", nameAr: "تعبئة 10ml", nameFr: "Décants 10ml", sortOrder: 2 },
] as const;

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "creed-aventus",
    brand: "Creed",
    brandSlug: "creed",
    nameAr: "أفينتوس",
    nameFr: "Aventus",
    status: "published",
    featured: true,
    gender: "رجالي",
    concentration: "Eau de Parfum",
    origin: "فرنسا",
    seasons: "كل المواسم",
    projection: "قوي",
    glow: "#3a4a42",
    families: ["fruity", "woody", "leather"],
    times: ["evening", "occasion", "work"],
    descriptionAr:
      "أيقونة العطور الحديثة: افتتاحية أناناس مدخّنة على قاعدة خشبية واثقة. عطر الحضور الذي لا يحتاج تقديمًا.",
    notesTop: ["برغموت", "ليمون", "أناناس", "تفاح"],
    notesHeart: ["بتولا مدخّنة", "باتشولي", "ياسمين"],
    notesBase: ["مسك", "عنبر", "طحلب البلوط"],
    image: "/images/p-aventus.jpg",
    gallery: [
      { url: "/images/p-aventus.jpg", alt: "زجاجة أفينتوس مع علبتها" },
      { url: "/images/hero-wide.jpg", alt: "أفينتوس ضمن مجموعة فالكون ستور" },
    ],
    variants: [
      { size: "10ml", priceMru: 1700, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 0,
  },
  {
    slug: "creed-silver-mountain-water",
    brand: "Creed",
    brandSlug: "creed",
    nameAr: "سيلفر ماونتن ووتر",
    nameFr: "Silver Mountain Water",
    status: "published",
    featured: true,
    gender: "للجنسين",
    concentration: "Eau de Parfum",
    origin: "فرنسا",
    seasons: "الربيع والصيف",
    projection: "متوسط إلى قوي",
    glow: "#8a8f96",
    families: ["fresh"],
    times: ["day", "work"],
    descriptionAr: "انتعاش جليدي نظيف: شاي أخضر وكشمش أسود على مسك أبيض. اختيار النهار الذي لا يخطئ.",
    notesTop: ["برغموت", "ماندرين"],
    notesHeart: ["شاي أخضر", "كشمش أسود"],
    notesBase: ["مسك", "خشب الصندل"],
    image: "/images/p-smw.jpg",
    gallery: [
      { url: "/images/p-smw.jpg", alt: "زجاجة سيلفر ماونتن ووتر مع علبتها" },
      { url: "/images/collection.jpg", alt: "سيلفر ماونتن ووتر ضمن المجموعة" },
    ],
    variants: [
      { size: "10ml", priceMru: 1700, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 1,
  },
  {
    slug: "uniquee-mangonifiscent",
    brand: "Unique'e Luxury",
    brandSlug: "uniquee-luxury",
    nameAr: "مانغونيفيسنت",
    nameFr: "Mangonifiscent",
    status: "published",
    featured: true,
    gender: "للجنسين",
    concentration: "Extrait de Parfum",
    origin: "تركيا",
    seasons: "الصيف",
    projection: "قوي",
    glow: "#1d5c40",
    families: ["fruity", "sweet"],
    times: ["day", "occasion"],
    descriptionAr: "مانجو استوائية ناضجة بتوقيع الإكسترية: حلاوة فاكهية كثيفة تدوم يومًا كاملاً.",
    notesTop: ["مانجو", "برتقال"],
    notesHeart: ["فواكه استوائية", "ياسمين"],
    notesBase: ["مسك", "عنبر"],
    image: "/images/p-mangonifiscent.jpg",
    gallery: [
      { url: "/images/p-mangonifiscent.jpg", alt: "زجاجة مانغونيفيسنت الخضراء" },
      { url: "/images/uniquee-duo.jpg", alt: "ثنائي يونيكي لكجري" },
    ],
    variants: [
      { size: "10ml", priceMru: 1400, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 2,
  },
  {
    slug: "uniquee-akdeniz",
    brand: "Unique'e Luxury",
    brandSlug: "uniquee-luxury",
    nameAr: "أكدينيز",
    nameFr: "Akdeniz",
    status: "published",
    featured: true,
    gender: "للجنسين",
    concentration: "Extrait de Parfum",
    origin: "تركيا",
    seasons: "الصيف",
    projection: "متوسط إلى قوي",
    glow: "#6e5a1d",
    families: ["fresh"],
    times: ["day", "work"],
    descriptionAr: "نسيم المتوسط في زجاجة: حمضيات مالحة وأعشاب ساحلية بثبات الإكسترية.",
    notesTop: ["ليمون", "نوتات بحرية"],
    notesHeart: ["ياسمين", "إكليل الجبل"],
    notesBase: ["مسك", "أخشاب فاتحة"],
    image: "/images/p-akdeniz.jpg",
    gallery: [
      { url: "/images/p-akdeniz.jpg", alt: "زجاجة أكدينيز الذهبية" },
      { url: "/images/uniquee-duo.jpg", alt: "ثنائي يونيكي لكجري" },
    ],
    variants: [
      { size: "10ml", priceMru: 1300, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 3,
  },
  {
    slug: "goldfield-banks-pacific-rock-moss",
    brand: "Goldfield & Banks",
    brandSlug: "goldfield-banks",
    nameAr: "باسيفيك روك موس",
    nameFr: "Pacific Rock Moss",
    status: "published",
    featured: false,
    gender: "للجنسين",
    concentration: "Eau de Parfum",
    origin: "أستراليا",
    seasons: "الربيع والصيف",
    projection: "متوسط",
    glow: "#4a5a52",
    families: ["fresh"],
    times: ["day", "work"],
    descriptionAr: "المحيط الأسترالي: حمضيات على طحلب صخري وأخشاب مالحة. انتعاش نظيف يدوم.",
    notesTop: ["حمضيات", "نوتات بحرية"],
    notesHeart: ["جيرانيوم", "مريمية"],
    notesBase: ["طحلب البلوط", "خشب الأرز"],
    image: "/images/p-prm.jpg",
    gallery: [
      { url: "/images/p-prm.jpg", alt: "زجاجة باسيفيك روك موس" },
      { url: "/images/collection.jpg", alt: "باسيفيك روك موس ضمن المجموعة" },
    ],
    variants: [
      { size: "10ml", priceMru: 1200, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 4,
  },
  {
    slug: "tiziana-terenzi-kirke",
    brand: "Tiziana Terenzi",
    brandSlug: "tiziana-terenzi",
    nameAr: "كيركه",
    nameFr: "Kirkè",
    status: "draft",
    featured: true,
    gender: "للجنسين",
    concentration: "Extrait de Parfum",
    origin: "إيطاليا",
    seasons: "كل المواسم",
    projection: "قوي جدًا",
    glow: "#7a1024",
    families: ["fruity", "sweet"],
    times: ["evening", "occasion"],
    descriptionAr: "خلطة الفواكه الأشهر في عالم النيش: باشن فروت وخوخ على فانيليا ومسك. ثبات الإكسترية بكامل قوته.",
    notesTop: ["باشن فروت", "خوخ", "توت العليق"],
    notesHeart: ["زنبق الوادي", "كشمش"],
    notesBase: ["فانيليا", "مسك", "باتشولي"],
    image: "/images/p-kirke.jpg",
    gallery: [
      { url: "/images/p-kirke.jpg", alt: "كيركه في علبتها الحمراء" },
      { url: "/images/vault-boxes.jpg", alt: "علب عطور فاخرة" },
    ],
    variants: [
      { size: "10ml", priceMru: null, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 5,
  },
  {
    slug: "memo-madurai",
    brand: "Memo Paris",
    brandSlug: "memo-paris",
    nameAr: "مادوراي",
    nameFr: "Madurai",
    status: "draft",
    featured: true,
    gender: "للجنسين",
    concentration: "Eau de Parfum",
    origin: "فرنسا",
    seasons: "المساء والمناسبات",
    projection: "متوسط إلى قوي",
    glow: "#31506e",
    families: ["oriental", "sweet"],
    times: ["evening", "occasion"],
    descriptionAr: "ياسمين سامباك هندي ملفوف بالهيل والتين على قاعدة دافئة. قطعة فنية بقدر ما هي عطر.",
    notesTop: ["هيل", "برتقال"],
    notesHeart: ["ياسمين سامباك", "تين"],
    notesBase: ["فانيليا", "خشب الصندل"],
    image: "/images/p-madurai.jpg",
    gallery: [{ url: "/images/p-madurai.jpg", alt: "زجاجة مادوراي المزخرفة" }],
    variants: [
      { size: "10ml", priceMru: null, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 6,
  },
  {
    slug: "xerjoff-decas",
    brand: "Xerjoff",
    brandSlug: "xerjoff",
    nameAr: "ديكاس",
    nameFr: "Decas",
    status: "draft",
    featured: false,
    gender: "للجنسين",
    concentration: "Extrait de Parfum",
    origin: "إيطاليا",
    seasons: "الشتاء والمساء",
    projection: "قوي",
    glow: "#6e4a1d",
    families: ["oriental", "woody"],
    times: ["evening", "occasion"],
    descriptionAr: "فخامة إيطالية خالصة من مجموعة XJ 1861: توابل وورد على عنبر ولبان. للمناسبات التي تستحق.",
    notesTop: ["برغموت", "توابل"],
    notesHeart: ["ورد", "عنبر"],
    notesBase: ["مسك", "خشب الصندل", "لبان"],
    image: "/images/p-decas.jpg",
    gallery: [
      { url: "/images/p-decas.jpg", alt: "زجاجة ديكاس" },
      { url: "/images/vault-boxes.jpg", alt: "علب عطور فاخرة" },
    ],
    variants: [
      { size: "10ml", priceMru: null, isDecant: true, available: true },
      { size: "100ml", priceMru: null, isDecant: false, available: true },
    ],
    sortOrder: 7,
  },
];

/** خيارات دفع معروفة محليًا — تُزرع معطّلة، وصاحب المتجر يفعّل ما يستخدمه فعلاً. */
export const SEED_PAYMENT_METHODS = [
  { key: "bankily", labelAr: "Bankily", labelFr: "Bankily", sortOrder: 0 },
  { key: "masrvi", labelAr: "Masrvi", labelFr: "Masrvi", sortOrder: 1 },
  { key: "sedad", labelAr: "Sedad", labelFr: "Sedad", sortOrder: 2 },
  { key: "cod", labelAr: "الدفع عند الاستلام", labelFr: "Paiement à la livraison", sortOrder: 3 },
] as const;

/** مقاطعات نواكشوط — تُزرع معطّلة وبدون رسوم؛ المالك يفعّلها ويحدد الرسوم في الإعداد. */
export const SEED_DELIVERY_ZONES = [
  "تفرغ زينة",
  "لكصر",
  "عرفات",
  "دار النعيم",
  "توجنين",
  "الرياض",
  "السبخة",
  "الميناء",
  "تيارت",
] as const;
