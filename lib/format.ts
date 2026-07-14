/** تنسيق الأسعار — الأوقية الجديدة MRU فقط (قرار صاحب المتجر). */
export function formatMRU(price: number | null): string {
  if (price === null) return "السعر عبر واتساب";
  return `${price.toLocaleString("en-US")} MRU`;
}

export function orderNumber(seq: number): string {
  return `FLC-${1000 + seq}`;
}
