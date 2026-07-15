"use client";

import { useState } from "react";
import { EmptyBlock, ErrorBlock, LoadingBlock, useAdminData } from "@/components/manage/ui";

interface AuditRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
}

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<{ logs: AuditRow[]; total: number; perPage: number }>(
    `/api/v1/admin/audit?page=${page}&perPage=40${q ? `&q=${encodeURIComponent(q)}` : ""}`
  );

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الأمان</span>
          <h1>سجل التدقيق {data ? `(${data.total})` : ""}</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>كل الأحداث الحساسة</h2>
            <p>دخول، تعديلات أسعار ومخزون، حالات طلبات، صلاحيات — بلا أسرار مخزنة.</p>
          </div>
          <input
            className="field"
            placeholder="تصفية بالإجراء (مثال: price_changed)"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {loading ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />
        ) : data.logs.length === 0 ? (
          <EmptyBlock title="لا توجد أحداث مطابقة" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المنفّذ</th>
                  <th>الإجراء</th>
                  <th>العنصر</th>
                  <th>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="num">{new Date(l.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}</td>
                    <td>{l.actorName ?? "زائر/نظام"}</td>
                    <td className="num" dir="ltr" style={{ textAlign: "left" }}>
                      {l.action}
                    </td>
                    <td className="num" dir="ltr" style={{ textAlign: "left" }}>
                      {l.entity ? `${l.entity}${l.entityId ? `#${l.entityId.slice(0, 8)}` : ""}` : "—"}
                    </td>
                    <td className="num" dir="ltr" style={{ textAlign: "left", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.meta ? JSON.stringify(l.meta) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > data.perPage && (
          <div className="manage-form-foot" style={{ padding: 16 }}>
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              الأحدث
            </button>
            <button className="btn btn-ghost" disabled={page * data.perPage >= data.total} onClick={() => setPage((p) => p + 1)}>
              الأقدم
            </button>
          </div>
        )}
      </section>
    </>
  );
}
