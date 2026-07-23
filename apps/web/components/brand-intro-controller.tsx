"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  HOME_INTRO_CANCEL_EVENT,
  HOME_INTRO_REQUEST_EVENT,
  type HomeIntroRequestDetail,
  requestHomeIntro,
} from "./brand-intro-events";

const MIN_VISIBLE_MS = 1600;
const EXIT_MS = 560;
const EXIT_REDUCED_MS = 180;
const HARD_TIMEOUT_MS = 15000;
const SKIP_EVENT = "falcon:intro:skip";

declare global {
  interface Window {
    __falconIntroStartedAt?: number;
    __falconIntroSkipRequested?: boolean;
    __falconIntroBootTimer?: number;
    __falconIntroBootCleanup?: () => void;
    __falconIntroRootObserver?: MutationObserver;
    __falconIntroHtmlOverflow?: string;
    __falconIntroScrollRestoration?: ScrollRestoration;
  }
}

function hideCoverBeforePaint(state: "off" | "done" = "off") {
  const root = document.getElementById("falcon-intro");
  document.documentElement.dataset.falconIntro = state;
  if (!root) return;
  root.style.setProperty("display", "none", "important");
  root.style.opacity = "0";
  root.style.visibility = "hidden";
  root.style.pointerEvents = "none";
}

function sameOriginHomeUrl(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const element = event.target instanceof Element ? event.target : null;
  const anchor = element?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return null;

  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.pathname !== "/") return null;
  if (location.pathname === "/") return null;
  return url;
}

