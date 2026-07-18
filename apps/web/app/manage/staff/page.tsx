"use client";

import { useState } from "react";
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from "@falcon/shared";
import { api, ApiError } from "@/lib/client-api";
import {
  Chip,
  DrawerForm,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
  ConfirmButton,
} from "@/components/manage/ui";

interface StaffRow {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  totpEnabled: boolean;
  mustChangePassword: boolean;
  roleKey: RoleKey | null;
  createdAt: string;
}

export default function StaffPage() {
  const { data, error, loading, reload } = useAdminData<{ staff: StaffRow[] }>("/api/v1/admin/staff");
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", role: "order_staff" as RoleKey, tempPassword: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetFor, setResetFor] = useState<StaffRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الأمان</span>
          <h1>الموظفون والصلاحيات</h1>
        </div>
        <button className="btn btn-crimson" onClick={() => setCreating(true)}>
          حساب موظف جديد
        </button>
      </header>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>الحسابات ({data.staff.length})</h2>
            <p>كل حساب جديد يُلزم بتغيير كلمته المؤقتة عند أول دخول.</p>
          </div>
        </div>
        {data.staff.length === 0 ? (
          <EmptyBlock title="لا توجد حسابات" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>2FA</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((u) => (
                  <tr key={u.id}>
                    <td>{u.displayName}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>
                      {u.email}
                    </td>
                    <td>{u.roleKey ? ROLE_LABELS[u.roleKey] : "—"}</td>
                    <td>{u.isActive ? <Chip tone="good">نشط</Chip> : <Chip tone="bad">معطّل</Chip>}</td>
                    <td>{u.totpEnabled ? <Chip tone="good">مفعّل</Chip> : <Chip>غير مفعّل</Chip>}</td>
                    <td>
                      {u.roleKey === "owner" ? (
                        <Chip tone="info">حساب المالك</Chip>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <select
                            className="field"
                            style={{ minHeight: 38, width: 150 }}
                            value={u.roleKey ?? "order_staff"}
                            onChange={async (e) => {
                              try {
                                await api(`/api/v1/admin/staff/${u.id}`, { method: "PATCH", body: { role: e.target.value } });
                                toast.push("حُدّث الدور.");
                                reload();
                              } catch (err) {
                                toast.push(err instanceof ApiError ? err.message : "تعذر التحديث.", "error");
                              }
                            }}
                          >
                            {ROLE_KEYS.filter((r) => r !== "owner").map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          {u.isActive ? (
                            <ConfirmButton
                              label="تعطيل"
                              confirmLabel="تأكيد تعطيل الحساب؟"
                              className="btn btn-ghost"
                              onConfirm={async () => {
                                try {
                                  await api(`/api/v1/admin/staff/${u.id}`, { method: "PATCH", body: { isActive: false } });
                                  toast.push("عُطّل الحساب وأُنهيت جلساته.");
                                  reload();
                                } catch (err) {
                                  toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                                }
                              }}
                            />
                          ) : (
                            <button
                              className="btn btn-ghost"
                              onClick={async () => {
                                try {
                                  await api(`/api/v1/admin/staff/${u.id}`, { method: "PATCH", body: { isActive: true } });
                                  toast.push("أُعيد تفعيل الحساب.");
                                  reload();
                                } catch (err) {
                                  toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                                }
                              }}
                            >
                              تفعيل
                            </button>
                          )}
                          <button
                            className="btn btn-ghost"
                            onClick={() => {
                              setResetFor(u);
                              setResetPassword("");
                            }}
                          >
                            إعادة تعيين كلمة المرور
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <DrawerForm title="حساب موظف جديد" onClose={() => setCreating(false)}>
          <div className="manage-form">
            <div className="row">
              <label>
                الاسم
                <input className="field" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </label>
              <label>
                البريد الإلكتروني
                <input className="field" dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                الدور
                <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleKey })}>
                  {ROLE_KEYS.filter((r) => r !== "owner").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              كلمة مرور مؤقتة (12 محرفًا على الأقل — سيُطلب تغييرها عند أول دخول)
              <input className="field" dir="ltr" type="text" value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
            </label>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="manage-form-foot">
              <button
                className="btn btn-crimson"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setFormError("");
                  try {
                    await api("/api/v1/admin/staff", { method: "POST", body: form });
                    toast.push("أُنشئ الحساب. سلّم كلمة المرور المؤقتة للموظف بأمان.");
                    setCreating(false);
                    setForm({ email: "", displayName: "", role: "order_staff", tempPassword: "" });
                    reload();
                  } catch (err) {
                    setFormError(err instanceof ApiError ? err.message : "تعذر إنشاء الحساب.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                إنشاء الحساب
              </button>
              <button className="text-button" onClick={() => setCreating(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </DrawerForm>
      )}

      {resetFor && (
        <DrawerForm title={`إعادة تعيين كلمة مرور: ${resetFor.displayName}`} onClose={() => setResetFor(null)}>
          <div className="manage-form">
            <label>
              كلمة مرور مؤقتة جديدة (12 محرفًا على الأقل)
              <input className="field" dir="ltr" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            </label>
            <p style={{ color: "var(--silver)", fontSize: ".78rem" }}>ستُنهى كل جلسات الموظف الحالية وسيُلزم بتغيير الكلمة عند أول دخول.</p>
            <div className="manage-form-foot">
              <ConfirmButton
                label="إعادة تعيين الكلمة"
                confirmLabel="تأكيد التغيير؟"
                className="btn btn-crimson"
                disabled={busy || resetPassword.length < 12}
                onConfirm={async () => {
                  setBusy(true);
                  try {
                    await api("/api/v1/admin/staff/reset-password", {
                      method: "POST",
                      body: { userId: resetFor.id, tempPassword: resetPassword },
                    });
                    toast.push("أُعيد تعيين كلمة المرور.");
                    setResetFor(null);
                    reload();
                  } catch (err) {
                    toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <button className="text-button" onClick={() => setResetFor(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </DrawerForm>
      )}
    </>
  );
}
