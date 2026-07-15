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

interface Brand {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
}

export default function BrandsPage() {
  const { data, error, loading, reload } = useAdminData<{ brands: Brand[] }>("/api/v1/admin/brands");
  const toast = useToast();
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>العلامات التجارية</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>إضافة علامة</h2>
          </div>
          <div className="head-actions">
            <input className="field" placeholder="الاسم اللاتيني" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="field" placeholder="الاسم العربي (اختياري)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            <button
              className="btn btn-crimson"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/v1/admin/brands", {
                    method: "POST",
                    body: { name: name.trim(), nameAr: nameAr.trim() || null, slug: slugify(name) },
                  });
                  setName("");
                  setNameAr("");
                  toast.push("أُضيفت العلامة.");
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
        {data.brands.length === 0 ? (
          <EmptyBlock title="لا توجد علامات بعد" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الاسم العربي</th>
                  <th>المعرّف</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.brands.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.nameAr ?? "—"}</td>
                    <td className="num">{b.slug}</td>
                    <td>
                      <ConfirmButton
                        label="حذف"
                        confirmLabel="تأكيد الحذف"
                        onConfirm={async () => {
                          try {
                            await api(`/api/v1/admin/brands/${b.id}`, { method: "DELETE" });
                            toast.push("حُذفت العلامة.");
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
