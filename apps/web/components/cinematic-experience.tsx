"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CurrencyDisplay, ProductCardDTO, ProductDetailDTO } from "@falcon/shared";
import { formatMRU } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { ArrowLeft, FalconMark } from "./icons";
import styles from "./cinematic-experience.module.css";

const STOCK_LABELS = {
  available: "متوفر",
  low_stock: "كمية محدودة",
  out_of_stock: "غير متوفر",
} as const;

function OpeningMedia() {
  const common = { alt: "", sizes: "100vw", priority: true, quality: 86 } as const;
  const desktop = getImageProps({ ...common, src: "/images/hero-wide.jpg", width: 1672, height: 941 });
  const mobile = getImageProps({ ...common, src: "/images/hero-tall.jpg", width: 941, height: 1672 });

  return (
    <picture>
      <source media="(max-width: 700px)" srcSet={mobile.props.srcSet} sizes="100vw" />
      <img {...desktop.props} alt="مجموعة Falcon Store داخل إضاءة خزنة العطور" />
    </picture>
  );
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.dataset.theme = next;
    root.dataset.themeMode = next;
    root.style.colorScheme = next;
    localStorage.setItem("falcon-theme", next);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (meta) meta.content = next === "dark" ? "#070a12" : "#ebe8e2";
    setTheme(next);
  }

  return (
    <button type="button" className={styles.themeSwitch} onClick={toggle} aria-label={`تفعيل الوضع ${theme === "dark" ? "الفاتح" : "الداكن"}`}>
      <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
      <span>{theme === "dark" ? "فاتح" : "داكن"}</span>
    </button>
  );
}

