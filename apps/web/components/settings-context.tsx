"use client";

import { createContext, useContext, type ReactNode } from "react";
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
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function usePublicSettings(): PublicSettingsDTO | null {
  return useContext(SettingsContext);
}
