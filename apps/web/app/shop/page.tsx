import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop-catalog";
import { getCatalog, getPublicSettings } from "@/lib/api";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "مجموعة العطور",
  description: "تصفح عطور فالكون ستور وتعبئات 10ml المتوفرة.",
};

export default async function ShopPage() {
  const [products, settings] = await Promise.all([getCatalog(), getPublicSettings()]);
  const display = settings?.commerce.currencyDisplay ?? "mru";
  return (
    <div className="page-shell">
      <section className="shop-hero">
        <div className="shell">
          <span className="section-kicker">مجموعة فالكون</span>
          <h1>خزنة الروائح</h1>
          <p>اختر حسب العلامة أو الطابع، وشاهد السعر والتوفر قبل الطلب.</p>
        </div>
      </section>
      <section className="shell shop-section">
        {products === null ? (
          <div className="no-results">
            <strong>تعذر تحميل المجموعة مؤقتًا</strong>
            <p>نعمل على إعادة الاتصال. حدّث الصفحة بعد قليل.</p>
          </div>
        ) : (
          <Suspense fallback={<div className="catalog-loading">جارٍ فتح الخزنة…</div>}>
            <ShopCatalog products={products} display={display} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
