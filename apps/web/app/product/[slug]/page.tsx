import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductCard } from "@/components/product-card";
import { FAMILY_LABELS, type Family } from "@falcon/shared";
import { getCatalog, getProductDetail, getPublicSettings } from "@/lib/api";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product || product === "unavailable") return {};
  return {
    title: `${product.nameAr} — ${product.brandName}`,
    description: product.descriptionAr ?? undefined,
    openGraph: product.image ? { images: [product.image] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings, catalog] = await Promise.all([
    getProductDetail(slug),
    getPublicSettings(),
    getCatalog(),
  ]);
  if (product === null) notFound();
  if (product === "unavailable") {
    return (
      <div className="product-page page-shell">
        <div className="shell section-pad">
          <div className="no-results">
            <strong>تعذر تحميل هذا العطر مؤقتًا</strong>
            <p>نعمل على إعادة الاتصال. حدّث الصفحة بعد قليل.</p>
          </div>
        </div>
      </div>
    );
  }

  const display = settings?.commerce.currencyDisplay ?? "mru";
  const related = (catalog ?? [])
    .filter((p) => p.slug !== product.slug && p.families.some((f) => product.families.includes(f)))
    .slice(0, 3);

  return (
    <div className="product-page">
      <ProductPurchase product={product} />
      <section className="product-facts section-pad">
        <div className="shell">
          <div className="facts-intro">
            <span className="section-kicker">هوية الرائحة</span>
            <h2>تفاصيل بلا مبالغة</h2>
          </div>
          <div className="facts-grid">
            {product.families.length > 0 && (
              <div>
                <small>الطابع</small>
                <strong>{product.families.map((f) => FAMILY_LABELS[f as Family]).join(" · ")}</strong>
              </div>
            )}
            {product.seasons && (
              <div>
                <small>الموسم</small>
                <strong>{product.seasons}</strong>
              </div>
            )}
            {product.projection && (
              <div>
                <small>الفوحان</small>
                <strong>{product.projection}</strong>
              </div>
            )}
            {product.origin && (
              <div>
                <small>المنشأ</small>
                <strong>{product.origin}</strong>
              </div>
            )}
            {product.gender && (
              <div>
                <small>النوع</small>
                <strong>{product.gender}</strong>
              </div>
            )}
            {product.concentration && (
              <div>
                <small>التركيز</small>
                <strong>{product.concentration}</strong>
              </div>
            )}
          </div>
        </div>
      </section>
      {(product.notesTop.length > 0 || product.notesHeart.length > 0 || product.notesBase.length > 0) && (
        <section className="notes-section section-pad">
          <div className="shell notes-layout">
            <div>
              <span className="section-kicker">الهرم العطري</span>
              <h2>الرائحة عبر الوقت</h2>
              <p>الثبات والفوحان قد يختلفان حسب البشرة والطقس وطريقة الاستخدام.</p>
            </div>
            <div className="note-stack">
              {product.notesTop.length > 0 && (
                <article>
                  <span className="num">01</span>
                  <div>
                    <small>الافتتاحية</small>
                    <strong>{product.notesTop.join(" · ")}</strong>
                  </div>
                </article>
              )}
              {product.notesHeart.length > 0 && (
                <article>
                  <span className="num">02</span>
                  <div>
                    <small>قلب العطر</small>
                    <strong>{product.notesHeart.join(" · ")}</strong>
                  </div>
                </article>
              )}
              {product.notesBase.length > 0 && (
                <article>
                  <span className="num">03</span>
                  <div>
                    <small>القاعدة</small>
                    <strong>{product.notesBase.join(" · ")}</strong>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="related section-pad">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">قد يعجبك أيضاً</span>
                <h2>روائح من العائلة نفسها</h2>
              </div>
            </div>
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} display={display} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
