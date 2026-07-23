"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, DropIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from "./icons";
import type { AtmosphereHandle } from "./sanctum-atmosphere";
import styles from "./sanctum.module.css";

export interface SanctumContent {
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

/* موضع فوهة البخاخ داخل صورة الفلاكون، ثم داخل الكادر كاملاً.
   هذه هي النقطة التي يجب أن ينطلق منها الرذاذ بالضبط — تُضبط بصرياً. */
const NOZZLE_IN_IMAGE = { x: 0.5, y: 0.19 };

export function Sanctum({ content }: { content: SanctumContent }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flaconRef = useRef<HTMLDivElement>(null);
  const atmoRef = useRef<AtmosphereHandle | null>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    const thinPipe =
      connection?.saveData === true ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const low = memory <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;

    let disposed = false;
    let io: IntersectionObserver | null = null;
    let raf = 0;

    /* الفوهة تُقاس من الموضع الحقيقي لصورة الفلاكون داخل الكادر،
       فيبقى الرذاذ ملتصقاً بالبخاخ مهما تغيّر المقاس أو التكوين */
    const measure = () => {
      const atmo = atmoRef.current;
      const flacon = flaconRef.current;
      if (!atmo || !flacon) return;
      const host = canvas.getBoundingClientRect();
      const box = flacon.getBoundingClientRect();
      if (host.width < 1 || host.height < 1) return;
      const portrait = host.height > host.width;
      /* إن لم تصل صورة الفلاكون بعد، نرشّ من موضع تقريبي بدل أن يموت المشهد */
      const hasFlacon = box.width > 24 && box.height > 24;
      const nx = hasFlacon
        ? (box.left - host.left + box.width * NOZZLE_IN_IMAGE.x) / host.width
        : portrait
          ? 0.26
          : 0.2;
      const ny = hasFlacon
        ? (box.top - host.top + box.height * NOZZLE_IN_IMAGE.y) / host.height
        : portrait
          ? 0.2
          : 0.26;
      atmo.configure({
        originX: nx,
        originY: ny,
        /* على الهاتف يعبر الكادر أفقياً ثم يهبط؛ على الشاشة العريضة يمتد أبعد */
        aimX: portrait ? 0.9 : 0.94,
        aimY: portrait ? -0.44 : -0.34,
        power: portrait ? 1.5 : 1.6,
        grain: portrait ? 1.2 : 1.1,
        windX: portrait ? 0.03 : 0.05,
        windY: portrait ? 0.11 : 0.07,
      });
    };

    import("./sanctum-atmosphere").then(({ createAtmosphere }) => {
      if (disposed || thinPipe) return;
      const handle = createAtmosphere(canvas, {
        tier: low ? "low" : "high",
        reduced,
        /* الزجاجة تنضغط في اللحظة نفسها التي تنطلق فيها النفثة */
        onBurst: () => {
          const el = flaconRef.current;
          if (!el) return;
          el.dataset.spray = "1";
          window.setTimeout(() => {
            if (flaconRef.current) delete flaconRef.current.dataset.spray;
          }, 520);
        },
      });
      if (!handle) return;
      atmoRef.current = handle;
      measure();
      io = new IntersectionObserver(([e]) => handle.setPaused(!e.isIntersecting), {
        threshold: 0,
      });
      io.observe(section);
    });

    /* التمرير: انزياح الطبقات بسرعات مختلفة = عمق حقيقي لا صورة مسطحة */
    let queued = false;
    const write = () => {
      queued = false;
      const rect = section.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
      section.style.setProperty("--sp", p.toFixed(4));
      atmoRef.current?.setProgress(p);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(write);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(section);

    /* إشعال المشهد بعد تسليم افتتاحية العلامة، فتتصل الحركتان بلا قطع */
    const ignite = () => {
      setLit(true);
      atmoRef.current?.burst();
    };
    let introObserver: MutationObserver | null = null;
    if (document.documentElement.dataset.falconIntro === "visible") {
      introObserver = new MutationObserver(() => {
        if (document.documentElement.dataset.falconIntro !== "visible") {
          introObserver?.disconnect();
          introObserver = null;
          ignite();
        }
      });
      introObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-falcon-intro"],
      });
    } else {
      ignite();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      introObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      atmoRef.current?.dispose();
      atmoRef.current = null;
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.sanctum} data-lit={lit}>
      {/* عمق الغرفة: عتمة + وهج قرمزي خلفي + بركة ضوء دافئة */}
      <div className={styles.chamber} aria-hidden="true" />
      <div className={styles.chamberGrade} aria-hidden="true" />
      <div className={styles.bloom} aria-hidden="true" />

      {/* الشخص خلف الفلاكون — يُعاد إضاءته في المتصفح ليطابق عتمة المشهد */}
      <div className={styles.figure} aria-hidden="true">
        <img
          src="/images/falcon-figure-crop.webp"
          alt=""
          decoding="async"
          onError={(e) => {
            (e.currentTarget.closest("div") as HTMLElement).style.display = "none";
          }}
        />
        <span className={styles.figureShade} />
        <span className={styles.figureKey} />
      </div>

      {/* الفلاكون: البطل. يطفو، ينضغط مع كل رشّة، ويمرّ على زجاجه بريق */}
      <div ref={flaconRef} className={styles.flacon} aria-hidden="true">
        <span className={styles.flaconReflection} />
        <div className={styles.flaconBody}>
          <img
            src="/images/falcon-flacon.webp"
            alt=""
            decoding="async"
            onError={(e) => {
              const host = e.currentTarget.closest(`.${styles.flacon}`) as HTMLElement | null;
              if (host) host.style.display = "none";
            }}
          />
          {/* بريق زجاجي مقنّع بشكل الزجاجة نفسها فلا يتسرّب إلى الهواء */}
          <span className={styles.flaconSheen} />
        </div>
        <span className={styles.flaconGlow} />
      </div>

      {/* الرذاذ والدخان — فوق الطبقتين لأنه يمر أمام الزجاجة وعلى وجه الشخص */}
      <canvas ref={canvasRef} className={styles.atmosphere} aria-hidden="true" />

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

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
