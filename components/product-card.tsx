import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { startingPrice } from "@/lib/products";
import { formatMRU } from "@/lib/format";
import { AddToCartButton } from "./add-to-cart";
import { ArrowLeft } from "./icons";

export function ProductCard({ product, immersive = false }: { product: Product; immersive?: boolean }) {
  const decant = product.sizes.some((size) => size.size === "10ml" && size.available);
  return (
    <article className={immersive ? "product-card immersive" : "product-card"} style={{ "--product-glow": product.glow } as React.CSSProperties}>
      <Link href={`/product/${product.slug}`} className="product-image-link" aria-label={`عرض ${product.nameAr}`}>
        <div className="product-image"><Image src={product.image} alt={`${product.nameAr} من ${product.brand}`} fill sizes={immersive ? "(max-width: 768px) 82vw, 440px" : "(max-width: 768px) 70vw, 320px"} /></div>
        {decant && <span className="decant-badge">10ml متوفر</span>}
      </Link>
      <div className="product-meta">
        <div><small>{product.brand}</small><h3><Link href={`/product/${product.slug}`}>{product.nameAr}</Link></h3><span>{product.nameEn}</span></div>
        <div className="product-price"><small>ابتداءً من</small><strong className="num">{formatMRU(startingPrice(product))}</strong></div>
      </div>
      <div className="product-actions"><AddToCartButton product={product} className="quick-add" label="إضافة سريعة" /><Link href={`/product/${product.slug}`} className="round-link" aria-label="التفاصيل"><ArrowLeft /></Link></div>
    </article>
  );
}
