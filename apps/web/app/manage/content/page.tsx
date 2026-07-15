"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import {
  Chip,
  DrawerForm,
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
  titleFr: string | null;
  bodyFr: string | null;
  enabled: boolean;
  sortOrder: number;
}

const KEY_LABELS: Record<string, string> = {
  hero: "الواجهة الرئيسية (Hero)",
  decants: "قسم تعبئة 10ml",
};

export default function ContentPage() {
  const { data, error, loading, reload } = useAdminData<{ sections: Section[] }>("/api/v1/admin/content");
  const toast = useToast();
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({ titleAr: "", bodyAr: "", titleFr: "", bodyFr: "", enabled: false });
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  const sections = data.sections.filter((s) => s.type !== "offer");

  return (
    <>
      <header className="manage-head">
        <div>
          <span>المتجر</span>
          <h1>محتوى الموقع</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>أقسام الصفحات (عربي + فرنسي)</h2>
            <p>الأقسام المعطلة لا تظهر للزبائن إطلاقًا.</p>
          </div>
        </div>
        {sections.length === 0 ? (
          <EmptyBlock title="لا توجد أقسام محتوى" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>القسم</th>
                  <th>العنوان الحالي</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td>{KEY_LABELS[s.key] ?? s.key}</td>
                    <td>{s.titleAr ?? "—"}</td>
                    <td>{s.enabled ? <Chip tone="good">ظاهر</Chip> : <Chip>معطل</Chip>}</td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditing(s);
                          setForm({
                            titleAr: s.titleAr ?? "",
                            bodyAr: s.bodyAr ?? "",
                            titleFr: s.titleFr ?? "",
                            bodyFr: s.bodyFr ?? "",
                            enabled: s.enabled,
                          });
                        }}
                      >
                        تحرير
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <DrawerForm title={`تحرير: ${KEY_LABELS[editing.key] ?? editing.key}`} onClose={() => setEditing(null)}>
          <div className="manage-form">
            <label>
              العنوان (عربي)
              <input className="field" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} maxLength={200} />
            </label>
            <label>
              النص (عربي)
              <textarea className="field" value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} maxLength={2000} />
            </label>
            <label>
              العنوان (فرنسي)
              <input className="field" dir="ltr" value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} maxLength={200} />
            </label>
            <label>
              النص (فرنسي)
              <textarea className="field" dir="ltr" value={form.bodyFr} onChange={(e) => setForm({ ...form, bodyFr: e.target.value })} maxLength={2000} />
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              ظاهر للزبائن
            </label>
            <div className="manage-form-foot">
              <button
                className="btn btn-crimson"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/v1/admin/content/${editing.key}`, {
                      method: "PUT",
                      body: {
                        type: editing.type,
                        titleAr: form.titleAr.trim() || null,
                        bodyAr: form.bodyAr.trim() || null,
                        titleFr: form.titleFr.trim() || null,
                        bodyFr: form.bodyFr.trim() || null,
                        enabled: form.enabled,
                        sortOrder: editing.sortOrder,
                      },
                    });
                    toast.push("حُفظ المحتوى.");
                    setEditing(null);
                    reload();
                  } catch (err) {
                    toast.push(err instanceof ApiError ? err.message : "تعذر الحفظ.", "error");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                حفظ
              </button>
              <button className="text-button" onClick={() => setEditing(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </DrawerForm>
      )}
    </>
  );
}
