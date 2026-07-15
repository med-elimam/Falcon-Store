"use client";

import Link from "next/link";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@falcon/shared";
import { formatMRU } from "@/lib/format";
import { Chip, EmptyBlock, ErrorBlock, LoadingBlock, useAdminData, useCan } from "@/components/manage/ui";

interface Overview {
  orderStatusCounts: Record<string, number>;
  productStatusCounts: Record<string, number>;
  customerCount: number;
  revenue30dMru: number;
  lowStockCount: number;
  stockTracked: boolean;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalMru: number;
    status: OrderStatus;
    createdAt: string;
  }[];
}

interface SettingsPayload {
  setupProgress: { key: string; completed: boolean }[];
}

const SETUP_STEPS = 8;

export default function OverviewPage() {
  const { data, error, loading, reload } = useAdminData<Overview>("/api/v1/admin/overview");
  const can = useCan();
  const settings = useAdminData<SettingsPayload>(can("settings.read") ? "/api/v1/admin/settings" : null);

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  const newOrders = data.orderStatusCounts.new ?? 0;
  const drafts = data.productStatusCounts.draft ?? 0;
  const completedSteps = settings.data?.setupProgress.filter((s) => s.completed).length ?? 0;
  const setupIncomplete = can("settings.write") && settings.data !== null && completedSteps < SETUP_STEPS;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>لوحة الإدارة</span>
          <h1>نظرة عامة</h1>
        </div>
      </header>

      {setupIncomplete && (
        <div className="setup-callout">
          <div>
            <b>إعداد المتجر غير مكتمل ({completedSteps}/{SETUP_STEPS})</b>
            <p>بعض أقسام الموقع لن تظهر للزبائن حتى تكتمل بياناتها الأساسية.</p>
          </div>
          <Link href="/manage/setup" className="btn btn-crimson">
            متابعة الإعداد
          </Link>
        </div>
      )}

      <section className="manage-stats">
        <article>
          <span>طلبات جديدة</span>
          <strong className="num">{newOrders}</strong>
        </article>
        <article>
          <span>مبيعات آخر 30 يومًا</span>
          <strong className="num">{formatMRU(data.revenue30dMru)}</strong>
        </article>
        <article>
          <span>العملاء</span>
          <strong className="num">{data.customerCount}</strong>
        </article>
        <article>
          <span>منتجات منشورة</span>
          <strong className="num">{data.productStatusCounts.published ?? 0}</strong>
        </article>
        {drafts > 0 && (
          <article>
            <span>مسودات تنتظر الإكمال</span>
            <strong className="num">{drafts}</strong>
          </article>
        )}
        {data.stockTracked && (
          <article>
            <span>أحجام قاربت على النفاد</span>
            <strong className="num">{data.lowStockCount}</strong>
          </article>
        )}
      </section>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>أحدث الطلبات</h2>
            <p>آخر 8 طلبات وصلت إلى المتجر.</p>
          </div>
          <Link href="/manage/orders" className="btn btn-ghost">
            كل الطلبات
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <EmptyBlock title="لا توجد طلبات بعد" hint="عند وصول أول طلب سيظهر هنا فورًا." />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="num">{o.orderNumber}</td>
                    <td>{o.customerName}</td>
                    <td className="num">{formatMRU(o.totalMru)}</td>
                    <td>
                      <Chip tone={o.status === "new" ? "info" : o.status === "cancelled" ? "bad" : o.status === "completed" ? "good" : "warn"}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Chip>
                    </td>
                    <td className="num">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
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
