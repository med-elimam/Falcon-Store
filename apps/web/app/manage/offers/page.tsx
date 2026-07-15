"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import {
  Chip,
  ConfirmButton,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface Section {
  id: string;
  key: string;
  type: string;
  titleAr: string | null;
  bodyAr: string | null;
  enabled: boolean;
  sortOrder: number;
}

/**
 * العروض هنا نصوص حملات حقيقية يكتبها صاحب المتجر وتظهر في الرئيسية —
 * لا خصومات وهمية ولا نسب مئوية مخترعة.
 */
export default function OffersPage() {
  const { data, error, loading, reload } = useAdminData<{ sections: Section[] }>("/api/v1/admin/content");
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  const offers = data.sections.filter((s) => s.type === "offer");

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>العروض</h1>
        </div>
      </header>

      <section className="manage-card" style={{ marginBottom: 14 }}>
        <div className="manage-card-head">
          <div>
            <h2>عرض جديد</h2>
            <p>اكتب نص العرض الفعلي كما تريده أن يظهر للزبائن. لا تُنشر أي أرقام أو خصومات غير حقيقية.</p>
          </div>
        </div>
        <div className="manage-form">
          <label>
            عنوان العرض
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label>
            تفاصيل العرض
            <textarea className="field" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
          </label>
          <div className="manage-form-foot">
            <button
              className="btn btn-crimson"
              disabled={busy || !title.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/v1/admin/content/offer-${Date.now()}`, {
                    method: "PUT",
                    body: { type: "offer", titleAr: title.trim(), bodyAr: body.trim() || null, enabled: false, sortOrder: 50 },
                  });
                  toast.push("حُفظ العرض كمسودة. فعّله ليظهر للزبائن.");
                  setTitle("");
                  setBody("");
                  reload();
                } catch (err) {
                  toast.push(err instanceof ApiError ? err.message : "تعذر الحفظ.", "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              حفظ العرض
            </button>
          </div>
        </div>
      </section>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>العروض الحالية ({offers.length})</h2>
          </div>
        </div>
        {offers.length === 0 ? (
          <EmptyBlock title="لا توجد عروض" hint="أنشئ عرضًا وفعّله ليظهر في الصفحة الرئيسية." />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.titleAr}</strong>
                      {o.bodyAr && <div style={{ color: "var(--silver)", fontSize: ".72rem", maxWidth: 380 }}>{o.bodyAr}</div>}
                    </td>
                    <td>{o.enabled ? <Chip tone="good">ظاهر للزبائن</Chip> : <Chip>مسودة</Chip>}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-ghost"
                          onClick={async () => {
                            try {
                              await api(`/api/v1/admin/content/${o.key}`, {
                                method: "PUT",
                                body: { type: "offer", titleAr: o.titleAr, bodyAr: o.bodyAr, enabled: !o.enabled, sortOrder: o.sortOrder },
                              });
                              toast.push(o.enabled ? "أُخفي العرض." : "فُعّل العرض.");
                              reload();
                            } catch (err) {
                              toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                            }
                          }}
                        >
                          {o.enabled ? "إخفاء" : "تفعيل"}
                        </button>
                        <ConfirmButton
                          label="حذف"
                          confirmLabel="تأكيد الحذف"
                          onConfirm={async () => {
                            try {
                              await api(`/api/v1/admin/content/${o.key}`, { method: "DELETE" });
                              toast.push("حُذف العرض.");
                              reload();
                            } catch (err) {
                              toast.push(err instanceof ApiError ? err.message : "تعذر الحذف.", "error");
                            }
                          }}
                        />
                      </div>
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
