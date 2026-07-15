export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const unauthorized = (message = "الرجاء تسجيل الدخول") => new AppError(401, "unauthorized", message);
export const forbidden = (message = "ليست لديك صلاحية لهذا الإجراء") => new AppError(403, "forbidden", message);
export const notFound = (message = "العنصر المطلوب غير موجود") => new AppError(404, "not_found", message);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "bad_request", message, details);
export const conflict = (message: string, details?: unknown) => new AppError(409, "conflict", message, details);
export const tooMany = (message = "محاولات كثيرة. حاول لاحقًا.") => new AppError(429, "rate_limited", message);
