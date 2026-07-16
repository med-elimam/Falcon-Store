"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { PublicSettingsDTO } from "@falcon/shared";

/** إعدادات عامة null = واجهة API غير متاحة مؤقتًا؛ الواجهة تتصرف بهدوء. */
const SettingsContext = createContext<PublicSettingsDTO | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: PublicSettingsDTO | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [current, setCurrent] = useState(value);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/public/settings?fresh=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json", "cache-control": "no-cache" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { settings?: PublicSettingsDTO };
      if (payload.settings) setCurrent(payload.settings);
    } catch {
      /* Keep the last usable settings while the network is temporarily unavailable. */
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return <SettingsContext.Provider value={current}>{children}</SettingsContext.Provider>;
}

export function usePublicSettings(): PublicSettingsDTO | null {
  return useContext(SettingsContext);
}
