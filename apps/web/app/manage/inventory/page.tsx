"use client";

import { useState } from "react";
import { INVENTORY_REASON_LABELS, type InventoryReason } from "@falcon/shared";
import { api, ApiError } from "@/lib/client-api";
import {
  Chip,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface AdminProduct {
  id: string;
  nameAr: string;
  brandName: string;
  rawVariants: { id: string; sizeLabel: string; stockQuantity: number; isAvailable: boolean }[];
}

interface MovementRow {
  movement: { id: string; delta: number; reason: InventoryReason; note: string | null; createdAt: string };
  size: string;
  productSlug: string;
  nameAr: string | null;
}

interface LowStock {
  stockTracked: boolean;
  threshold: null;
  items: { variantId: string; size: string; stock: number; lowStockThreshold: number; nameAr: string | null; brandName: string | null }[];
}

export default function InventoryPage() {
  const products = useAdminData<{ products: AdminProduct[] }>("/api/v1/admin/products");
  const movements = useAdminData<{ movements: MovementRow[] }>("/api/v1/admin/inventory/movements?perPage=40");
  const lowStock = useAdminData<LowStock>("/api/v1/admin/inventory/low-stock");
  const toast = useToast();
  const [variantId, setVariantId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<InventoryReason>("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (products.loading) return <LoadingBlock />;
  if (products.error || !products.data) return <ErrorBlock message={products.error ?? "تعذر التحميل"} onRetry={products.reload} />;

  const variantOptions = products.data.products.flatMap((p) =>
    p.rawVariants.map((v) => ({ id: v.id, label: `${p.nameAr} — ${v.sizeLabel}`, stock: v.stockQuantity }))
  );

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>المخزون</h1>
        </div>
      </header>

      {lowStock.data?.stockTracked && lowStock.data.items.length > 0 && (
        <section className="manage-card" style={{ marginBottom: 14 }}>
          <div className="manage-card-head">
            <div>
              <h2>متغيرات قاربت على النفاد</h2>
            </div>
          </div>
          <div className="manage-table-wrap">
            <table className="manage-table">
              <tbody>
                {lowStock.data.items.map((i) => (
                  <tr key={i.variantId}>
                    <td>
                      {i.nameAr ?? "منتج"} — <span className="num">{i.size}</span>
                    </td>
                    <td>
                      <Chip tone={i.stock === 0 ? "bad" : "warn"}>المتبقي: {i.stock}</Chip>
                      <small style={{ color: "var(--silver)", marginInlineStart: 8 }}>حد التنبيه: {i.lowStockThreshold}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="manage-card" style={{ marginBottom: 14 }}>
        <div className="manage-card-head">
          <div>
            <h2>حركة مخزون جديدة</h2>
            <p>كل تعديل يُسجَّل في دفتر الحركات وسجل التدقيق.</p>
          </div>
        </div>
        <div className="manage-form">
          <div className="row">
            <label>
              الحجم
              <select className="field" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                <option value="">اختر منتجًا وحجمًا</option>
                {variantOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} (المخزون: {v.stock})
                  </option>
                ))}
              </select>
            </label>
            <label>
              التغيير (+ إضافة / − خصم)
              <input
                className="field num"
                dir="ltr"
                inputMode="numeric"
                placeholder="+5 أو -2"
                value={delta}
                onChange={(e) => setDelta(e.target.value.replace(/[^\d+-]/g, ""))}
              />
            </label>
            <label>
              السبب
              <select className="field" value={reason} onChange={(e) => setReason(e.target.value as InventoryReason)}>
                {(["restock", "adjustment", "correction"] as const).map((r) => (
                  <option key={r} value={r}>
                    {INVENTORY_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ملاحظة (اختياري)
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </label>
          </div>
          <div className="manage-form-foot">
            <button
              className="btn btn-crimson"
              disabled={busy || !variantId || !delta || Number(delta) === 0 || Number.isNaN(Number(delta))}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/v1/admin/inventory/adjust", {
                    method: "POST",
                    body: { variantId, delta: Number(delta), reason, note: note.trim() || undefined },
                  });
                  toast.push("سُجّلت الحركة.");
                  setDelta("");
                  setNote("");
                  products.reload();
                  movements.reload();
                  lowStock.reload();
                } catch (err) {
                  toast.push(err instanceof ApiError ? err.message : "تعذر تسجيل الحركة.", "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              تسجيل الحركة
            </button>
          </div>
        </div>
      </section>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>آخر الحركات</h2>
          </div>
        </div>
        {movements.loading ? (
          <LoadingBlock />
        ) : movements.error || !movements.data ? (
          <ErrorBlock message={movements.error ?? "تعذر التحميل"} onRetry={movements.reload} />
        ) : movements.data.movements.length === 0 ? (
          <EmptyBlock title="لا توجد حركات مخزون بعد" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>التغيير</th>
                  <th>السبب</th>
                  <th>ملاحظة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {movements.data.movements.map((m) => (
                  <tr key={m.movement.id}>
                    <td>
                      {m.nameAr ?? m.productSlug} — <span className="num">{m.size}</span>
                    </td>
                    <td>
                      <Chip tone={m.movement.delta > 0 ? "good" : "bad"}>
                        <span className="num">{m.movement.delta > 0 ? `+${m.movement.delta}` : m.movement.delta}</span>
                      </Chip>
                    </td>
                    <td>{INVENTORY_REASON_LABELS[m.movement.reason]}</td>
                    <td>{m.movement.note ?? "—"}</td>
                    <td className="num">{new Date(m.movement.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
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
