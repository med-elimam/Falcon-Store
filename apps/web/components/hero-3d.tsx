"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroSceneHandle } from "./hero-3d-scene";

/* يُحمَّل three.js كسولاً وفقط عندما يدعم الجهاز WebGL ولا يفضّل تقليل الحركة؛
   الصورة الأصلية تبقى تحته كبديل دائم. */
export function Hero3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  /* عند تبديل الثيم (فاتح/داكن) يُعاد بناء المشهد بألوان الثيم الجديد */
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "data-theme")) {
        setThemeKey((k) => k + 1);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* مع «تقليل الحركة» نعرض إطاراً ثابتاً بدل إلغاء المشهد — الزجاجة تظهر للجميع */
    const staticMode = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;

    let handle: HeroSceneHandle | null = null;
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let inView = true;
    let pageVisible = document.visibilityState === "visible";
    const sync = () => handle?.setPaused(!(inView && pageVisible));
    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      sync();
    };

    import("./hero-3d-scene").then(({ createHeroScene }) => {
      if (disposed) return;
      handle = createHeroScene(el, () => setReady(true), { staticMode });
      io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        sync();
      });
      io.observe(el);
      document.addEventListener("visibilitychange", onVisibility);
      sync();
    });

    return () => {
      disposed = true;
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      handle?.dispose();
      handle = null;
    };
  }, [themeKey]);

  /* كل الأنماط inline حتى لا يعتمد العرض على تحميل CSS — يمنع حلقة تضخم القياس */
  return (
    <div
      ref={ref}
      className="hero-3d"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity: ready ? 1 : 0,
        transition: "opacity 1.4s ease",
      }}
      aria-hidden="true"
    />
  );
}
