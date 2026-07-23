"use client";

import { useEffect, useRef } from "react";
import styles from "./hero.module.css";

/* فيديو البطل: نسخة أفقية للشاشات العريضة وعمودية للهاتف.
   الاختيار يتم عبر media على <source> — استعلام CSS يقيّمه المتصفح نفسه،
   فلا يُحمَّل إلا الملف المطابق للاتجاه الحالي، بلا أي كشف لنوع الجهاز. */
const SRC_MOBILE = "/videos/hero-mobile.mp4";
const SRC_DESKTOP = "/videos/hero-desktop.mp4";
const POSTER_MOBILE = "/videos/hero-mobile-poster.webp";
const POSTER_DESKTOP = "/videos/hero-desktop-poster.webp";

/* الافتتاحية تغطي الشاشة عند أول تحميل؛ ننتظر انتهاءها فيبدأ الفيديو من إطاره
   الأول لحظة انكشاف المشهد. مهلة أمان: لو تعطّل سكربت الافتتاحية نشغّل بعدها. */
const INTRO_SAFETY_MS = 3600;

function introActive() {
  return (
    document.getElementById("falcon-intro") !== null &&
    document.documentElement.dataset.falconIntro === "active"
  );
}

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /* React لا يُخرج سمة muted في HTML القادم من الخادم — تُضبط هنا قبل أي play() */
    video.muted = true;
    video.defaultMuted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    const thinPipe =
      connection?.saveData === true ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";

    let disposed = false;
    let started = false;
    let inView = true;
    let introTimer = 0;
    let introObserver: MutationObserver | null = null;
    const retryEvents = ["pointerdown", "touchend", "keydown"] as const;

    const clearRetry = () => {
      for (const ev of retryEvents) window.removeEventListener(ev, onRetry, true);
    };
    const onRetry = () => {
      clearRetry();
      if (!disposed && started && inView && !reduced.matches) void tryPlay();
    };

    /* iPhone في وضع توفير الطاقة قد يرفض التشغيل التلقائي رغم muted+playsInline:
       نُبقي الملصق ظاهراً ونعيد المحاولة عند أول تفاعل حقيقي من المستخدم. */
    const tryPlay = () =>
      video.play().catch(() => {
        if (disposed) return;
        for (const ev of retryEvents) window.addEventListener(ev, onRetry, { capture: true, passive: true, once: false });
      });

    const markLive = () => {
      video.dataset.live = "1";
    };
    video.addEventListener("playing", markLive);

    const begin = () => {
      if (disposed || started) return;
      started = true;
      if (inView) void tryPlay();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!started || reduced.matches) return;
        if (inView) void tryPlay();
        else video.pause();
      },
      { threshold: 0.12 }
    );
    io.observe(video);

    /* تغيّر تفضيل الحركة أثناء الجلسة يُحترم فوراً في الاتجاهين */
    const onReducedChange = () => {
      if (reduced.matches) video.pause();
      else if (!started) begin();
      else if (inView) void tryPlay();
    };
    reduced.addEventListener("change", onReducedChange);

    const onVisibilityChange = () => {
      if (document.hidden) video.pause();
      else if (started && inView && !reduced.matches) void tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    /* المتصفح يختار <source> مرة واحدة فقط؛ عند تدوير الجهاز نعيد الاختيار
       بأنفسنا كي لا تُعرض اللقطة العمودية مقصوصة على شاشة أفقية أو العكس */
    const orientation = window.matchMedia("(orientation: portrait)");
    const onOrientationChange = () => {
      delete video.dataset.live; /* يعود الملصق المطابق للاتجاه حتى أول إطار جديد */
      video.load();
      if (started && inView && !reduced.matches) void tryPlay();
    };
    orientation.addEventListener("change", onOrientationChange);

    if (!reduced.matches && !thinPipe) {
      /* من preload=metadata في HTML إلى تعبئة كاملة الآن — يمنح الافتتاحية
         مهلتها لملء المخزن المؤقت فيبدأ العرض بلا أي وميض تحميل. */
      video.preload = "auto";
      video.load();

      if (introActive()) {
        introObserver = new MutationObserver(() => {
          if (!introActive()) {
            introObserver?.disconnect();
            introObserver = null;
            begin();
          }
        });
        introObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-falcon-intro"],
        });
        introTimer = window.setTimeout(begin, INTRO_SAFETY_MS);
      } else {
        begin();
      }
    }

    return () => {
      disposed = true;
      window.clearTimeout(introTimer);
      introObserver?.disconnect();
      reduced.removeEventListener("change", onReducedChange);
      orientation.removeEventListener("change", onOrientationChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      video.removeEventListener("playing", markLive);
      clearRetry();
      io.disconnect();
      video.pause();
    };
  }, []);

  return (
    <div className={styles.media} aria-hidden="true">
      {/* الملصق يظهر من أول إطار HTML — نفس الإطار الأول للفيديو تماماً، فلا
          يظهر أي سواد قبل التشغيل، ويبقى مشهداً ثابتاً عند تفضيل تقليل الحركة */}
      {/* إخراج فني حسب الاتجاه عبر <picture> — ما لا يدعمه next/image، لذا <img> مقصودة */}
      <picture className={styles.poster}>
        <source media="(orientation: portrait)" srcSet={POSTER_MOBILE} />
        <img
          src={POSTER_DESKTOP}
          alt=""
          fetchPriority="high"
          decoding="async"
          draggable={false}
          data-falcon-hero-poster=""
        />
      </picture>
      <video
        ref={videoRef}
        className={styles.video}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
      >
        <source src={SRC_MOBILE} media="(orientation: portrait)" type="video/mp4" />
        <source src={SRC_DESKTOP} type="video/mp4" />
      </video>
    </div>
  );
}
