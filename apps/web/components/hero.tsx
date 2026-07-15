import Link from "next/link";
import { getImageProps } from "next/image";
import { ArrowLeft, FalconMark } from "./icons";

export interface HeroContent {
  titleAr: string;
  bodyAr: string | null;
  showDecantCta: boolean;
}

function HeroMedia() {
  const common = { alt: "", sizes: "(max-width: 760px) 100vw, 58vw", priority: true, quality: 82 } as const;
  const desktop = getImageProps({ ...common, src: "/images/hero-wide.jpg", width: 1672, height: 941 });
  const mobile = getImageProps({ ...common, src: "/images/hero-tall.jpg", width: 941, height: 1672 });

  return (
    <picture>
      <source media="(max-width: 760px)" srcSet={mobile.props.srcSet} sizes="100vw" />
      <img
        {...desktop.props}
        alt="مجموعة مختارة من عطور فالكون ستور"
      />
    </picture>
  );
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
          <HeroMedia />
          <span className="hero-visual-caption">عطور أصلية · تعبئة دقيقة · مخزون فعلي</span>
        </div>
      </div>
    </section>
  );
}
