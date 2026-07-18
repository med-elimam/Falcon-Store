import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { FragranceFinder } from "@/components/fragrance-finder";
import { FounderStory } from "@/components/founder-story";
import { ArrowLeft, DropIcon, ShieldIcon, TruckIcon, WalletIcon, WhatsAppIcon } from "@/components/icons";
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
  const featured = (products ?? []).filter((p) => p.featured).sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0)).slice(0, 4);
  const hasDecants = (products ?? []).some((p) => p.hasDecant);
  const heroSection = sections.find((s) => s.key === "hero");
  const decantsSection = sections.find((s) => s.key === "decants");
  const storySection = sections.find((s) => s.key === "story" && s.bodyAr);
  const offers = sections.filter((s) => s.type === "offer");
  const whatsapp = settings?.contact.whatsapp ?? null;
  const authenticity = settings?.policies.authenticity ?? null;
  const address = settings?.contact.address ?? null;
  const addressIsUrl = address ? /(?:https?:\/\/|www\.|maps\.app\.)/i.test(address) : false;
  const addressLabel = address && !addressIsUrl ? address : null;
  const mapUrl = settings?.contact.mapUrl ?? (addressIsUrl ? address : null);
  const hours = settings?.operations.hoursAr ?? null;
  const hasDelivery = (settings?.deliveryZones.length ?? 0) > 0;
  const hasPayments = (settings?.paymentMethods.length ?? 0) > 0;

  /* نقاط ثقة قصيرة تحت العنوان — من بيانات المتجر الحقيقية فقط */
  const heroTrust = [
    hasDelivery ? "توصيل داخل نواكشوط" : null,
    whatsapp ? "طلب مباشر عبر واتساب" : null,
    hasDecants ? "أحجام 10ml للتجربة" : null,
  ].filter((t): t is string => t !== null);

  /* «لماذا فالكون» — أربع مزايا كحد أقصى، من بيانات مكتملة فعلاً */
  const whyItems = [
    authenticity ? { key: "auth", icon: <ShieldIcon />, title: "عطور أصلية", body: "سياسة أصالة معلنة لكل زجاجة" } : null,
    hasDecants ? { key: "decant", icon: <DropIcon />, title: "تعبئة 10ml بعناية", body: "جرّب العطر قبل شراء الحجم الكامل" } : null,
    hasDelivery ? { key: "delivery", icon: <TruckIcon />, title: "توصيل داخل نواكشوط", body: "رسوم معلنة لكل منطقة قبل التأكيد" } : null,
    whatsapp
      ? { key: "wa", icon: <WhatsAppIcon />, title: "طلب ودعم عبر واتساب", body: "استشارة مباشرة قبل الطلب وبعده" }
      : hasPayments
        ? { key: "pay", icon: <WalletIcon />, title: "دفع محلي مألوف", body: settings!.paymentMethods.map((m) => m.labelAr).join(" · ") }
        : null,
  ]
    .filter((item) => item !== null)
    .slice(0, 4);

  const testimonials = sections
    .filter((s) => s.type === "testimonial" && s.bodyAr)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3);
  const faqs = sections.filter((s) => s.type === "faq" && s.titleAr && s.bodyAr);

  return (
    <>
      <Hero
        content={{
          titleAr: heroSection?.titleAr ?? "عطور أصلية مختارة بعناية",
          bodyAr: heroSection?.bodyAr ?? "اكتشف عطور النيش والديزاينر، وجرّب أحجام 10ml قبل شراء الزجاجة الكاملة.",
          showDecantCta: hasDecants,
          trust: heroTrust,
        }}
      />

      <section className="categories-section">
        <div className="shell">
          <div className="categories-grid">
            <Link href="/shop?category=niche" className="category-card card-niche">
              <div className="category-card-bg">
                <Image src="/images/vault-boxes.jpg" alt="عطور نيش" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" priority />
              </div>
              <div className="category-card-content">
                <span className="kicker">مجموعات خاصة</span>
                <h3>عطور نيش</h3>
                <p>إصدارات نادرة لعشاق التميز</p>
                <span className="arrow-btn">←</span>
              </div>
            </Link>
            
            <Link href="/shop?category=designer" className="category-card card-designer">
              <div className="category-card-bg">
                <Image src="/images/collection.jpg" alt="عطور ديزاينر" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="category-card-content">
                <span className="kicker">دور الأزياء العالمية</span>
                <h3>عطور ديزاينر</h3>
                <p>روائح أيقونية تناسب كل يوم</p>
                <span className="arrow-btn">←</span>
              </div>
            </Link>
            
            <Link href="/shop?family=oriental" className="category-card card-arabic">
              <div className="category-card-bg">
                <Image src="/images/uniquee-duo.jpg" alt="عطور عربية" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="category-card-content">
                <span className="kicker">أصالة الشرق</span>
                <h3>عطور عربية</h3>
                <p>فخامة العود والمسك والعنبر</p>
                <span className="arrow-btn">←</span>
              </div>
            </Link>
            
            <Link href="/shop?size=10ml" className="category-card card-decants">
              <div className="category-card-bg">
                <Image src="/images/decants.jpg" alt="عينات 10ml" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="category-card-content">
                <span className="kicker">جرّب بذكاء</span>
                <h3>عينات 10ml</h3>
                <p>تعبئة دقيقة لتجربة سهلة وسفر مريح</p>
                <span className="arrow-btn">←</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {products === null && (
        <section className="shell section-pad">
          <div className="no-results">
            <strong>تعذّر تحميل العطور مؤقتًا</strong>
            <p>نعمل على إعادة الاتصال. حدّث الصفحة بعد قليل.</p>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="featured-section section-pad">
          <div className="shell section-heading">
            <div>
              <span className="section-kicker">مختارات Falcon Store</span>
              <h2>عطور نوصي بتجربتها</h2>
            </div>
            <Link href="/shop" className="text-link">
              عرض جميع العطور <ArrowLeft />
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
              <span className="section-kicker">جرّب حجم 10ml</span>
              <h2>{decantsSection?.titleAr ?? "جرّب العطر قبل شراء الحجم الكامل"}</h2>
              {decantsSection?.bodyAr && <p>{decantsSection.bodyAr}</p>}
              <ul className="decant-points">
                <li>
                  <DropIcon /> تعبئة من الزجاجة الأصلية
                </li>
                <li>
                  <ShieldIcon /> حجم مناسب للتجربة والسفر
                </li>
                <li>
                  <TruckIcon /> توصيل داخل نواكشوط
                </li>
              </ul>
              <Link href="/shop?size=10ml" className="btn btn-crimson">
                عرض عطور 10ml <ArrowLeft />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {products !== null && products.length > 0 && <FragranceFinder products={products} />}

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

      {whyItems.length >= 3 && (
        <section className="why-section section-pad" aria-label="لماذا تختار فالكون ستور">
          <div className="shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">لماذا تختار Falcon Store؟</span>
                <h2>خدمة واضحة من الطلب حتى الاستلام</h2>
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

      {storySection && (
        <FounderStory titleAr={storySection.titleAr} bodyAr={storySection.bodyAr!} whatsapp={whatsapp} />
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
              <Link href="/faq" className="text-link">
                كل الأسئلة والسياسات <ArrowLeft />
              </Link>
            </div>
            <div className="faq-list">
              {faqs.slice(0, 4).map((f) => (
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
              <h2>اطلب عطرك واستلمه أينما كنت</h2>
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
                <Link href="/shop" className="btn btn-ghost">
                  تصفح العطور
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
