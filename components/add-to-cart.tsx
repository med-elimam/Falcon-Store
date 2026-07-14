"use client";

import type { Product, Size } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function AddToCartButton({ product, size, className = "btn btn-crimson", label = "أضف إلى السلة" }: { product: Product; size?: Size; className?: string; label?: string }) {
  const add = useCart((state) => state.add);
  const offer = product.sizes.find((entry) => entry.size === size && entry.available) ?? product.sizes.find((entry) => entry.available);
  if (!offer) return <button className={className} disabled>غير متوفر</button>;
  return <button className={className} onClick={() => add({ slug: product.slug, nameAr: product.nameAr, brand: product.brand, image: product.image, size: offer.size, price: offer.price })}>{label}</button>;
}
