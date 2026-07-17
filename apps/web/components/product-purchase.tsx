"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ProductDetailDTO } from "@falcon/shared";
import { formatMRU, waLink } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { usePublicSettings } from "./settings-context";
import { WhatsAppIcon } from "./icons";

const STOCK_LABELS = {
  available: "متوفر",
  low_stock: "كمية محدودة",
  out_of_stock: "غير متوفر",
} as const;

export function ProductPurchase({ product }: { product: ProductDetailDTO }) {
  const settings = usePublicSettings();
  const display = settings?.commerce.currencyDisplay ?? "mru";
  const whatsapp = settings?.contact.whatsapp ?? null;
  const reducedMotion = useReducedMotion();
  const add = useCart((state) => state.add);
  const variants = product.variants;
  const first = variants.find((variant) => variant.isAvailable) ?? variants[0];
  const [variantId, setVariantId] = useState(first?.id ?? "");
  const [image, setImage] = useState(product.images[0]?.url ?? product.image ?? "");
  const [quantity, setQuantity] = useState(1);
  const selected = useMemo(
    () => variants.find((variant) => variant.id === variantId) ?? first,
    [first, variantId, variants]
  );

  const gallery = product.images.length ? product.images : product.image ? [{ url: product.image, alt: null }] : [];
  const waText = selected
    ? `السلام عليكم، أريد طلب ${product.nameAr} (${product.brandName}) بحجم ${selected.sizeLabel}.`
    : `السلام عليكم، أريد الاستفسار عن ${product.nameAr} (${product.brandName}).`;

  function chooseVariant(id: string) {
    setVariantId(id);
    setQuantity(1);
  }

  return (
    <section className="product-detail-hero shell">
      <div className="product-gallery">
        <div className="gallery-main" style={{ "--product-glow": product.glow } as React.CSSProperties}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={image}
              initial={reducedMotion ? false : { opacity: 0.55, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {image && (
                <Image
                  src={mediaSrc(image)}
                  alt={`${product.nameAr} — صورة المنتج`}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 52vw"
                />
              )}
            </motion.div>
          </AnimatePresence>
          {gallery.length > 1 && (
            <span className="gallery-counter num">
              {String(gallery.findIndex((entry) => entry.url === image) + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}
            </span>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="gallery-thumbs">
            {gallery.map((entry, index) => (
              <button
                type="button"
                key={entry.url}
                className={entry.url === image ? "active" : ""}
                onClick={() => setImage(entry.url)}
                aria-label={`الصورة ${index + 1}`}
              >
                <Image src={mediaSrc(entry.url)} alt="" fill sizes="76px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-buy">
        <div className="product-brand">
          <span>{product.brandName}</span>
          <i />
          {product.concentration && <span>{product.concentration}</span>}
        </div>
        <h1>{product.nameAr}</h1>
        {product.nameFr && <strong className="latin-name">{product.nameFr}</strong>}
        {product.descriptionAr && <p className="product-description">{product.descriptionAr}</p>}

        <fieldset className="size-picker">
          <legend>اختر الحجم</legend>
          <div>
            {variants.map((variant) => (
              <button
                type="button"
                key={variant.id}
                disabled={!variant.isAvailable}
                className={variantId === variant.id ? "selected" : ""}
                aria-pressed={variantId === variant.id}
                onClick={() => chooseVariant(variant.id)}
              >
                <span className="num">{variant.sizeLabel}</span>
                <small className="num">{formatMRU(variant.priceMru, display)}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {selected && (
          <>
            <div className={`availability ${selected.availability}`}>
              <span className={selected.isAvailable ? "dot available" : "dot"} />
              <b>{STOCK_LABELS[selected.availability]}</b>
              {selected.isAvailable && <span>الكمية المتاحة: <b className="num">{selected.stockQuantity}</b></span>}
              {selected.type === "decant" && <small>تعبئة 10ml من الزجاجة الأصلية</small>}
            </div>

            <div className="live-price">
              <strong className="num">{formatMRU(selected.priceMru, display)}</strong>
              {selected.compareAtPriceMru && (
                <del className="num">{formatMRU(selected.compareAtPriceMru, display)}</del>
              )}
            </div>

            <div className="quantity-control">
              <span>الكمية</span>
              <div>
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}>−</button>
                <output className="num" aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(selected.stockQuantity, 20, value + 1))}
                  disabled={!selected.isAvailable || quantity >= Math.min(selected.stockQuantity, 20)}
                >+</button>
              </div>
            </div>
          </>
        )}

        <div className="buy-actions">
          <button
            type="button"
            className="btn btn-crimson"
            disabled={!selected?.isAvailable}
            onClick={() => {
              if (!selected?.isAvailable) return;
              add({
                variantId: selected.id,
                slug: product.slug,
                nameAr: product.nameAr,
                brand: product.brandName,
                image: product.image,
                size: selected.sizeLabel,
                priceMru: selected.priceMru,
                maxQuantity: selected.stockQuantity,
              }, quantity);
            }}
          >
            {selected?.isAvailable ? "أضف إلى السلة" : "غير متوفر"}
          </button>
          {whatsapp && (
            <a className="btn btn-whatsapp" href={waLink(whatsapp, waText)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> واتساب
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
