import Image from "next/image";
import Link from "next/link";
import { BrandIntro } from "@/components/brand-intro";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { FragranceFinder } from "@/components/fragrance-finder";
import { ArrowLeft, DropIcon, ShieldIcon, StoreIcon, TruckIcon, WalletIcon, WhatsAppIcon } from "@/components/icons";
import { getCatalog, getContentSections, getPublicSettings } from "@/lib/api";
import { waLink } from "@/lib/format";

export const revalidate = 300;

export default async function Home() {
  const [products, settings, sections] = await Promise.all([
    getCatalog(),
    getPublicSettings(),
    getContentSections(),
  ]);

  const display = settings?.commerce.currencyDisplay ?? "mru";
  const featured = (products ?? []).filter((p) => p.featured);
  const hasDecants = (products ?? []).some((p) => p.hasDecant);
  const heroSection = sections.find((s) => s.key === "hero");
  const decantsSection = sections.find((s) => s.key === "decants");
  const offers = sections.filter((s) => s.type === "offer");
  const whatsapp = settings?.contact.whatsapp ?? null;
  const authenticity = settings?.policies.authenticity ?? null;
  const address = settings?.contact.address ?? null;
  const addressIsUrl = address ? /(?:https?:\/\/|www\.|maps\.app\.)/i.test(address) : false;
  const addressLabel = address && !addressIsUrl ? address : null;
  const mapUrl = settings?.contact.mapUrl ?? (addressIsUrl ? address : null);
  const hours = settings?.operations.hoursAr ?? null;

  /* «لماذا فالكون» يُبنى فقط من معلومات مكتملة فعلاً — لا ادعاءات فارغة */
  const whyItems = [
    authenticity ? { key: "auth", icon: <ShieldIcon />, title: "عطور أصلية", body: "سياسة أصالة معلنة لكل زجاجة" } : null,
    (settings?.deliveryZones.length ?? 0) > 0
      ? { key: "delivery", icon: <TruckIcon />, title: "توصيل داخل نواكشوط", body: "رسوم معلنة لكل منطقة قبل تأكيد الطلب" }
      : null,
    (settings?.paymentMethods.length ?? 0) > 0
      ? { key: "payment", icon: <WalletIcon />, title: "دفع محلي مألوف", body: settings!.paymentMethods.map((m) => m.labelAr).join(" · ") }
      : null,
    hasDecants ? { key: "decant", icon: <DropIcon />, title: "تعبئة 10ml دقيقة", body: "جرّب العطر قبل اقتناء الزجاجة" } : null,
    whatsapp ? { key: "wa", icon: <WhatsAppIcon />, title: "دعم عبر واتساب", body: "استشارة مباشرة قبل الطلب وبعده" } : null,
    settings?.commerce.pickupAvailable
      ? { key: "pickup", icon: <StoreIcon />, title: "الاستلام من المتجر", body: "استلم طلبك بنفسك متى ناسبك" }
      : null,
  ].filter((item) => item !== null);

  /* آراء العملاء والأسئلة الشائعة: محتوى حقيقي يُدخله صاحب المتجر من لوحة التحكم */
  const testimonials = sections.filter((s) => s.type === "testimonial" && s.bodyAr);
  const faqs = sections.filter((s) => s.type === "faq" && s.titleAr && s.bodyAr);

  return (
    <>
      <BrandIntro />
      <Hero
        content={{
          titleAr: heroSection?.titleAr ?? "روائح تصنع حضورك.",
          bodyAr: heroSection?.bodyAr ?? null,
          showDecantCta: hasDecants,
        }}
      />

      {products === null && (
        <section className="shell section-pad">
          <div className="no-results">
            <strong>تعذر تحميل المجموعة مؤقتًا</strong>
            <p>نعمل على إعادة الاتصال. حدّث الصفحة بعد قليل.</p>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="featured-section section-pad">
          <div className="shell section-heading">
            <div>
              <span className="section-kicker">مختارات فالكون</span>
              <h2>اختيارات تستحق التجربة</h2>
            </div>
            <Link href="/shop" className="text-link">
              عرض المجموعة <ArrowLeft />
            </Link>
          </div>
          <div className="product-rail">
            {featured.map((product) => (
              <ProductCard key={product.slug} product={product} display={display} immersive />
            ))}
          </div>
        </section>
      )}

      {hasDecants && (
        <section id="decants" className="decant-section">
          <div className="decant-media">
            <Image
              src="/images/decants.jpg"
              alt="عبوات 10ml مع زجاجات العطور الأصلية في فالكون ستور"
              fill
              sizes="100vw"
            />
          </div>
          <div className="shell decant-layout">
            <Reveal className="decant-copy">
              <span className="section-kicker">تجربة 10ml</span>
              <h2>{decantsSection?.titleAr ?? "جرّب الفخامة قبل اقتناء الزجاجة"}</h2>
              {decantsSection?.bodyAr && <p>{decantsSection.bodyAr}</p>}
              <div className="decant-steps">
                <span>
                  <b className="num">01</b> اختيار العطر
                </span>
                <span>
                  <b className="num">02</b> تعبئة دقيقة
                </span>
                <span>
                  <b className="num">03</b> استلام الطلب
                </span>
              </div>
              <Link href="/shop?size=10ml" className="btn btn-crimson">
                استكشف عطور 10ml <ArrowLeft />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {products !== null && products.length > 0 && <FragranceFinder products={products} display={display} />}

      {offers.length > 0 && (
        <section className="selected-collections section-pad">
          <div className="shell">
            <div className="section-heading">
              <h2>مجموعات مختارة</h2>
            </div>
            <div className="offer-list">
              {offers.map((offer) =>
                offer.titleAr ? (
                  <Reveal key={offer.key} className="offer-section">
                    <h3>{offer.titleAr}</h3>
                    {offer.bodyAr && <p className="offer-body">{offer.bodyAr}</p>}
                  </Reveal>
                ) : null
              )}
            </div>
          </div>
        </section>
      )}

      {authenticity && (
        <section className="authenticity section-pad">
          <div className="shell authenticity-grid">
            <Reveal className="auth-copy">
              <span className="section-kicker">الثقة بالتفاصيل</span>
              <h2>الأصالة ليست وعداً جانبياً</h2>
              <p>{authenticity}</p>
              <ul>
                <li>صور المنتج والعلبة</li>
                <li>بلد المنشأ والتركيز</li>
                <li>حالة التوفر الفعلية</li>
                <li>تأكيد الطلب قبل الدفع</li>
              </ul>
            </Reveal>
            <Reveal className="auth-image" delay={0.12}>
              <Image
                src="/images/vault-boxes.jpg"
                alt="عبوات وعُلب عطور من مخزون فالكون ستور"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </Reveal>
          </div>
        </section>
      )}

      {whyItems.length >= 3 && (
        <section className="why-section section-pad" aria-label="لماذا فالكون ستور">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">لماذا فالكون</span>
                <h2>تفاصيل تصنع الثقة</h2>
              </div>
            </div>
            <div className="why-grid">
              {whyItems.map((item, i) => (
                <Reveal key={item.key} className="why-item" delay={i * 0.06}>
                  {item.icon}
                  <b>{item.title}</b>
                  <p>{item.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="testimonials-section section-pad">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">آراء العملاء</span>
                <h2>قالوا عن فالكون</h2>
              </div>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((t, i) => (
                <Reveal key={t.key} className="testimonial-card" delay={i * 0.07}>
                  <span className="testimonial-quote" aria-hidden="true">
                    ”
                  </span>
                  <p>{t.bodyAr}</p>
                  {t.titleAr && <b>{t.titleAr}</b>}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section id="faq" className="faq-section section-pad">
          <div className="shell faq-layout">
            <div>
              <span className="section-kicker">أسئلة شائعة</span>
              <h2>كل ما تريد معرفته</h2>
            </div>
            <div className="faq-list">
              {faqs.map((f) => (
                <details key={f.key} className="faq-item">
                  <summary>{f.titleAr}</summary>
                  <p>{f.bodyAr}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {(whatsapp || addressLabel || mapUrl) && (
        <section id="visit" className="visit-section">
          <div className="visit-image">
            <Image src="/images/storefront.jpg" alt="واجهة متجر فالكون ستور للعطور في نواكشوط" fill sizes="100vw" />
          </div>
          <div className="visit-content">
            <Reveal>
              <span className="section-kicker">نواكشوط</span>
              <h2>من الخزنة إلى بابك</h2>
              {addressLabel && <p>{addressLabel}</p>}
              {hours && <p>{hours}</p>}
              <div className="visit-actions">
                {whatsapp && (
                  <a
                    href={waLink(whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")}
                    className="btn btn-whatsapp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon /> تواصل عبر واتساب
                  </a>
                )}
                {mapUrl && (
                  <a href={mapUrl} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                    موقع المتجر على الخريطة
                  </a>
                )}
                <Link href="/checkout" className="btn btn-ghost">
                  ابدأ طلباً
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
