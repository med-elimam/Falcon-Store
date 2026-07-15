import type { Family, ProductCardDTO, TimeTag } from "@falcon/shared";

/** محرك ترشيح بسيط فوق بيانات الكتالوج المنشورة: عائلة عطرية + وقت الاستخدام. */
export function recommend(
  products: ProductCardDTO[],
  family: Family,
  time: TimeTag,
  count = 3
): ProductCardDTO[] {
  return [...products]
    .map((p) => ({
      p,
      score: (p.families.includes(family) ? 2 : 0) + (p.times.includes(time) ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p);
}