export function CinematicExperience({
  products,
  product,
  display,
}: {
  products: ProductCardDTO[];
  product: ProductDetailDTO;
  display: CurrencyDisplay;
}) {
  const reducedMotion = useReducedMotion();
  const openingRef = useRef<HTMLElement>(null);
  const signatureRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [variantId, setVariantId] = useState(product.variants.find((variant) => variant.isAvailable)?.id ?? product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const add = useCart((state) => state.add);

  const { scrollYProgress: openingProgress } = useScroll({
    target: openingRef,
    offset: ["start start", "end start"],
  });
  const openingScale = useTransform(openingProgress, [0, 1], [1.02, 1.13]);
  const openingCopyY = useTransform(openingProgress, [0, 1], [0, -90]);
  const openingOpacity = useTransform(openingProgress, [0, 0.74, 1], [1, 1, 0]);
  const aperture = useTransform(openingProgress, [0, 0.5, 1], ["inset(0 46%)", "inset(0 12%)", "inset(0 0%)"]);

  const { scrollYProgress: signatureProgress } = useScroll({
    target: signatureRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(signatureProgress, "change", (value) => {
    if (reducedMotion || products.length < 2) return;
    const next = Math.min(products.length - 1, Math.floor(value * products.length));
    setActiveIndex(next);
  });

  const active = products[Math.min(activeIndex, products.length - 1)] ?? product;
  const selected = useMemo(
    () => product.variants.find((variant) => variant.id === variantId) ?? product.variants[0],
    [product.variants, variantId]
  );
  const maxQuantity = selected ? Math.min(selected.stockQuantity, 20) : 0;

  function chooseVariant(id: string) {
    setVariantId(id);
    setQuantity(1);
  }

  function addSelected() {
    if (!selected?.isAvailable) return;
    add(
      {
        variantId: selected.id,
        slug: product.slug,
        nameAr: product.nameAr,
        brand: product.brandName,
        image: product.image,
        size: selected.sizeLabel,
        priceMru: selected.priceMru,
        maxQuantity: selected.stockQuantity,
      },
      quantity
    );
  }

  return (
    <div className={`${styles.root} cinematic-prototype`}>
      <header className={styles.prototypeHeader}>
        <Link href="/experience" className={styles.lockup} aria-label="Falcon Store — بداية التجربة">
          <FalconMark />
          <span><b>FALCON STORE</b><small>THE SCENT VAULT</small></span>
        </Link>
        <nav aria-label="التنقل في النموذج السينمائي">
          <a href="#discover">اكتشف</a>
          <a href="#signatures">المجموعة</a>
          <a href="#commerce">المتجر</a>
          <a href="#falcon">عن فالكون</a>
        </nav>
        <ThemeSwitch />
      </header>

      <section ref={openingRef} id="discover" className={styles.opening} aria-labelledby="opening-title">
        <motion.div
          className={styles.openingMedia}
          style={reducedMotion ? undefined : { scale: openingScale, clipPath: aperture }}
        >
          <OpeningMedia />
        </motion.div>
        <div className={styles.openingAtmosphere} aria-hidden="true" />
        <motion.div className={styles.openingCopy} style={reducedMotion ? undefined : { y: openingCopyY, opacity: openingOpacity }}>
          <FalconMark />
          <p>Nouakchott · The Scent Vault</p>
          <h1 id="opening-title">الرائحة قبل أن تُرى.</h1>
          <a href="#signatures" className={styles.primaryAction}>ادخل الخزنة <ArrowLeft /></a>
        </motion.div>
        <span className={styles.scrollCue}>مرّر لاكتشاف العالم</span>
      </section>

      <section ref={signatureRef} id="signatures" className={styles.signatureTrack} aria-labelledby="signature-title">
        <div className={styles.signatureStage} style={{ "--scene-glow": active.glow } as React.CSSProperties}>
          <div className={styles.sceneNumber} aria-hidden="true">{String(activeIndex + 1).padStart(2, "0")}</div>
          <div className={styles.signatureCopy}>
            <p>{active.brandName}</p>
            <h2 id="signature-title">{active.nameAr}</h2>
            {active.nameFr && <span>{active.nameFr}</span>}
            <strong className="num">ابتداءً من {formatMRU(active.startingPriceMru ?? active.variants[0]!.priceMru, display)}</strong>
            <Link href={`/product/${active.slug}`} className={styles.textAction}>اكتشف العطر <ArrowLeft /></Link>
          </div>

          <div className={styles.bottleStage}>
            <span className={styles.lightSweep} aria-hidden="true" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.slug}
                className={styles.bottle}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.82, rotateY: -16, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, rotateY: 0, filter: "blur(0px)" }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 1.08, rotateY: 12, filter: "blur(8px)" }}
                transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                {active.image && <Image src={mediaSrc(active.image)} alt={active.imageAlt ?? active.nameAr} fill sizes="(max-width: 760px) 82vw, 46vw" />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={styles.signatureRail} aria-label="اختيار العطر المميز">
            {products.map((item, index) => (
              <button key={item.slug} type="button" onClick={() => setActiveIndex(index)} aria-pressed={index === activeIndex}>
                <span className="num">{String(index + 1).padStart(2, "0")}</span>
                <b>{item.nameAr}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="commerce" className={styles.commerce} style={{ "--scene-glow": product.glow } as React.CSSProperties} aria-labelledby="commerce-title">
        <div className={styles.commerceBackdrop} aria-hidden="true" />
        <div className={styles.productWorld}>
          <div className={styles.productVisual}>
            <motion.div
              className={styles.productHalo}
              animate={reducedMotion ? undefined : { rotate: [0, 6, 0], scale: [1, 1.035, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            {product.image && <Image src={mediaSrc(product.image)} alt={product.imageAlt ?? product.nameAr} fill sizes="(max-width: 760px) 100vw, 50vw" />}
            <div className={styles.noteOrbit} aria-label="مكونات العطر">
              {product.notesTop[0] && <span>{product.notesTop[0]}</span>}
              {product.notesHeart[0] && <span>{product.notesHeart[0]}</span>}
              {product.notesBase[0] && <span>{product.notesBase[0]}</span>}
            </div>
          </div>

          <div className={styles.purchasePanel}>
            <p>{product.brandName}</p>
            <h2 id="commerce-title">{product.nameAr}</h2>
            {product.descriptionAr && <div className={styles.story}>{product.descriptionAr}</div>}

            <fieldset className={styles.variantPicker}>
              <legend>اختر الحجم</legend>
              <div>
                {product.variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    disabled={!variant.isAvailable}
                    aria-pressed={variant.id === selected?.id}
                    onClick={() => chooseVariant(variant.id)}
                  >
                    <b className="num">{variant.sizeLabel}</b>
                    <span className="num">{formatMRU(variant.priceMru, display)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {selected && (
              <div className={styles.liveCommerce}>
                <div>
                  <span className={styles.stock} data-state={selected.availability}>{STOCK_LABELS[selected.availability]}</span>
                  <strong className="num">{formatMRU(selected.priceMru, display)}</strong>
                  {selected.isAvailable && <small>متاح الآن: <b className="num">{selected.stockQuantity}</b></small>}
                </div>
                <div className={styles.quantity} aria-label="الكمية">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}>−</button>
                  <output className="num" aria-live="polite">{quantity}</output>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} disabled={!selected.isAvailable || quantity >= maxQuantity}>+</button>
                </div>
              </div>
            )}

            <div className={styles.buyDock}>
              <button type="button" onClick={addSelected} disabled={!selected?.isAvailable}>أضف إلى السلة</button>
              <Link href={`/product/${product.slug}`}>كل تفاصيل العطر <ArrowLeft /></Link>
            </div>
          </div>
        </div>
      </section>

      <section id="falcon" className={styles.closing}>
        <Image src="/images/storefront.jpg" alt="واجهة Falcon Store في نواكشوط" fill sizes="100vw" />
        <div>
          <FalconMark />
          <h2>من الخزنة إلى بابك.</h2>
          <p>عطور أصلية، مخزون واضح، وتوصيل محلي من Falcon Store في نواكشوط.</p>
          <Link href="/shop">عرض المجموعة <ArrowLeft /></Link>
        </div>
      </section>
    </div>
  );
}
