const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** روابط الوسائط القادمة من API نسبية (/media/…) — تُحوَّل إلى روابط مطلقة للعرض. */
export function mediaSrc(url: string): string {
  return url.startsWith("/media/") ? `${API_URL}${url}` : url;
}
