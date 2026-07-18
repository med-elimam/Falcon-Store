import Link from "next/link";
import { ArrowLeft, FalconMark } from "./icons";
import { Hero3D } from "./hero-3d";

export interface HeroContent {
  titleAr: string;
  bodyAr: string | null;
  showDecantCta: boolean;
  trust: string[];
}

export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <div className="hero-signature">
            <FalconMark />
          </div>
          <h1>{content.titleAr}</h1>
          {content.bodyAr && <p>{content.bodyAr}</p>}
          <div className="hero-actions">
            <Link href="/shop" className="btn btn-crimson">
              تصفح العطور <ArrowLeft />
            </Link>
            {content.showDecantCta && (
              <Link href="/shop?size=10ml" className="btn btn-ghost">
                اكتشف أحجام 10ml
              </Link>
            )}
          </div>
          {content.trust.length > 0 && (
            <ul className="hero-trust">
              {content.trust.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="hero-visual">
          <Hero3D />
          <span className="hero-visual-caption"><em>إما العظمة</em> أو لا شيء</span>
        </div>
      </div>
    </section>
  );
}
