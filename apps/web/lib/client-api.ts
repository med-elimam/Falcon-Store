"use client";

/** عميل موحّد لواجهة Railway API من المتصفح — كوكيز الجلسة + مهلة + أخطاء مفهومة. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiError(0, "offline", "لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.");
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        "x-falcon-csrf": "1",
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(0, "timeout", "الخادم يتأخر في الرد. أعد المحاولة بعد قليل.");
    }
    throw new ApiError(0, "network", "تعذر الوصول إلى الخادم. تحقق من اتصالك وأعد المحاولة.");
  }
  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!res.ok) {
    const errObj = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? "request_failed",
      errObj?.message ?? "تعذر تنفيذ الطلب. أعد المحاولة.",
      errObj?.details
    );
  }
  return payload as T;
}

export async function uploadMedia(file: File): Promise<{ asset: { id: string; url: string } }> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/admin/media`, {
      method: "POST",
      credentials: "include",
      headers: { "x-falcon-csrf": "1" },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(0, "network", "تعذر رفع الصورة. تحقق من اتصالك.");
  }
  const payload = (await res.json().catch(() => null)) as
    | { asset?: { id: string; url: string }; error?: { message?: string } }
    | null;
  if (!res.ok || !payload?.asset) {
    throw new ApiError(res.status, "upload_failed", payload?.error?.message ?? "فشل رفع الصورة. جرّب ملفًا آخر.");
  }
  return { asset: payload.asset };
}

export function apiMediaSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/media/") ? `${API_URL}${url}` : url;
}
