"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import {
  Chip,
  ConfirmButton,
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
  story: "قسم «قصتنا»",
};

/* الأقسام المفردة القابلة للتحرير — تظهر دائمًا حتى لو لم تُنشأ بعد،
   ويُنشئها الحفظ تلقائيًا (upsert بالمفتاح). «قصتنا» تبقى مخفية للزبائن حتى تُكتب وتُفعّل. */
const EDITABLE_KEYS = [
  { key: "hero", sortOrder: 0 },
  { key: "decants", sortOrder: 10 },
  { key: "story", sortOrder: 40 },
] as const;

/* مدير عام لأقسام من نوع واحد (أسئلة شائعة / آراء عملاء): إنشاء + تفعيل + حذف */
function ContentTypeManager({
  type,
  keyPrefix,
  heading,
  hint,
  titleLabel,
  bodyLabel,
  emptyTitle,
  sections,
  sortOrder,
  reload,
}: {
  type: string;
  keyPrefix: string;
  heading: string;
  hint: string;
  titleLabel: string;
  bodyLabel: string;
  emptyTitle: string;
  sections: Section[];
  sortOrder: number;
  reload: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="manage-card" style={{ marginTop: 14 }}>
      <div className="manage-card-head">
        <div>
          <h2>
            {heading} ({sections.length})
          </h2>
          <p>{hint}</p>
        </div>
      </div>
      <div className="manage-form" style={{ marginBottom: sections.length ? 18 : 0 }}>
        <div className="row">
          <label>
            {titleLabel}
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </label>
        </div>
        <label>
          {bodyLabel}
          <textarea className="field" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        </label>
        <div className="manage-form-foot">
          <button
            className="btn btn-crimson"
            disabled={busy || !title.trim() || !body.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/v1/admin/content/${keyPrefix}-${Date.now()}`, {
                  method: "PUT",
                  body: { type, titleAr: title.trim(), bodyAr: body.trim(), enabled: false, sortOrder },
                });
                toast.push("حُفظ كمسودة. فعّله ليظهر للزبائن.");
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
            إضافة
          </button>
        </div>
      </div>
      {sections.length === 0 ? (
        <EmptyBlock title={emptyTitle} />
      ) : (
        <div className="manage-table-wrap">
          <table className="manage-table">
            <thead>
              <tr>
                <th>{titleLabel}</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.titleAr}</strong>
                    {s.bodyAr && (
                      <div style={{ color: "var(--silver)", fontSize: ".72rem", maxWidth: 380 }}>{s.bodyAr}</div>
                    )}
                  </td>
                  <td>{s.enabled ? <Chip tone="good">ظاهر للزبائن</Chip> : <Chip>مسودة</Chip>}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-ghost"
                        onClick={async () => {
                          try {
                            await api(`/api/v1/admin/content/${s.key}`, {
                              method: "PUT",
                              body: {
                                type,
                                titleAr: s.titleAr,
                                bodyAr: s.bodyAr,
                                enabled: !s.enabled,
                                sortOrder: s.sortOrder,
                              },
                            });
                            toast.push(s.enabled ? "أُخفي العنصر." : "أصبح ظاهراً للزبائن.");
                            reload();
                          } catch (err) {
                            toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                          }
                        }}
                      >
                        {s.enabled ? "إخفاء" : "تفعيل"}
                      </button>
                      <ConfirmButton
                        label="حذف"
                        confirmLabel="تأكيد الحذف"
                        onConfirm={async () => {
                          try {
                            await api(`/api/v1/admin/content/${s.key}`, { method: "DELETE" });
                            toast.push("حُذف العنصر.");
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
  );
}

export default function ContentPage() {
  const { data, error, loading, reload } = useAdminData<{ sections: Section[] }>("/api/v1/admin/content");
  const toast = useToast();
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({ titleAr: "", bodyAr: "", titleFr: "", bodyFr: "", enabled: false });
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  /* لكل مفتاح قابل للتحرير: القسم الموجود أو نموذج فارغ يُنشأ عند أول حفظ */
  const editableSections: Section[] = EDITABLE_KEYS.map(({ key, sortOrder }) => {
    const existing = data.sections.find((s) => s.key === key);
    return (
      existing ?? {
        id: `stub-${key}`,
        key,
        type: key === "story" ? "section" : key,
        titleAr: null,
        bodyAr: null,
        titleFr: null,
        bodyFr: null,
        enabled: false,
        sortOrder,
      }
    );
  });

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
        {editableSections.length === 0 ? (
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
                {editableSections.map((s) => (
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

      <ContentTypeManager
        type="faq"
        keyPrefix="faq"
        heading="الأسئلة الشائعة"
        hint="تظهر في الصفحة الرئيسية بقسم «أسئلة شائعة». اكتب السؤال كما يسأله الزبون فعلاً وجواباً صادقاً ومباشراً."
        titleLabel="السؤال"
        bodyLabel="الإجابة"
        emptyTitle="لا توجد أسئلة بعد"
        sections={data.sections.filter((s) => s.type === "faq")}
        sortOrder={60}
        reload={reload}
      />

      <ContentTypeManager
        type="testimonial"
        keyPrefix="testimonial"
        heading="آراء العملاء"
        hint="انقل آراء عملاء حقيقيين فقط (بإذنهم). تظهر في الصفحة الرئيسية بقسم «قالوا عن فالكون»."
        titleLabel="اسم العميل (كما سيظهر)"
        bodyLabel="نص الرأي"
        emptyTitle="لا توجد آراء بعد"
        sections={data.sections.filter((s) => s.type === "testimonial")}
        sortOrder={70}
        reload={reload}
      />

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
                  if (form.enabled && (!form.titleAr.trim() || !form.bodyAr.trim())) {
                    toast.push("القسم المفعّل يجب أن يحتوي على عنوان ومحتوى باللغة العربية.", "error");
                    return;
                  }
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
