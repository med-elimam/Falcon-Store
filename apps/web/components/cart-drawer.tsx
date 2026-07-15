"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { cartTotal, useCart } from "@/lib/cart";
import { formatMRU } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { usePublicSettings } from "./settings-context";
import { CloseIcon } from "./icons";
import { useHydrated } from "./use-hydrated";

export function CartDrawer() {
  const mounted = useHydrated();
  const reducedMotion = useReducedMotion();
  const settings = usePublicSettings();
  const { items, drawerOpen, closeDrawer, remove, setQty } = useCart();
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);
  if (!mounted) return null;
  const total = cartTotal(items);
  const display = settings?.commerce.currencyDisplay ?? "mru";
  const checkoutReady = settings?.checkoutReady ?? false;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div className="drawer-layer" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }}>
          <button className="drawer-scrim" onClick={closeDrawer} aria-label="إغلاق السلة" />
          <motion.aside
            className="cart-drawer"
            initial={reducedMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reducedMotion ? undefined : { x: "100%" }}
            transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
            aria-label="سلة التسوق"
          >
            <div className="drawer-head">
              <div>
                <span>طلبك</span>
                <h2>سلة العطور</h2>
              </div>
              <button className="icon-button" onClick={closeDrawer} aria-label="إغلاق السلة">
                <CloseIcon />
              </button>
            </div>
            {items.length === 0 ? (
              <div className="empty-cart">
                <span className="empty-cart-mark">F</span>
                <h3>السلة بانتظار اختيارك</h3>
                <p>اختر عطرًا من المجموعة أو جرّب تعبئة 10ml.</p>
                <Link href="/shop" className="btn btn-crimson" onClick={closeDrawer}>
                  استكشف العطور
                </Link>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {items.map((item) => (
                    <article className="cart-item" key={item.variantId}>
                      <div className="cart-thumb">
                        {item.image && <Image src={mediaSrc(item.image)} alt={item.nameAr} fill sizes="84px" />}
                      </div>
                      <div className="cart-copy">
                        <small>{item.brand}</small>
                        <h3>{item.nameAr}</h3>
                        <span>
                          {item.size} · <b className="num">{formatMRU(item.priceMru, display)}</b>
                        </span>
                        <div className="qty-control">
                          <button onClick={() => setQty(item.variantId, item.qty + 1)} aria-label="زيادة الكمية">
                            +
                          </button>
                          <span className="num">{item.qty}</span>
                          <button onClick={() => setQty(item.variantId, item.qty - 1)} aria-label="إنقاص الكمية">
                            −
                          </button>
                        </div>
                      </div>
                      <button className="remove-item" onClick={() => remove(item.variantId)}>
                        حذف
                      </button>
                    </article>
                  ))}
                </div>
                <div className="cart-summary">
                  <div>
                    <span>الإجمالي المبدئي</span>
                    <strong className="num">{formatMRU(total, display)}</strong>
                  </div>
                  {checkoutReady ? (
                    <Link href="/checkout" className="btn btn-crimson btn-block" onClick={closeDrawer}>
                      متابعة الطلب
                    </Link>
                  ) : (
                    <Link href="/checkout" className="btn btn-ghost btn-block" onClick={closeDrawer}>
                      تفاصيل إتمام الطلب
                    </Link>
                  )}
                  <button className="text-button" onClick={closeDrawer}>
                    مواصلة التسوق
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
