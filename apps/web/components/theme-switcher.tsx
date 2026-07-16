"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "falcon-theme";
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f6f3f4",
  dark: "#0b090a",
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolved;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-falcon-theme]');
  if (meta) meta.content = THEME_COLORS[resolved];
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  const setMode = useCallback((nextMode: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // The theme still applies for this visit when storage is unavailable.
    }
    setModeState(nextMode);
    setResolvedTheme(applyTheme(nextMode));
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private browsing can make localStorage unavailable.
    }
    const initialMode = isThemeMode(saved) ? saved : "system";
    const initialResolvedTheme = applyTheme(initialMode);

    const readyFrame = requestAnimationFrame(() => {
      setModeState(initialMode);
      setResolvedTheme(initialResolvedTheme);
      document.documentElement.dataset.themeReady = "true";
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !isThemeMode(event.newValue)) return;
      setModeState(event.newValue);
      setResolvedTheme(applyTheme(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(readyFrame);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeSwitcher must be used inside ThemeProvider");
  return context;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.2A8.4 8.4 0 0 1 8.8 4 8.6 8.6 0 1 0 20 15.2Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof SunIcon }[] = [
  { mode: "system", label: "تلقائي", icon: SystemIcon },
  { mode: "light", label: "فاتح", icon: SunIcon },
  { mode: "dark", label: "داكن", icon: MoonIcon },
];

export function ThemeSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "panel";
  className?: string;
}) {
  const { mode, resolvedTheme, setMode } = useTheme();
  const resolvedLabel = resolvedTheme === "light" ? "إضاءة فاتحة" : "إضاءة داكنة";

  return (
    <div className={`theme-switcher ${className}`.trim()} data-variant={variant}>
      {variant === "panel" && (
        <div className="theme-switcher-copy">
          <span>مظهر الواجهة</span>
          <small aria-live="polite">{mode === "system" ? `تلقائي · ${resolvedLabel}` : resolvedLabel}</small>
        </div>
      )}
      <div className="theme-options" role="group" aria-label="اختيار مظهر الواجهة">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={active}
              data-active={active || undefined}
              onClick={() => setMode(option.mode)}
              title={option.label}
            >
              <Icon />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
