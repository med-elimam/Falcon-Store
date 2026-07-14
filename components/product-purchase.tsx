"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Product, Size } from "@/lib/products";
import { formatMRU } from "@/lib/format";
import { STORE, waLink } from "@/lib/config";
import { useCart } from "@/lib/cart";
import { WhatsAppIcon } from "./icons";

export function ProductPurchase({ product }: { product: Product }) {
  const first = product.sizes.find((size) => size.available) ?? product.sizes[0];
  const [size, setSize] = useState<Size>(first.size);
  const [image, setImage] = useState(product.gallery[0] ?? product.image);
  const offer = useMemo(() => product.sizes.find((entry) => entry.size === size) ?? first, [product, size, first]);
  const add = useCart((state) => state.add);
  const message = `السلام عليكم، أريد طلب ${product.nameAr} (${product.brand}) بحجم ${offer.size}.`;

  return (
    <section className="product-detail-hero shell">
      <div className="product-gallery">
        <div className="gallery-main" style={{ "--product-glow": product.glow } as React.CSSProperties}>
          <AnimatePresence mode="wait"><motion.div key={image} initial={{ opacity: 0.3, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><Image src={image} alt={`${product.nameAr} — صورة المنتج`} fill priority sizes="(max-width: 900px) 100vw, 52vw" /></motion.div></AnimatePresence>
          <span className="gallery-counter num">{String(product.gallery.indexOf(image) + 1).padStart(2, "0")} / {String(product.gallery.length).padStart(2, "0")}</span>
        </div>
        {product.gallery.length > 1 && <div className="gallery-thumbs">{product.gallery.map((entry, index) => <button key={entry} className={entry === image ? "active" : ""} onClick={() => setImage(entry)} aria-label={`الصورة ${index + 1}`}><Image src={entry} alt="" fill sizes="76px" /></button>)}</div>}
      </div>
      <div className="product-buy">
        <div className="product-brand"><span>{product.brand}</span><i /><span>{product.concentration}</span></div>
        <h1>{product.nameAr}</h1><strong className="latin-name">{product.nameEn}</strong>
        <p className="product-description">{product.descriptionAr}</p>
        <div className="availability"><span className={offer.available ? "dot available" : "dot"} />{offer.available ? "متوفر الآن" : "غير متوفر حالياً"}{offer.decant && <b>تعبئة من الزجاجة الأصلية</b>}</div>
        <fieldset className="size-picker"><legend>اختر الحجم</legend><div>{product.sizes.map((entry) => <button key={entry.size} disabled={!entry.available} className={size === entry.size ? "selected" : ""} onClick={() => setSize(entry.size)}><span className="num">{entry.size}</span><small>{entry.available ? formatMRU(entry.price) : "غير متوفر"}</small></button>)}</div></fieldset>
        <div className="live-price"><small>السعر الحالي</small><strong className="num">{formatMRU(offer.price)}</strong><span>بالأوقية الجديدة</span></div>
        <div className="buy-actions"><button className="btn btn-crimson" disabled={!offer.available} onClick={() => add({ slug: product.slug, nameAr: product.nameAr, brand: product.brand, image: product.image, size: offer.size, price: offer.price })}>أضف إلى السلة</button><a className="btn btn-whatsapp" href={waLink(message)}><WhatsAppIcon /> اطلب عبر واتساب</a></div>
        {STORE.whatsapp === "22200000000" && <p className="config-warning">تنبيه للإدارة: حدّث رقم واتساب في <code>lib/config.ts</code> قبل النشر.</p>}
      </div>
    </section>
  );
}
