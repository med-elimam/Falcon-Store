"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CurrencyDisplay, ProductCardDTO } from "@falcon/shared";
import { formatMRU } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { ArrowLeft } from "./icons";

const STOCK_LABELS = {
  available: "متوفر",
  low_stock: "بقي القليل",
  out_of_stock: "نفد مؤقتًا",
} as const;

export function ProductCard({
  product,
  immersive = false,
  display = "mru",
}: {
  product: ProductCardDTO;
  immersive?: boolean;
  display?: CurrencyDisplay;
}) {
  const first = product.variants.find((variant) => variant.isAvailable) ?? product.variants[0];
  const [variantId, setVariantId] = useState(first?.id ?? "");
  const selected = useMemo(
    () => product.variants.find((variant) => variant.id === variantId) ?? first,
    [first, product.variants, variantId]
  );
  const add = useCart((state) => state.add);

  return (
    <article
      className={immersive ? "product-card immersive" : "product-card"}
      style={{ "--product-glow": product.glow } as React.CSSProperties}
    >
      <Link href={`/product/${product.slug}`} className="product-image-link" aria-label={`عرض ${product.nameAr}`}>
        <div className="product-image">
          {product.image && (
            <Image
              src={mediaSrc(product.image)}
              alt={product.imageAlt ?? `${product.nameAr} من ${product.brandName}`}
              fill
              sizes={immersive ? "(max-width: 768px) 82vw, 420px" : "(max-width: 520px) 78vw, (max-width: 1024px) 42vw, 300px"}
            />
          )}
        </div>
        {product.hasDecant && <span className="decant-badge">تعبئة 10ml</span>}
      </Link>

      <div className="product-meta">
        <div>
          <small lang="en" dir="ltr">{product.brandName}</small>
          <h3><Link href={`/product/${product.slug}`}>{product.nameAr}</Link></h3>
          {product.nameFr && <span lang="fr" dir="ltr">{product.nameFr}</span>}
        </div>
        {selected && <strong className="product-live-price num">{formatMRU(selected.priceMru, display)}</strong>}
      </div>

      <div className="card-variant-picker" aria-label="الأحجام المتاحة">
        {product.variants.map((variant) => (
          <button
            type="button"
            key={variant.id}
            className={variant.id === selected?.id ? "selected" : ""}
            disabled={!variant.isAvailable}
            aria-pressed={variant.id === selected?.id}
            onClick={() => setVariantId(variant.id)}
          >
            <span className="num">{variant.sizeLabel}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className={`card-stock ${selected.availability}`}>
          <span aria-hidden="true" />
          {STOCK_LABELS[selected.availability]}
          {selected.availability === "low_stock" && selected.stockQuantity > 0 && selected.stockQuantity <= 2 && (
            <small>
              (بقي <b className="num">{selected.stockQuantity}</b>)
            </small>
          )}
        </div>
      )}

      <div className="product-actions">
        {selected?.isAvailable ? (
          <button
            type="button"
            className="quick-add"
            onClick={() => {
              add({
                variantId: selected.id,
                slug: product.slug,
                nameAr: product.nameAr,
                brand: product.brandName,
                image: product.image,
                size: selected.sizeLabel,
                priceMru: selected.priceMru,
                maxQuantity: selected.stockQuantity,
              });
            }}
          >
            أضف {selected.sizeLabel} إلى السلة
          </button>
        ) : (
          <Link href={`/product/${product.slug}`} className="quick-add sold-out-link">
            تفاصيل وموعد التوفر
          </Link>
        )}
        <Link href={`/product/${product.slug}`} className="round-link" aria-label={`تفاصيل ${product.nameAr}`}>
          <ArrowLeft />
        </Link>
      </div>
    </article>
  );
}
