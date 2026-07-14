import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { FragranceFinder } from "@/components/fragrance-finder";
import { ArrowLeft, WhatsAppIcon } from "@/components/icons";
import { PRODUCTS } from "@/lib/products";
import { waLink } from "@/lib/config";

export default function Home() {
  const featured = PRODUCTS.filter((product) => product.featured);
  return (
    <>
      <Hero />
      <section className="trust-strip" aria-label="مزايا المتجر"><div className="shell trust-items"><span>التوصيل داخل نواكشوط</span><span>الطلب عبر WhatsApp</span><span>عطور أصلية مختارة</span><span>تعبئة 10ml متوفرة</span></div></section>

      <section className="featured-section section-pad">
        <div className="shell section-heading"><div><span className="section-kicker">مختارات فالكون</span><h2>روائح صنعت حضورها</h2></div><Link href="/shop" className="text-link">عرض المجموعة <ArrowLeft /></Link></div>
        <div className="product-rail scroller">{featured.map((product) => <ProductCard key={product.slug} product={product} immersive />)}</div>
      </section>

      <section id="decants" className="decant-section">
        <div className="decant-media"><Image src="/images/decants.jpg" alt="عبوات 10ml مع زجاجات العطور الأصلية في فالكون ستور" fill sizes="100vw" /></div>
        <div className="shell decant-layout">
          <Reveal className="decant-copy"><span className="section-kicker">تجربة 10ml</span><h2>جرّب الفخامة قبل اقتناء الزجاجة</h2><p>اختر عطرك المفضل بحجم عملي. تعبئة دقيقة من الزجاجة الأصلية، مناسبة للتجربة أو الاستخدام اليومي والسفر.</p><div className="decant-steps"><span><b className="num">01</b> اختيار العطر</span><span><b className="num">02</b> تعبئة دقيقة</span><span><b className="num">03</b> استلام الطلب</span></div><Link href="/shop?size=10ml" className="btn btn-crimson">استكشف عطور 10ml <ArrowLeft /></Link></Reveal>
        </div>
      </section>

      <FragranceFinder />

      <section className="authenticity section-pad">
        <div className="shell authenticity-grid">
          <Reveal className="auth-copy"><span className="section-kicker">الثقة بالتفاصيل</span><h2>الأصالة ليست وعداً جانبياً</h2><p>نعرض العبوة الأصلية والتغليف والتركيز والحجم وحالة التوفر بوضوح. وكل تعبئة 10ml تُجهز من الزجاجة الأصلية أمام معايير دقيقة.</p><ul><li>صور المنتج والعلبة</li><li>بلد المنشأ والتركيز</li><li>حالة التوفر الفعلية</li><li>تأكيد الطلب قبل الدفع</li></ul></Reveal>
          <Reveal className="auth-image" delay={0.12}><Image src="/images/vault-boxes.jpg" alt="عبوات وعُلب عطور أصلية موثقة" fill sizes="(max-width: 800px) 100vw, 50vw" /><div className="auth-stamp"><strong>موثّق</strong><span>قبل الطلب</span></div></Reveal>
        </div>
      </section>

      <section id="visit" className="visit-section">
        <div className="visit-image"><Image src="/images/storefront.jpg" alt="واجهة متجر فالكون ستور للعطور في نواكشوط" fill sizes="100vw" /></div>
        <div className="shell visit-content"><Reveal><span className="section-kicker">نواكشوط</span><h2>من الخزنة إلى بابك</h2><p>اطلب عبر واتساب، اختر منطقتك وطريقة الدفع، وسنؤكد التوفر وموعد التوصيل معك مباشرة.</p><div className="visit-actions"><a href={waLink("السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")} className="btn btn-whatsapp"><WhatsAppIcon /> تواصل عبر واتساب</a><Link href="/checkout" className="btn btn-ghost">ابدأ طلباً</Link></div></Reveal></div>
      </section>
    </>
  );
}