export function BrandIntroController() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname === "/") {
      const state = document.documentElement.dataset.falconIntro;
      if (state !== "active" && state !== "leaving") {
        requestHomeIntro(location.href);
      }
      return;
    }

    hideCoverBeforePaint("off");
    window.dispatchEvent(new Event(HOME_INTRO_CANCEL_EVENT));
  }, [pathname]);

  useEffect(() => {
    const root = document.getElementById("falcon-intro");
    if (!root) return;

    const html = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let generation = 0;
    let ready = false;
    let skipRequested = false;
    let startedAt = performance.now();
    let minTimer = 0;
    let hardTimer = 0;
    let fallbackExitTimer = 0;
    let heroObserver: MutationObserver | null = null;
    let poster: HTMLImageElement | null = null;
    let exitAnimation: Animation | null = null;
    let scrollLocked = false;
    let htmlOverflow = "";
    let bodyOverflow = "";
    let previousScrollRestoration: ScrollRestoration = "auto";
    let targetHash = "";
    const skipEvents = ["pointerdown", "keydown", "wheel", "touchmove"] as const;

    const clearPosterListeners = () => {
      poster?.removeEventListener("load", onPosterSettled);
      poster?.removeEventListener("error", onPosterSettled);
      poster = null;
    };

    const clearCycleWork = () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(hardTimer);
      window.clearTimeout(fallbackExitTimer);
      heroObserver?.disconnect();
      heroObserver = null;
      clearPosterListeners();
      exitAnimation?.cancel();
      exitAnimation = null;
      for (const eventName of skipEvents) {
        window.removeEventListener(eventName, onSkip, true);
      }
    };

    const lockScroll = () => {
      if (scrollLocked) return;
      scrollLocked = true;
      htmlOverflow = window.__falconIntroHtmlOverflow ?? html.style.overflow;
      bodyOverflow = document.body.style.overflow;
      previousScrollRestoration =
        window.__falconIntroScrollRestoration ?? history.scrollRestoration;
      history.scrollRestoration = "manual";
      html.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };

    const unlockScroll = () => {
      if (!scrollLocked) return;
      scrollLocked = false;
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      history.scrollRestoration = previousScrollRestoration;
      delete window.__falconIntroHtmlOverflow;
      delete window.__falconIntroScrollRestoration;
    };

    const alignHomeScroll = () => {
      const hash = targetHash || location.hash;
      if (hash) {
        const id = decodeURIComponent(hash.slice(1));
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    const completeExit = (cycle: number) => {
      if (cycle !== generation) return;
      root.style.setProperty("display", "none", "important");
      root.style.opacity = "0";
      root.style.visibility = "hidden";
      root.style.pointerEvents = "none";
      html.dataset.falconIntro = "done";
      clearCycleWork();
      unlockScroll();
    };

    const beginExit = (cycle: number, forced = false) => {
      if (cycle !== generation || html.dataset.falconIntro !== "active") return;
      if (!ready && !forced) return;

      window.clearTimeout(minTimer);
      heroObserver?.disconnect();
      heroObserver = null;
      clearPosterListeners();
      alignHomeScroll();
      html.dataset.falconIntro = "leaving";

      const duration = reducedMotion.matches ? EXIT_REDUCED_MS : EXIT_MS;
      if (typeof root.animate === "function") {
        exitAnimation = root.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
        );
        exitAnimation.addEventListener(
          "finish",
          () => completeExit(cycle),
          { once: true }
        );
        exitAnimation.addEventListener(
          "cancel",
          () => {
            exitAnimation = null;
          },
          { once: true }
        );
      } else {
        root.style.transition = `opacity ${duration}ms cubic-bezier(.4,0,.2,1)`;
        root.style.opacity = "0";
        fallbackExitTimer = window.setTimeout(() => completeExit(cycle), duration);
      }
    };

    const scheduleExit = (cycle: number) => {
      if (cycle !== generation || !ready) return;
      const remaining = skipRequested
        ? 0
        : Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      window.clearTimeout(minTimer);
      minTimer = window.setTimeout(() => beginExit(cycle), remaining);
    };

    const markReady = (cycle: number) => {
      if (cycle !== generation || ready) return;
      ready = true;
      scheduleExit(cycle);
    };

    function onPosterSettled() {
      const cycle = generation;
      const currentPoster = poster;
      clearPosterListeners();
      if (!currentPoster || currentPoster.naturalWidth === 0) {
        markReady(cycle);
        return;
      }
      void currentPoster
        .decode()
        .catch(() => undefined)
        .then(() => markReady(cycle));
    }

    const findReadyHero = (cycle: number) => {
      if (cycle !== generation || ready) return;
      const hero = document.querySelector<HTMLElement>("[data-falcon-hero]");
      const image = hero?.querySelector<HTMLImageElement>(
        "[data-falcon-hero-poster]"
      );
      if (!hero || !image) return;

      heroObserver?.disconnect();
      heroObserver = null;
      clearPosterListeners();
      poster = image;
      if (image.complete) {
        onPosterSettled();
      } else {
        image.addEventListener("load", onPosterSettled, { once: true });
        image.addEventListener("error", onPosterSettled, { once: true });
      }
    };

    function onSkip() {
      window.__falconIntroSkipRequested = true;
      skipRequested = true;
      if (ready) scheduleExit(generation);
    }

    const restartArtwork = () => {
      for (const animation of root.getAnimations({ subtree: true })) {
        animation.cancel();
        animation.play();
      }
    };

    const startCycle = (target: string, preserveBootCycle = false) => {
      generation += 1;
      const cycle = generation;
      clearCycleWork();
      ready = false;
      skipRequested = window.__falconIntroSkipRequested === true;
      window.__falconIntroSkipRequested = false;
      startedAt =
        preserveBootCycle && typeof window.__falconIntroStartedAt === "number"
          ? window.__falconIntroStartedAt
          : performance.now();
      targetHash = new URL(target, location.href).hash;

      root.style.setProperty("display", "grid", "important");
      root.style.opacity = "1";
      root.style.visibility = "visible";
      root.style.pointerEvents = "auto";
      root.style.removeProperty("transition");
      html.dataset.falconIntro = "active";
      lockScroll();
      if (!targetHash) window.scrollTo(0, 0);

      if (!preserveBootCycle) restartArtwork();
      for (const eventName of skipEvents) {
        window.addEventListener(eventName, onSkip, {
          capture: true,
          passive: true,
        });
      }

      heroObserver = new MutationObserver(() => findReadyHero(cycle));
      heroObserver.observe(document.body, { childList: true, subtree: true });
      findReadyHero(cycle);
      hardTimer = window.setTimeout(
        () => beginExit(cycle, true),
        HARD_TIMEOUT_MS
      );
    };

    const cancelCycle = () => {
      generation += 1;
      clearCycleWork();
      hideCoverBeforePaint("off");
      unlockScroll();
    };

    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<HomeIntroRequestDetail>).detail;
      startCycle(detail?.target || "/", false);
    };
    const onHomeClick = (event: MouseEvent) => {
      const url = sameOriginHomeUrl(event);
      if (url) startCycle(url.href, false);
    };
    const onPopState = () => {
      if (location.pathname === "/") startCycle(location.href, false);
      else cancelCycle();
    };
    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted && location.pathname === "/") {
        root.style.setProperty("display", "grid", "important");
        root.style.opacity = "1";
        root.style.visibility = "visible";
        root.style.pointerEvents = "auto";
        html.dataset.falconIntro = "active";
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (location.pathname === "/") startCycle(location.href, false);
      else cancelCycle();
    };

    window.__falconIntroBootCleanup?.();
    window.__falconIntroRootObserver?.disconnect();
    window.clearTimeout(window.__falconIntroBootTimer);
    window.addEventListener(HOME_INTRO_REQUEST_EVENT, onRequest);
    window.addEventListener(HOME_INTRO_CANCEL_EVENT, cancelCycle);
    window.addEventListener(SKIP_EVENT, onSkip);
    window.addEventListener("click", onHomeClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    if (location.pathname === "/") {
      startCycle(
        location.href,
        html.dataset.falconIntro === "active" &&
          typeof window.__falconIntroStartedAt === "number"
      );
    } else {
      cancelCycle();
    }

    return () => {
      clearCycleWork();
      unlockScroll();
      window.removeEventListener(HOME_INTRO_REQUEST_EVENT, onRequest);
      window.removeEventListener(HOME_INTRO_CANCEL_EVENT, cancelCycle);
      window.removeEventListener(SKIP_EVENT, onSkip);
      window.removeEventListener("click", onHomeClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
