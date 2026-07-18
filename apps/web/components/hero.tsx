import Link from "next/link";
import { ArrowLeft, DropIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from "./icons";
import { Hero3D } from "./hero-3d";

export interface HeroContent {
  titleAr: string;
  bodyAr: string | null;
  showDecantCta: boolean;
  trust: string[];
}

/* أيقونة مناسبة لكل نقطة ثقة قادمة من إعدادات المتجر */
function trustIcon(label: string) {
  if (label.includes("توصيل")) return <TruckIcon />;
  if (label.includes("واتساب")) return <WhatsAppIcon />;
  if (label.includes("10ml")) return <DropIcon />;
  return <ShieldIcon />;
}

/* Falcon 3D Side Reveal: مشهد واحد متصل بخلفية الصفحة — الزجاجة تدخل من جهة،
   والنص يقابلها. لا شبكة أعمدة ولا صندوق منفصل للمشهد. */
export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="hero">
      <div className="hero-stage" aria-hidden="true">
        <Hero3D />
      </div>
      <div className="shell hero-copy-wrap">
        <div className="hero-copy">
          <p className="hero-eyebrow">إما العظمة أو لا شيء</p>
          <h1>{content.titleAr}</h1>
          {content.bodyAr && <p className="hero-lead">{content.bodyAr}</p>}
          <div className="hero-actions">
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
      </div>
      {content.trust.length > 0 && (
        <div className="hero-trust" aria-label="مزايا المتجر">
          <div className="hero-trust-track">
            <ul className="hero-trust-list">
              {content.trust.map((item) => (
                <li key={item}>
                  {trustIcon(item)}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className="hero-trust-list" aria-hidden="true">
              {content.trust.map((item) => (
                <li key={`duplicate-${item}`}>
                  {trustIcon(item)}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
