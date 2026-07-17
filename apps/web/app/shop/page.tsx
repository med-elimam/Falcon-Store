import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/shop-catalog";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
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
          <span className="section-kicker">المتجر</span>
          <h1>جميع العطور</h1>
          <p>اختر حسب العلامة أو نوع الرائحة، وشاهد السعر والتوفر قبل الطلب.</p>
        </div>
      </section>
      <section className="shell shop-section">
        {products === null ? (
          <div className="no-results">
            <strong>تعذّر تحميل العطور مؤقتًا</strong>
            <p>نعمل على إعادة الاتصال. حدّث الصفحة بعد قليل.</p>
          </div>
        ) : (
          <Suspense fallback={<CatalogSkeleton />}>
            <ShopCatalog products={products} display={display} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
