"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { FalconMark } from "./icons";

/** نموذج دخول الإدارة — يُستخدم داخل نافذة الموقع وداخل بوابة /manage. */
export function LoginForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel?: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/v1/auth/login", {
        method: "POST",
        body: { identifier, password, ...(needsTotp && totp ? { totp } : {}) },
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.code === "totp_required") {
        setNeedsTotp(true);
        setError("");
      } else {
        setError(err instanceof ApiError ? err.message : "تعذر تسجيل الدخول. أعد المحاولة.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-panel" onSubmit={submit}>
      <div className="login-mark">
        <FalconMark />
      </div>
      <h2>دخول الإدارة</h2>
      <p>هذه المنطقة مخصصة لفريق فالكون ستور.</p>
      <label>
        البريد الإلكتروني
        <input
          className="field"
          type="email"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          dir="ltr"
        />
      </label>
      <label>
        كلمة المرور
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
        />
      </label>
      {needsTotp && (
        <label>
          رمز التحقق (تطبيق المصادقة)
          <input
            className="field num"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
            dir="ltr"
          />
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-crimson btn-block" disabled={loading}>
        {loading ? "جارٍ التحقق…" : "تسجيل الدخول"}
      </button>
      {onCancel && (
        <button type="button" className="text-button" onClick={onCancel}>
          إغلاق
        </button>
      )}
    </form>
  );
}
