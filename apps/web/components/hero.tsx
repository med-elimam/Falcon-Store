import Link from "next/link";
import { HeroVideo } from "./hero-video";
import { ArrowLeft, DropIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from "./icons";
import styles from "./hero.module.css";

export interface HeroContent {
  titleAr: string;
  bodyAr: string | null;
  showDecantCta: boolean;
  trust: string[];
}

function trustIcon(label: string) {
  if (label.includes("توصيل")) return <TruckIcon />;
  if (label.includes("واتساب")) return <WhatsAppIcon />;
  if (label.includes("10ml")) return <DropIcon />;
  return <ShieldIcon />;
}

/* افتتاحية المتجر: لقطة سينمائية حقيقية — الفلاكون على الطاولة والمقدّم بجانبه.
   على الشاشة العريضة يتوسط العنوانُ السترةَ المعتمة بين الزجاجة والوجه؛
   على الهاتف تنزل الرسالة والأزرار إلى سطح الطاولة أسفل ملصق الزجاجة،
   فلا يغطي النصُّ وجهَ المقدّم ولا يدَه ولا نصَّ الزجاجة في أي تكوين. */
export function Hero({ content }: { content: HeroContent }) {
  return (
    /* data-falcon-hero: تقيس الترويسة به هل ما زال المشهد خلفها فتتحول شفافة فوقه */
    <section className={styles.hero} data-falcon-hero="">
      <HeroVideo />
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.copy}>
        <p className={styles.eyebrow}>إما العظمة أو لا شيء</p>
        <h1>{content.titleAr}</h1>
        {content.bodyAr && <p className={styles.lead}>{content.bodyAr}</p>}
        <div className={styles.actions}>
          {content.showDecantCta ? (
            <>
              <Link href="/shop?size=10ml" className="btn btn-crimson">
                جرّب 10ml <ArrowLeft />
              </Link>
              <Link href="/shop" className="btn btn-ghost">
                كل العطور
              </Link>
            </>
          ) : (
            <Link href="/shop" className="btn btn-crimson">
              تصفح العطور <ArrowLeft />
            </Link>
          )}
        </div>
      </div>

      {content.trust.length > 0 && (
        <div className={styles.trust} aria-label="مزايا المتجر">
          <div className={styles.trustTrack}>
            <ul className={styles.trustList}>
              {content.trust.map((item) => (
                <li key={item}>
                  {trustIcon(item)}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className={styles.trustList} aria-hidden="true">
              {content.trust.map((item) => (
                <li key={`dup-${item}`}>
                  {trustIcon(item)}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.seam} aria-hidden="true" />
    </section>
  );
}
