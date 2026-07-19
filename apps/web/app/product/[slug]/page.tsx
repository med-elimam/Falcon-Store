import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductCard } from "@/components/product-card";
import { FAMILY_LABELS, type Family } from "@falcon/shared";
import { getCatalog, getProductDetail, getPublicSettings } from "@/lib/api";
import { mediaSrc } from "@/lib/media";
import { jsonLdHtml } from "@/lib/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

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
    .sort((a, b) => (a.inStock === b.inStock ? 0 : a.inStock ? -1 : 1))
    .slice(0, 3);

  /* بيانات منظمة (JSON-LD): Product + مسار التنقل — تُحسّن ظهور المنتج في نتائج البحث */
  const pricedVariants = product.variants.filter((v) => v.priceMru !== null);
  const prices = pricedVariants.map((v) => v.priceMru as number);
  const anyAvailable = product.variants.some((v) => v.isAvailable);
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr,
    ...(product.nameFr ? { alternateName: product.nameFr } : {}),
    ...(product.descriptionAr ? { description: product.descriptionAr } : {}),
    ...(product.image ? { image: [absolute(mediaSrc(product.image))] } : {}),
    brand: { "@type": "Brand", name: product.brandName },
    ...(product.variants[0]?.sku ? { sku: product.variants[0].sku } : {}),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "MRU",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: pricedVariants.length,
            availability: anyAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "العطور", item: absolute("/shop") },
      { "@type": "ListItem", position: 3, name: product.nameAr, item: absolute(`/product/${product.slug}`) },
    ],
  };

  return (
    <div className="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml([productLd, breadcrumbLd]) }}
      />
      <ProductPurchase product={product} />
      <section className="product-profile section-pad" aria-label="بصمة العطر">
        <div className="shell product-profile-grid">
          <section className="product-profile-block" aria-labelledby="scent-identity-title">
            <h2 id="scent-identity-title">هوية العطر</h2>
            <p className="product-profile-caption">ملخص سريع يساعدك على معرفة إن كان يناسب ذوقك.</p>
            <dl className="scent-facts">
              {product.families.length > 0 && (
                <div>
                  <dt>الطابع</dt>
                  <dd>{product.families.map((f) => FAMILY_LABELS[f as Family]).join(" · ")}</dd>
                </div>
              )}
              {product.seasons && (
                <div>
                  <dt>الموسم</dt>
                  <dd>{product.seasons}</dd>
                </div>
              )}
              {product.projection && (
                <div>
                  <dt>الفوحان</dt>
                  <dd>{product.projection}</dd>
                </div>
              )}
              {product.origin && (
                <div>
                  <dt>المنشأ</dt>
                  <dd>{product.origin}</dd>
                </div>
              )}
              {product.gender && (
                <div>
                  <dt>النوع</dt>
                  <dd>{product.gender}</dd>
                </div>
              )}
              {product.concentration && (
                <div>
                  <dt>التركيز</dt>
                  <dd>{product.concentration}</dd>
                </div>
              )}
            </dl>
          </section>
          {(product.notesTop.length > 0 || product.notesHeart.length > 0 || product.notesBase.length > 0) && (
            <section className="product-profile-block" aria-labelledby="scent-timeline-title">
              <h2 id="scent-timeline-title">تطوّر الرائحة</h2>
              <p className="product-profile-caption">قد يختلف الثبات والفوحان باختلاف البشرة والطقس.</p>
              <ol className="scent-timeline">
                {product.notesTop.length > 0 && (
                  <li>
                    <span className="num">01</span>
                    <div>
                      <span>الافتتاحية</span>
                      <strong>{product.notesTop.join(" · ")}</strong>
                    </div>
                  </li>
                )}
                {product.notesHeart.length > 0 && (
                  <li>
                    <span className="num">02</span>
                    <div>
                      <span>قلب العطر</span>
                      <strong>{product.notesHeart.join(" · ")}</strong>
                    </div>
                  </li>
                )}
                {product.notesBase.length > 0 && (
                  <li>
                    <span className="num">03</span>
                    <div>
                      <span>القاعدة</span>
                      <strong>{product.notesBase.join(" · ")}</strong>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          )}
        </div>
      </section>
      {related.length > 0 && (
        <section className="related section-pad">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">قد يعجبك أيضاً</span>
                <h2>عطور مشابهة</h2>
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
