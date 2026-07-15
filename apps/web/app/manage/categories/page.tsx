"use client";

import { useState } from "react";
import { slugify } from "@falcon/shared";
import { api, ApiError } from "@/lib/client-api";
import {
  ConfirmButton,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameFr: string | null;
  sortOrder: number;
}

export default function CategoriesPage() {
  const { data, error, loading, reload } = useAdminData<{ categories: Category[] }>("/api/v1/admin/categories");
  const toast = useToast();
  const [nameAr, setNameAr] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>التصنيفات</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>إضافة تصنيف</h2>
          </div>
          <div className="head-actions">
            <input className="field" placeholder="الاسم العربي" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            <input className="field" placeholder="الاسم الفرنسي (اختياري)" dir="ltr" value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
            <button
              className="btn btn-crimson"
              disabled={busy || !nameAr.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/v1/admin/categories", {
                    method: "POST",
                    body: {
                      nameAr: nameAr.trim(),
                      nameFr: nameFr.trim() || null,
                      slug: slugify(nameFr.trim() || nameAr.trim()) || `cat-${Date.now()}`,
                      sortOrder: data.categories.length,
                    },
                  });
                  setNameAr("");
                  setNameFr("");
                  toast.push("أُضيف التصنيف.");
                  reload();
                } catch (err) {
                  toast.push(err instanceof ApiError ? err.message : "تعذرت الإضافة.", "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              إضافة
            </button>
          </div>
        </div>
        {data.categories.length === 0 ? (
          <EmptyBlock title="لا توجد تصنيفات بعد" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الاسم العربي</th>
                  <th>الاسم الفرنسي</th>
                  <th>المعرّف</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nameAr}</td>
                    <td>{c.nameFr ?? "—"}</td>
                    <td className="num">{c.slug}</td>
                    <td>
                      <ConfirmButton
                        label="حذف"
                        confirmLabel="تأكيد الحذف"
                        onConfirm={async () => {
                          try {
                            await api(`/api/v1/admin/categories/${c.id}`, { method: "DELETE" });
                            toast.push("حُذف التصنيف.");
                            reload();
                          } catch (err) {
                            toast.push(err instanceof ApiError ? err.message : "تعذر الحذف.", "error");
                          }
                        }}
                      />
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
