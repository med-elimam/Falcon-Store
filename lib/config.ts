/**
 * إعدادات متجر الصقر — عدّل هذه القيم قبل النشر.
 */
export const STORE = {
  nameAr: "متجر الصقر للعطور",
  nameEn: "FALCON STORE",
  tagline: "رائحة تسبق حضورك",
  city: "نواكشوط",
  /** ⚠️ ضع رقم واتساب المتجر الحقيقي هنا (بصيغة دولية بدون +) */
  whatsapp: "22200000000",
  instagram: "falconstore.mr",
} as const;

export const AREAS = [
  "تفرغ زينة",
  "لكصر",
  "عرفات",
  "دار النعيم",
  "توجنين",
  "الرياض",
  "السبخة",
  "الميناء",
  "تيارت",
  "خارج نواكشوط",
] as const;

export const PAYMENT_METHODS = [
  { id: "bankily", label: "Bankily" },
  { id: "masrvi", label: "Masrvi" },
  { id: "sedad", label: "Sedad" },
  { id: "cod", label: "الدفع عند الاستلام" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function waLink(message: string) {
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`;
}
