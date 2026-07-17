/**
 * مصدر واحد لتوليد متغيّرات لون العلامة من لون أساسي واحد (hex).
 * تُطبَّق كأنماط سطرية على <html> فتتقدّم على القيم الافتراضية في globals.css
 * في الوضعين الفاتح والداكن معًا، بلا وميض وبلا مشاكل ترتيب.
 * `--brand-accent` يبقى hex خامًا حتى يقرأه مشهد الأنيميشن ثلاثي الأبعاد.
 */
export const DEFAULT_ACCENT = "#9a002e";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function normalizeAccent(value: string | null | undefined): string {
  if (typeof value === "string" && HEX.test(value.trim())) return value.trim().toLowerCase();
  return DEFAULT_ACCENT;
}

export function accentVars(rawAccent: string | null | undefined): Record<string, string> {
  const accent = normalizeAccent(rawAccent);
  return {
    "--crimson": accent,
    "--crimson-hot": `color-mix(in oklch, ${accent}, white 15%)`,
    "--accent-soft": `color-mix(in oklch, ${accent} 14%, transparent)`,
    "--accent-border": `color-mix(in oklch, ${accent} 42%, transparent)`,
    "--brand-accent": accent,
  };
}

export function applyAccent(el: HTMLElement, rawAccent: string | null | undefined): void {
  const vars = accentVars(rawAccent);
  for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
}

/* لوحات جاهزة راقية — كلها مقروءة على الخلفيتين الفاتحة والداكنة */
export const ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: "#9a002e", label: "عنابي (الحالي)" },
  { value: "#c8102e", label: "قرمزي" },
  { value: "#7a1f3d", label: "برغندي" },
  { value: "#a55a1e", label: "نحاسي" },
  { value: "#0b6b45", label: "زمردي" },
  { value: "#0d6a6e", label: "بترولي" },
  { value: "#1e4fa3", label: "أزرق ملكي" },
  { value: "#6a2fa0", label: "أرجواني" },
  { value: "#b0842f", label: "ذهبي" },
  { value: "#3f3f46", label: "فحمي محايد" },
];
