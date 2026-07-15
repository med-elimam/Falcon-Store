"use client";

import { useState } from "react";
import { formatMRU } from "@/lib/format";
import { EmptyBlock, ErrorBlock, LoadingBlock, useAdminData } from "@/components/manage/ui";

interface CustomerRow {
  customer: { id: string; phone: string; name: string | null; createdAt: string };
  orderCount: number;
  totalSpentMru: number;
}

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAdminData<{ customers: CustomerRow[]; total: number }>(
    `/api/v1/admin/customers?perPage=50${q ? `&q=${encodeURIComponent(q)}` : ""}`
  );

  return (
    <>
      <header className="manage-head">
        <div>
          <span>المتابعة</span>
          <h1>العملاء {data ? `(${data.total})` : ""}</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>سجل العملاء</h2>
            <p>يُسجَّل العميل تلقائيًا مع أول طلب.</p>
          </div>
          <input className="field" placeholder="بحث بالاسم أو الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />
        ) : data.customers.length === 0 ? (
          <EmptyBlock title="لا يوجد عملاء بعد" hint="مع أول طلب سيظهر العميل هنا تلقائيًا." />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>عدد الطلبات</th>
                  <th>إجمالي الشراء</th>
                  <th>أول ظهور</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.customer.id}>
                    <td>{c.customer.name ?? "—"}</td>
                    <td className="num">{c.customer.phone}</td>
                    <td className="num">{c.orderCount}</td>
                    <td className="num">{formatMRU(c.totalSpentMru)}</td>
                    <td className="num">{new Date(c.customer.createdAt).toLocaleDateString("en-GB")}</td>
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
