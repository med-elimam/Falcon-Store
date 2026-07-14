import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductCard } from "@/components/product-card";
import { getProduct, PRODUCTS, relatedProducts } from "@/lib/products";

export function generateStaticParams() { return PRODUCTS.map((product) => ({ slug: product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const product = getProduct(slug); if (!product) return {};
  return { title: `${product.nameAr} — ${product.brand}`, description: product.descriptionAr, openGraph: { images: [product.image] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const product = getProduct(slug); if (!product) notFound();
  const related = relatedProducts(product);
  return (
    <div className="product-page">
      <ProductPurchase product={product} />
      <section className="product-facts section-pad"><div className="shell"><div className="facts-intro"><span className="section-kicker">هوية الرائحة</span><h2>تفاصيل بلا مبالغة</h2></div><div className="facts-grid"><div><small>الطابع</small><strong>{product.families.map((item) => ({ fresh: "منعش", woody: "خشبي", sweet: "حلو", leather: "جلدي", fruity: "فاكهي", oriental: "شرقي" }[item])).join(" · ")}</strong></div><div><small>الموسم</small><strong>{product.seasons}</strong></div><div><small>الفوحان</small><strong>{product.projection}</strong></div><div><small>المنشأ</small><strong>{product.origin}</strong></div><div><small>النوع</small><strong>{product.gender}</strong></div><div><small>العبوة</small><strong>{product.retailOrTester}</strong></div></div></div></section>
      <section className="notes-section section-pad"><div className="shell notes-layout"><div><span className="section-kicker">الهرم العطري</span><h2>الرائحة عبر الوقت</h2><p>الثبات والفوحان قد يختلفان حسب البشرة والطقس وطريقة الاستخدام.</p></div><div className="note-stack"><article><span>01</span><div><small>الافتتاحية</small><strong>{product.notes.top.join(" · ")}</strong></div></article><article><span>02</span><div><small>قلب العطر</small><strong>{product.notes.heart.join(" · ")}</strong></div></article><article><span>03</span><div><small>القاعدة</small><strong>{product.notes.base.join(" · ")}</strong></div></article></div></div></section>
      {related.length > 0 && <section className="related section-pad"><div className="shell"><div className="section-heading"><div><span className="section-kicker">قد يعجبك أيضاً</span><h2>روائح من العائلة نفسها</h2></div></div><div className="product-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div></div></section>}
    </div>
  );
}
