"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { CartIcon, CloseIcon, FalconMark, MenuIcon } from "./icons";
import { useHydrated } from "./use-hydrated";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/shop", label: "العطور" },
  { href: "/#decants", label: "تعبئة 10ml" },
  { href: "/#finder", label: "اختر عطرك" },
  { href: "/#visit", label: "تواصل معنا" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mounted = useHydrated();
  const items = useCart((state) => state.items);
  const openCart = useCart((state) => state.openDrawer);
  const count = mounted ? items.reduce((sum, item) => sum + item.qty, 0) : 0;

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
          <MenuIcon />
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

        <button className="cart-button" onClick={openCart} aria-label={`السلة، ${count} منتجات`}>
          <CartIcon />
          <span className="desktop-only">السلة</span>
          {count > 0 && <b>{count}</b>}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="mobile-menu-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.nav
              className="mobile-menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-label="قائمة الهاتف"
            >
              <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة"><CloseIcon /></button>
              <div className="mobile-menu-mark"><FalconMark /></div>
              {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
              <Link href="/admin" className="admin-link">لوحة الإدارة</Link>
            </motion.nav>
            <button className="menu-scrim" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
