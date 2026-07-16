"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/client-api";
import { CartIcon, FalconMark, ShieldIcon } from "./icons";
import { LoginModal } from "./login-modal";
import { ThemeSwitcher } from "./theme-switcher";
import { useHydrated } from "./use-hydrated";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/shop", label: "العطور" },
  { href: "/#decants", label: "تعبئة 10ml" },
  { href: "/#finder", label: "اختر عطرك" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reducedMotion = useReducedMotion();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const mounted = useHydrated();
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.openDrawer);
  const count = mounted ? items.reduce((sum, item) => sum + item.qty, 0) : 0;

  /* حالة التمرير — مستمع سلبي مع rAF لتفادي أي إجهاد تخطيط */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 12));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* قفل تمرير الجسم + حبس التركيز + Escape أثناء فتح القائمة */
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const trigger = menuButtonRef.current;
    const drawer = drawerRef.current;
    const focusables = () =>
      drawer
        ? [...drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")].filter(
            (el) => el.offsetParent !== null
          )
        : [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [menuOpen]);

  /* دخول الإدارة: جلسة قائمة → لوحة التحكم مباشرة؛ وإلا نافذة الدخول */
  const openAdmin = useCallback(async () => {
    setMenuOpen(false);
    try {
      await api("/api/v1/auth/me", { timeoutMs: 6000 });
      router.push("/manage");
    } catch {
      setLoginOpen(true);
    }
  }, [router]);

  return (
    <header
      className="site-header"
      data-scrolled={scrolled || undefined}
      data-overlay={pathname === "/" || undefined}
    >
      <div className="shell header-inner">
        <button
          ref={menuButtonRef}
          className="menu-button mobile-only"
          onClick={() => setMenuOpen(true)}
          aria-label="فتح القائمة"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          data-open={menuOpen || undefined}
        >
          <span />
          <span />
          <span />
        </button>

        <Link href="/" className="brand-lockup" aria-label="فالكون ستور — الرئيسية">
          <FalconMark className="brand-mark" />
          <span>
            <strong>FALCON STORE</strong>
            <small>THE SCENT VAULT</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeSwitcher variant="compact" className="header-theme desktop-only" />
          <button
            className="icon-button desktop-only admin-entry"
            onClick={openAdmin}
            aria-label="دخول الإدارة"
            title="دخول الإدارة"
          >
            <ShieldIcon />
          </button>
          <button className="cart-button" onClick={openCart} aria-label={`السلة، ${count} منتجات`}>
            <CartIcon />
            <span className="desktop-only">السلة</span>
            {count > 0 && <b className="num">{count}</b>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="mobile-menu-layer" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }}>
            <button className="menu-scrim" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" tabIndex={-1} />
            <motion.nav
              ref={drawerRef}
              className="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="قائمة التنقل"
              initial={reducedMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reducedMotion ? undefined : { x: "100%" }}
              transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                className="menu-button in-drawer"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق القائمة"
                data-open="true"
              >
                <span />
                <span />
                <span />
              </button>
              <div className="mobile-menu-mark">
                <FalconMark />
              </div>
              <ThemeSwitcher variant="panel" className="mobile-theme-switcher" />
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <button className="admin-link" onClick={openAdmin}>
                <ShieldIcon /> دخول الإدارة
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  );
}
