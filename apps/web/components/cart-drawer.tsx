"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cartTotal, useCart } from "@/lib/cart";
import { formatMRU } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { usePublicSettings } from "./settings-context";
import { CloseIcon, CartIcon } from "./icons";
import { useHydrated } from "./use-hydrated";

export function CartDrawer() {
  const mounted = useHydrated();
  const reducedMotion = useReducedMotion();
  const settings = usePublicSettings();
  const { items, drawerOpen, closeDrawer, remove, setQty } = useCart();
  const lastActiveElement = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Focus trap, focus restoration, and Escape key listener
  useEffect(() => {
    if (drawerOpen) {
      lastActiveElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeDrawer();
        }
        if (e.key === "Tab" && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0]!;
          const last = focusable[focusable.length - 1]!;
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      // Focus first focusable inside drawer
      const focusTimeout = setTimeout(() => {
        if (drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0]?.focus();
          }
        }
      }, 50);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(focusTimeout);
        if (lastActiveElement.current) {
          lastActiveElement.current.focus();
        }
      };
    }
  }, [drawerOpen, closeDrawer]);

  if (!mounted) return null;
  const total = cartTotal(items);
  const display = settings?.commerce.currencyDisplay ?? "mru";

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          className="drawer-layer"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
        >
          <button className="drawer-scrim" onClick={closeDrawer} aria-label="إغلاق السلة" />
          <motion.aside
            ref={drawerRef}
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
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
                <span className="empty-cart-mark" style={{ border: "none", width: "auto", height: "auto" }}>
                  <CartIcon style={{ width: 48, height: 48 }} />
                </span>
                <h3>سلتك فارغة</h3>
                <p>أضف عطرك المفضل وابدأ طلبك.</p>
                <Link href="/shop" className="btn btn-crimson" onClick={closeDrawer}>
                  تصفح العطور
                </Link>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const reachedLimit = item.qty >= item.maxQuantity;
                      return (
                        <motion.article
                          layout
                          initial={reducedMotion ? false : { opacity: 0, height: 0, overflow: "hidden" }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="cart-item"
                          key={item.variantId}
                        >
                          <div className="cart-thumb">
                            {item.image && <Image src={mediaSrc(item.image)} alt={item.nameAr} fill sizes="84px" />}
                          </div>
                          <div className="cart-copy">
                            <small lang="en" dir="ltr">{item.brand}</small>
                            <h3>{item.nameAr}</h3>
                            <span>
                              {item.size} · <b className="num">{formatMRU(item.priceMru, display)}</b>
                            </span>
                            <div className="qty-control">
                              <button
                                onClick={() => setQty(item.variantId, item.qty + 1)}
                                disabled={reachedLimit}
                                aria-label="زيادة الكمية"
                              >
                                +
                              </button>
                              <span className="num">{item.qty}</span>
                              <button onClick={() => setQty(item.variantId, item.qty - 1)} aria-label="إنقاص الكمية">
                                −
                              </button>
                            </div>
                            {reachedLimit && (
                              <div style={{ color: "var(--gold)", fontSize: "0.68rem", marginTop: 6 }}>
                                الكمية المتاحة بالكامل في السلة ({item.maxQuantity})
                              </div>
                            )}
                          </div>
                          <button className="remove-item" onClick={() => remove(item.variantId)}>
                            حذف
                          </button>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
                <div className="cart-summary">
                  <div>
                    <span>الإجمالي</span>
                    <strong className="num">{formatMRU(total, display)}</strong>
                  </div>
                  <p style={{ color: "var(--silver)", fontSize: "0.72rem", marginBottom: 16 }}>
                    تُضاف رسوم التوصيل بعد اختيار المنطقة.
                  </p>
                  <Link href="/checkout" className="btn btn-crimson btn-block" onClick={closeDrawer}>
                    متابعة الطلب
                  </Link>
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
