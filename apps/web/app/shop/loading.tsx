import { CatalogSkeleton } from "@/components/catalog-skeleton";

export default function ShopLoading() {
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
        <CatalogSkeleton />
      </section>
    </div>
  );
}
