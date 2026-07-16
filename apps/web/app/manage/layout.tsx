"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ROLE_LABELS } from "@falcon/shared";
import { api } from "@/lib/client-api";
import { FalconMark } from "@/components/icons";
import { LoginForm } from "@/components/login-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
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

  return (
    <div className="manage-shell">
      <aside className="manage-sidebar">
        <ThemeSwitcher variant="panel" className="manage-theme" />
        <Link href="/manage" className="manage-logo" aria-label="لوحة إدارة فالكون">
          <FalconMark />
          <b>FALCON — الإدارة</b>
        </Link>
        <nav className="manage-nav" aria-label="أقسام الإدارة">
          {NAV.map((group) => {
            const items = group.items.filter((i) => can(i.perm));
            if (!items.length) return null;
            return (
              <div key={group.group}>
                <div className="nav-group">{group.group}</div>
                {items.map((item) => (
                  <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
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
          <Link href="/">فتح المتجر ←</Link>
          <button
            onClick={async () => {
              try {
                await api("/api/v1/auth/logout", { method: "POST" });
              } finally {
                refresh();
                router.push("/");
              }
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <div className="manage-main">{children}</div>
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
