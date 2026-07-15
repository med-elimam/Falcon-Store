"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { Chip, ErrorBlock, LoadingBlock, useAdminData, useMe, useToast } from "@/components/manage/ui";

interface SessionRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export default function SecurityPage() {
  const { user, refresh } = useMe();
  const sessions = useAdminData<{ sessions: SessionRow[]; currentId: string }>("/api/v1/auth/sessions");
  const toast = useToast();

  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpError, setTotpError] = useState("");

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الأمان</span>
          <h1>أمان الحساب</h1>
        </div>
        <div className="manage-user">
          <b>{user?.displayName}</b>
          <span dir="ltr">{user?.email}</span>
        </div>
      </header>

      <section className="manage-card" style={{ marginBottom: 14 }}>
        <div className="manage-card-head">
          <div>
            <h2>تغيير كلمة المرور</h2>
            <p>تغيير الكلمة يُنهي كل الجلسات الأخرى فورًا ويبقي جلستك الحالية بعد تدويرها.</p>
          </div>
        </div>
        <div className="manage-form">
          <div className="row">
            <label>
              كلمة المرور الحالية
              <input className="field" dir="ltr" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </label>
            <label>
              الكلمة الجديدة (12 محرفًا على الأقل، بحروف كبيرة وصغيرة وأرقام)
              <input className="field" dir="ltr" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </label>
          </div>
          {pwError && (
            <p className="form-error" role="alert">
              {pwError}
            </p>
          )}
          <div className="manage-form-foot">
            <button
              className="btn btn-crimson"
              disabled={pwBusy || !pw.current || pw.next.length < 12}
              onClick={async () => {
                setPwBusy(true);
                setPwError("");
                try {
                  await api("/api/v1/auth/change-password", {
                    method: "POST",
                    body: { currentPassword: pw.current, newPassword: pw.next },
                  });
                  toast.push("غُيّرت كلمة المرور وأُنهيت الجلسات الأخرى.");
                  setPw({ current: "", next: "" });
                  sessions.reload();
                } catch (err) {
                  setPwError(err instanceof ApiError ? err.message : "تعذر التغيير.");
                } finally {
                  setPwBusy(false);
                }
              }}
            >
              تغيير كلمة المرور
            </button>
          </div>
        </div>
      </section>

      <section className="manage-card" style={{ marginBottom: 14 }}>
        <div className="manage-card-head">
          <div>
            <h2>المصادقة الثنائية (TOTP)</h2>
            <p>طبقة حماية إضافية عبر تطبيق مصادقة مثل Google Authenticator أو Aegis.</p>
          </div>
          {user?.totpEnabled ? <Chip tone="good">مفعّلة</Chip> : <Chip>غير مفعّلة</Chip>}
        </div>
        <div className="manage-form">
          {recoveryCodes ? (
            <>
              <b>رموز الاسترداد — تظهر مرة واحدة فقط. احفظها في مكان آمن:</b>
              <div className="recovery-codes">
                {recoveryCodes.map((c) => (
                  <code key={c}>{c}</code>
                ))}
              </div>
              <div className="manage-form-foot">
                <button className="btn btn-crimson" onClick={() => setRecoveryCodes(null)}>
                  حفظتها في مكان آمن
                </button>
              </div>
            </>
          ) : user?.totpEnabled ? (
            <>
              <label style={{ maxWidth: 280 }}>
                لتعطيل المصادقة الثنائية أدخل رمزًا حاليًا
                <input className="field num" dir="ltr" inputMode="numeric" maxLength={6} value={totpCodeInput} onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ""))} />
              </label>
              {totpError && (
                <p className="form-error" role="alert">
                  {totpError}
                </p>
              )}
              <div className="manage-form-foot">
                <button
                  className="btn btn-ghost"
                  disabled={totpBusy || totpCodeInput.length !== 6}
                  onClick={async () => {
                    setTotpBusy(true);
                    setTotpError("");
                    try {
                      await api("/api/v1/auth/totp/disable", { method: "POST", body: { code: totpCodeInput } });
                      toast.push("عُطّلت المصادقة الثنائية.");
                      setTotpCodeInput("");
                      refresh();
                    } catch (err) {
                      setTotpError(err instanceof ApiError ? err.message : "تعذر التعطيل.");
                    } finally {
                      setTotpBusy(false);
                    }
                  }}
                >
                  تعطيل
                </button>
              </div>
            </>
          ) : totpSetup ? (
            <>
              <p>أضف هذا المفتاح إلى تطبيق المصادقة (أو استخدم رابط otpauth):</p>
              <div className="recovery-codes" style={{ gridTemplateColumns: "1fr" }}>
                <code>{totpSetup.secret}</code>
                <code style={{ fontSize: ".68rem" }}>{totpSetup.otpauthUrl}</code>
              </div>
              <label style={{ maxWidth: 280 }}>
                أدخل الرمز الظاهر في التطبيق للتأكيد
                <input className="field num" dir="ltr" inputMode="numeric" maxLength={6} value={totpCodeInput} onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ""))} />
              </label>
              {totpError && (
                <p className="form-error" role="alert">
                  {totpError}
                </p>
              )}
              <div className="manage-form-foot">
                <button
                  className="btn btn-crimson"
                  disabled={totpBusy || totpCodeInput.length !== 6}
                  onClick={async () => {
                    setTotpBusy(true);
                    setTotpError("");
                    try {
                      const res = await api<{ recoveryCodes: string[] }>("/api/v1/auth/totp/enable", {
                        method: "POST",
                        body: { code: totpCodeInput },
                      });
                      setRecoveryCodes(res.recoveryCodes);
                      setTotpSetup(null);
                      setTotpCodeInput("");
                      toast.push("فُعّلت المصادقة الثنائية.");
                      refresh();
                    } catch (err) {
                      setTotpError(err instanceof ApiError ? err.message : "تعذر التفعيل.");
                    } finally {
                      setTotpBusy(false);
                    }
                  }}
                >
                  تأكيد التفعيل
                </button>
                <button className="text-button" onClick={() => setTotpSetup(null)}>
                  إلغاء
                </button>
              </div>
            </>
          ) : (
            <div className="manage-form-foot">
              <button
                className="btn btn-crimson"
                disabled={totpBusy}
                onClick={async () => {
                  setTotpBusy(true);
                  try {
                    const res = await api<{ secret: string; otpauthUrl: string }>("/api/v1/auth/totp/setup", { method: "POST" });
                    setTotpSetup(res);
                  } catch (err) {
                    toast.push(err instanceof ApiError ? err.message : "تعذر البدء.", "error");
                  } finally {
                    setTotpBusy(false);
                  }
                }}
              >
                تفعيل المصادقة الثنائية
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>الأجهزة والجلسات النشطة</h2>
          </div>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await api("/api/v1/auth/logout-all", { method: "POST" });
                refresh();
              } catch (err) {
                toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
              }
            }}
          >
            تسجيل الخروج من كل الأجهزة
          </button>
        </div>
        {sessions.loading ? (
          <LoadingBlock />
        ) : sessions.error || !sessions.data ? (
          <ErrorBlock message={sessions.error ?? "تعذر التحميل"} onRetry={sessions.reload} />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>العنوان</th>
                  <th>آخر استخدام</th>
                  <th>تنتهي</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">
                      {s.userAgent ?? "غير معروف"}
                    </td>
                    <td className="num">{s.ip ?? "—"}</td>
                    <td className="num">{new Date(s.lastUsedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="num">{new Date(s.expiresAt).toLocaleDateString("en-GB")}</td>
                    <td>
                      {s.id === sessions.data!.currentId ? (
                        <Chip tone="info">الجلسة الحالية</Chip>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          onClick={async () => {
                            try {
                              await api(`/api/v1/auth/sessions/${s.id}`, { method: "DELETE" });
                              toast.push("أُنهيت الجلسة.");
                              sessions.reload();
                            } catch (err) {
                              toast.push(err instanceof ApiError ? err.message : "تعذر الإنهاء.", "error");
                            }
                          }}
                        >
                          إنهاء
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
