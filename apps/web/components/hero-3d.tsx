"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroSceneHandle } from "./hero-3d-scene";

/* يُحمَّل three.js كسولاً عندما يدعم الجهاز WebGL؛ الخلفية اللونية المتجانسة
   تبقى تحته كبديل خفيف من دون صورة تنافس المشهد. */
export function Hero3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  /* يُعاد بناء المشهد عند تبديل الثيم (فاتح/داكن) أو عند تغيير لون العلامة،
     فيلتقط الألوان الجديدة فورًا بلا تنافر ولا مربعات */
  useEffect(() => {
    const root = document.documentElement;
    const readKey = () =>
      `${root.dataset.theme ?? ""}|${getComputedStyle(root).getPropertyValue("--brand-accent").trim()}`;
    let lastKey = readKey();
    const observer = new MutationObserver(() => {
      const key = readKey();
      if (key !== lastKey) {
        lastKey = key;
        setThemeKey((k) => k + 1);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* مع «تقليل الحركة» نعرض المشهد ثابتاً، أما توفير البيانات والاتصالات البطيئة
       فتستخدم الخلفية اللونية الخفيفة بلا تحميل three.js. */
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldUseLightweightBackdrop =
      connection?.saveData === true ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g";
    if (shouldUseLightweightBackdrop) return;
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
      handle = createHeroScene(el, () => setReady(true), { staticMode: prefersReducedMotion });
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
