"use client";

import { useState } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@falcon/shared";
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

const ACTION_LABELS: Record<string, string> = {
  "auth.login_success": "تسجيل دخول ناجح",
  "auth.login_failed": "محاولة دخول فاشلة",
  "auth.logout": "تسجيل خروج",
  "auth.logout_all": "تسجيل الخروج من كل الأجهزة",
  "auth.session_revoked": "إغلاق جلسة",
  "auth.password_changed": "تغيير كلمة المرور",
  "auth.totp_enabled": "تفعيل التحقق بخطوتين",
  "auth.totp_disabled": "إيقاف التحقق بخطوتين",
  "auth.recovery_reset": "استعادة الحساب",
  "order.created": "طلب جديد من الموقع",
  "order.status_changed": "تغيير حالة طلب",
  "order.exported": "تنزيل قائمة الطلبات",
  "inventory.stock_changed": "تعديل كمية المخزون",
  "product.created": "إضافة منتج",
  "product.updated": "تعديل منتج",
  "product.deleted": "حذف منتج",
  "product.price_changed": "تغيير سعر",
  "product.variants_updated": "تعديل الأحجام",
  "product.images_updated": "تعديل صور المنتج",
  "media.uploaded": "رفع صورة",
  "media.deleted": "حذف صورة",
  "settings.updated": "تعديل إعدادات المتجر",
  "settings.payment_method_updated": "تعديل طريقة دفع",
  "settings.delivery_zone_created": "إضافة منطقة توصيل",
  "settings.delivery_zone_updated": "تعديل منطقة توصيل",
  "settings.delivery_zone_deleted": "حذف منطقة توصيل",
  "content.section_updated": "تعديل محتوى الموقع",
  "content.section_deleted": "حذف محتوى من الموقع",
  "staff.created": "إضافة موظف",
  "staff.updated": "تعديل موظف",
  "staff.password_reset": "إعادة تعيين كلمة مرور موظف",
  "brand.created": "إضافة علامة تجارية",
  "brand.updated": "تعديل علامة تجارية",
  "brand.deleted": "حذف علامة تجارية",
  "category.created": "إضافة تصنيف",
  "category.updated": "تعديل تصنيف",
  "category.deleted": "حذف تصنيف",
  "setup.step_updated": "تحديث إعداد المتجر",
  "bootstrap.owner_created": "إنشاء حساب المالك",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "حساب",
  session: "جلسة",
  order: "طلب",
  product: "منتج",
  variant: "حجم منتج",
  media: "صورة",
  settings: "إعدادات",
  payment_method: "طريقة دفع",
  delivery_zone: "منطقة توصيل",
  content_section: "محتوى",
  brand: "علامة تجارية",
  category: "تصنيف",
  setup: "إعداد المتجر",
};

function statusLabel(value: unknown): string | null {
  return typeof value === "string" && value in ORDER_STATUS_LABELS
    ? ORDER_STATUS_LABELS[value as OrderStatus]
    : null;
}

function auditDetails(log: AuditRow): string {
  const meta = log.meta;
  if (!meta) return "—";
  const details: string[] = [];
  if (typeof meta.delta === "number") details.push(`التغيير: ${meta.delta > 0 ? "+" : ""}${meta.delta}`);
  if (typeof meta.newStock === "number") details.push(`الكمية الآن: ${meta.newStock}`);
  const from = statusLabel(meta.from);
  const to = statusLabel(meta.to);
  if (from && to) details.push(`${from} ← ${to}`);
  const status = statusLabel(meta.status);
  if (status) details.push(`الحالة: ${status}`);
  if (typeof meta.count === "number") details.push(`العدد: ${meta.count}`);
  if (meta.changes && typeof meta.changes === "object") details.push(`عُدّل سعر ${Object.keys(meta.changes).length} حجم`);
  if (typeof meta.name === "string") details.push(meta.name);
  if (typeof meta.slug === "string") details.push(meta.slug);
  if (typeof meta.enabled === "boolean") details.push(meta.enabled ? "تم التفعيل" : "تم الإيقاف");
  return details.join("، ") || "تفاصيل تقنية محفوظة";
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
          <h1>سجل النشاط {data ? `(${data.total})` : ""}</h1>
        </div>
      </header>
      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>من غيّر ماذا ومتى؟</h2>
            <p>لا تحتاج متابعة هذه الصفحة يوميًا. نرجع إليها فقط لمعرفة صاحب أي تعديل أو حل مشكلة.</p>
          </div>
          <input
            className="field"
            placeholder="ابحث: طلب، منتج، مخزون، دخول…"
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
                    <td>{l.actorName ?? (l.action === "order.created" ? "عميل من الموقع" : "النظام")}</td>
                    <td>{ACTION_LABELS[l.action] ?? l.action}</td>
                    <td>{l.entity ? ENTITY_LABELS[l.entity] ?? l.entity : "—"}</td>
                    <td>{auditDetails(l)}</td>
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
