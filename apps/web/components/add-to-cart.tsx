"use client";

import Link from "next/link";
import type { ProductCardDTO, ProductDetailDTO, VariantDTO } from "@falcon/shared";
import { useCart } from "@/lib/cart";

/** زر إضافة مباشرة من صفحة المنتج — يتطلب حجمًا مسعّرًا ومتاحًا. */
export function AddToCartButton({
  product,
  variant,
  className = "btn btn-crimson",
}: {
  product: ProductDetailDTO;
  variant: VariantDTO;
  className?: string;
}) {
  const add = useCart((s) => s.add);
  const disabled = !variant.isAvailable;
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={() =>
        add({
          variantId: variant.id,
          slug: product.slug,
          nameAr: product.nameAr,
          brand: product.brandName,
          image: product.image,
          size: variant.sizeLabel,
          priceMru: variant.priceMru,
          maxQuantity: variant.stockQuantity,
        })
      }
    >
      {disabled ? "غير متوفر حاليًا" : "أضف إلى السلة"}
    </button>
  );
}

/**
 * رابط احتياطي للتفاصيل. البطاقات الأساسية تعرض المتغيرات وتضيفها مباشرة.
 */
export function AddToCartLink({ product }: { product: ProductCardDTO }) {
  return (
    <Link href={`/product/${product.slug}`} className="quick-add" aria-label={`اختيار حجم ${product.nameAr}`}>
      عرض التفاصيل
    </Link>
  );
}
