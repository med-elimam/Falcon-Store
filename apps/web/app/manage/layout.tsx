"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "@falcon/shared";
import { api } from "@/lib/client-api";
import { CloseIcon, FalconMark, MenuIcon } from "@/components/icons";
import { LoginForm } from "@/components/login-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { requestHomeIntro } from "@/components/brand-intro-events";
import { LoadingBlock, MeProvider, ToastProvider, useMe } from "@/components/manage/ui";

const NAV: { group: string; items: { href: string; label: string; perm?: string }[] }[] = [
  {
    group: "المتابعة",
    items: [
      { href: "/manage", label: "نظرة عامة" },
      { href: "/manage/orders", label: "الطلبات", perm: "orders.read" },
      { href: "/manage/customers", label: "العملاء", perm: "customers.read" },
    ],
  },
  {
    group: "الكتالوج",
    items: [
      { href: "/manage/products", label: "المنتجات والأحجام", perm: "products.read" },
      { href: "/manage/brands", label: "العلامات التجارية", perm: "products.read" },
      { href: "/manage/categories", label: "التصنيفات", perm: "products.read" },
      { href: "/manage/inventory", label: "المخزون", perm: "inventory.read" },
      { href: "/manage/offers", label: "العروض", perm: "offers.write" },
      { href: "/manage/media", label: "الوسائط", perm: "media.write" },
    ],
  },
  {
    group: "المتجر",
    items: [
      { href: "/manage/content", label: "محتوى الموقع", perm: "content.write" },
      { href: "/manage/settings", label: "إعدادات المتجر", perm: "settings.read" },
      { href: "/manage/setup", label: "معالج الإعداد", perm: "settings.write" },
    ],
  },
  {
    group: "الأمان",
    items: [
      { href: "/manage/staff", label: "الموظفون والصلاحيات", perm: "staff.manage" },
      { href: "/manage/audit", label: "سجل النشاط", perm: "audit.read" },
      { href: "/manage/security", label: "أمان الحساب" },
    ],
  },
];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, refresh } = useMe();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };

    desktopViewport.addEventListener("change", closeOnDesktop);
    return () => desktopViewport.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  if (status === "loading") {
    return (
      <div className="manage-shell" style={{ gridTemplateColumns: "1fr" }}>
        <LoadingBlock label="جارٍ التحقق من الجلسة…" />
      </div>
    );
  }

  if (status === "guest" || !user) {
    return (
      <div className="manage-shell" style={{ gridTemplateColumns: "1fr", placeItems: "center" }}>
        <div className="manage-card" style={{ width: "min(94vw, 430px)", margin: "60px 0" }}>
          <ThemeSwitcher variant="panel" className="manage-login-theme" />
          <LoginForm onSuccess={refresh} />
        </div>
      </div>
    );
  }

  const can = (perm?: string) => !perm || user.permissions.includes(perm as never);
  const activeItem = NAV.flatMap((group) => group.items).find((item) => item.href === pathname);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const keepFocusInSidebar = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !mobileMenuOpen) return;

    const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="manage-shell">
      <header className="manage-mobile-bar">
        <Link href="/manage" className="manage-mobile-brand" aria-label="لوحة إدارة فالكون">
          <FalconMark />
          <span>
            <b>FALCON — الإدارة</b>
            <small>{activeItem?.label ?? "لوحة الإدارة"}</small>
          </span>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="manage-menu-button"
          aria-label="فتح قائمة الإدارة"
          aria-controls="manage-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon />
        </button>
      </header>
      <button
        type="button"
        className="manage-menu-backdrop"
        aria-label="إغلاق قائمة الإدارة"
        tabIndex={-1}
        data-open={mobileMenuOpen || undefined}
        onClick={closeMobileMenu}
      />
      <aside
        ref={sidebarRef}
        id="manage-navigation"
        className="manage-sidebar"
        aria-label="قائمة الإدارة"
        data-open={mobileMenuOpen || undefined}
        onKeyDown={keepFocusInSidebar}
      >
        <div className="manage-sidebar-head">
          <Link href="/manage" className="manage-logo" aria-label="لوحة إدارة فالكون" onClick={closeMobileMenu}>
            <FalconMark />
            <b>FALCON — الإدارة</b>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="manage-sidebar-close"
            aria-label="إغلاق قائمة الإدارة"
            onClick={closeMobileMenu}
          >
            <CloseIcon />
          </button>
        </div>
        <ThemeSwitcher variant="panel" className="manage-theme" />
        <nav className="manage-nav" aria-label="أقسام الإدارة">
          {NAV.map((group) => {
            const items = group.items.filter((i) => can(i.perm));
            if (!items.length) return null;
            return (
              <div key={group.group}>
                <div className="nav-group">{group.group}</div>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={pathname === item.href ? "active" : ""}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="manage-side-foot">
          <div className="manage-user" style={{ padding: "0 12px 8px" }}>
            <b>{user.displayName}</b>
            <span>{user.roles.map((r) => ROLE_LABELS[r]).join("، ")}</span>
          </div>
          <Link href="/" onClick={closeMobileMenu}>فتح المتجر ←</Link>
          <button
            onClick={async () => {
              try {
                await api("/api/v1/auth/logout", { method: "POST" });
              } finally {
                refresh();
                requestHomeIntro("/");
                router.push("/");
              }
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <div className="manage-main" inert={mobileMenuOpen ? true : undefined}>{children}</div>
    </div>
  );
}

export default function ManageLayout({ children }: { children: ReactNode }) {
  return (
    <MeProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </MeProvider>
  );
}
