import { formatMoneyMRU, type CurrencyDisplay } from "@falcon/shared";

/** تنسيق الأسعار حسب إعداد العرض الذي يحدده صاحب المتجر (MRU افتراضيًا). */
export function formatMRU(price: number, display: CurrencyDisplay = "mru"): string {
  return formatMoneyMRU(price, { display });
}

export function waLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
