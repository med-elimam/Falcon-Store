import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop-catalog";

export const metadata: Metadata = { title: "مجموعة العطور", description: "تصفح عطور فالكون ستور الأصلية وتعبئات 10ml المتوفرة." };

export default function ShopPage() {
  return (
    <div className="page-shell">
      <section className="shop-hero"><div className="shell"><span className="section-kicker">مجموعة فالكون</span><h1>خزنة الروائح</h1><p>اختر حسب العلامة أو الطابع، وشاهد السعر والتوفر قبل الطلب.</p></div></section>
      <section className="shell shop-section"><Suspense fallback={<div className="catalog-loading">جارٍ فتح الخزنة…</div>}><ShopCatalog /></Suspense></section>
    </div>
  );
}
