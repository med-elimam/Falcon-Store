"use client";

import { useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@falcon/shared";
import { api, API_URL, ApiError } from "@/lib/client-api";
import { formatMRU } from "@/lib/format";
import {
  Chip,
  DrawerForm,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  area: string;
  paymentMethodLabel: string;
  subtotalMru: number;
  deliveryFeeMru: number | null;
  totalMru: number;
  deliveryNote: string | null;
  status: OrderStatus;
  createdAt: string;
}

interface OrderDetail {
  order: OrderRow;
  items: { id: string; nameAr: string; brandName: string | null; size: string; qty: number; lineTotalMru: number | null }[];
  history: { id: string; fromStatus: string | null; toStatus: OrderStatus; note: string | null; createdAt: string }[];
}

function statusTone(s: OrderStatus): "good" | "warn" | "bad" | "info" {
  if (s === "new") return "info";
  if (s === "completed") return "good";
  if (s === "cancelled") return "bad";
  return "warn";
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const url = `/api/v1/admin/orders?perPage=50${statusFilter !== "all" ? `&status=${statusFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { data, error, loading, reload } = useAdminData<{ orders: OrderRow[]; total: number }>(url);
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useAdminData<OrderDetail>(openId ? `/api/v1/admin/orders/${openId}` : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function setStatus(id: string, status: OrderStatus) {
    setBusy(true);
    try {
      await api(`/api/v1/admin/orders/${id}/status`, { method: "PATCH", body: { status, note: note.trim() || undefined } });
      toast.push(`حُدّثت الحالة إلى «${ORDER_STATUS_LABELS[status]}».`);
      setNote("");
      detail.reload();
      reload();
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "تعذر تحديث الحالة.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="manage-head">
        <div>
          <span>المتابعة</span>
          <h1>الطلبات {data ? `(${data.total})` : ""}</h1>
        </div>
        <a className="btn btn-ghost" href={`${API_URL}/api/v1/admin/orders/export.csv`} target="_blank" rel="noopener noreferrer">
          تصدير CSV
        </a>
      </header>

      <section className="manage-card">
        <div className="manage-card-head">
          <div className="head-actions">
            <select className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}>
              <option value="all">كل الحالات</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <input className="field" placeholder="بحث برقم الطلب أو الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />
        ) : data.orders.length === 0 ? (
          <EmptyBlock title="لا توجد طلبات مطابقة" hint="عند وصول طلبات جديدة ستظهر هنا فورًا." />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>العميل</th>
                  <th>المنطقة</th>
                  <th>الدفع</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="num">{o.orderNumber}</td>
                    <td>
                      {o.customerName}
                      <div className="num" style={{ color: "var(--silver)", fontSize: ".7rem" }}>
                        {o.phone}
                      </div>
                    </td>
                    <td>{o.area}</td>
                    <td>{o.paymentMethodLabel}</td>
                    <td className="num">{formatMRU(o.totalMru)}</td>
                    <td>
                      <Chip tone={statusTone(o.status)}>{ORDER_STATUS_LABELS[o.status]}</Chip>
                    </td>
                    <td className="num">{new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>
                      <button className="btn btn-ghost" onClick={() => setOpenId(o.id)}>
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openId && (
        <DrawerForm title="تفاصيل الطلب" onClose={() => setOpenId(null)}>
          {detail.loading ? (
            <LoadingBlock />
          ) : detail.error || !detail.data ? (
            <ErrorBlock message={detail.error ?? "تعذر التحميل"} onRetry={detail.reload} />
          ) : (
            <div className="manage-form">
              <div className="row">
                <div>
                  <b className="num">{detail.data.order.orderNumber}</b>
                  <div style={{ color: "var(--silver)", fontSize: ".75rem" }}>
                    {detail.data.order.customerName} · <span className="num">{detail.data.order.phone}</span>
                  </div>
                  <div style={{ color: "var(--silver)", fontSize: ".75rem" }}>
                    {detail.data.order.area} · {detail.data.order.paymentMethodLabel}
                  </div>
                  {detail.data.order.deliveryNote && (
                    <div style={{ color: "var(--silver)", fontSize: ".75rem" }}>ملاحظة: {detail.data.order.deliveryNote}</div>
                  )}
                </div>
                <div>
                  <Chip tone={statusTone(detail.data.order.status)}>{ORDER_STATUS_LABELS[detail.data.order.status]}</Chip>
                </div>
              </div>

              <table className="manage-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>الحجم</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.nameAr}
                        {i.brandName && <div style={{ color: "var(--silver)", fontSize: ".68rem" }}>{i.brandName}</div>}
                      </td>
                      <td className="num">{i.size}</td>
                      <td className="num">{i.qty}</td>
                      <td className="num">{i.lineTotalMru !== null ? formatMRU(i.lineTotalMru) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row">
                <div>
                  المنتجات: <b className="num">{formatMRU(detail.data.order.subtotalMru)}</b>
                </div>
                <div>
                  التوصيل:{" "}
                  <b className="num">
                    {detail.data.order.deliveryFeeMru !== null ? formatMRU(detail.data.order.deliveryFeeMru) : "يُحدد عند التأكيد"}
                  </b>
                </div>
                <div>
                  الإجمالي: <b className="num">{formatMRU(detail.data.order.totalMru)}</b>
                </div>
              </div>

              <label>
                ملاحظة على تغيير الحالة (اختياري)
                <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </label>
              <div className="manage-form-foot">
                {ORDER_STATUSES.filter((s) => s !== detail.data!.order.status).map((s) => (
                  <button key={s} className="btn btn-ghost" disabled={busy} onClick={() => setStatus(detail.data!.order.id, s)}>
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              <div>
                <b>سجل الحالة</b>
                {detail.data.history.map((h) => (
                  <div key={h.id} style={{ color: "var(--silver)", fontSize: ".74rem", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                    <span className="num">{new Date(h.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span> —{" "}
                    {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus as OrderStatus]} ← ` : ""}
                    {ORDER_STATUS_LABELS[h.toStatus]}
                    {h.note ? ` (${h.note})` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DrawerForm>
      )}
    </>
  );
}
