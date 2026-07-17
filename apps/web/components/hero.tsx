import Link from "next/link";
import { ArrowLeft, FalconMark } from "./icons";
import { Hero3D } from "./hero-3d";

export interface HeroContent {
  titleAr: string;
  bodyAr: string | null;
  showDecantCta: boolean;
}

export function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <div className="hero-signature">
            <FalconMark />
            <span>THE SCENT VAULT · NOUAKCHOTT</span>
          </div>
          <h1>{content.titleAr}</h1>
          {content.bodyAr && <p>{content.bodyAr}</p>}
          <div className="hero-actions">
            <Link href="/shop" className="btn btn-crimson">
              تسوّق الآن <ArrowLeft />
            </Link>
            {content.showDecantCta && (
              <Link href="#decants" className="btn btn-ghost">
                مجموعة 10ml
              </Link>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <Hero3D />
          <span className="hero-visual-caption">عطور أصلية · تعبئة دقيقة · مخزون فعلي</span>
        </div>
      </div>
    </section>
  );
}
