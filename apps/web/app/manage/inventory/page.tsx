"use client";

import { useState } from "react";
import type { InventoryReason } from "@falcon/shared";
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

type StockAction = "add" | "remove";

function movementLabel(reason: InventoryReason, delta: number): string {
  if (reason === "order") return "بيع من الموقع";
  if (reason === "cancel") return "إلغاء طلب وإرجاع الكمية";
  if (reason === "restock") return "إضافة بضاعة";
  return delta > 0 ? "تصحيح بالزيادة" : "تصحيح بالنقصان";
}

export default function InventoryPage() {
  const products = useAdminData<{ products: AdminProduct[] }>("/api/v1/admin/products");
  const movements = useAdminData<{ movements: MovementRow[] }>("/api/v1/admin/inventory/movements?perPage=40");
  const lowStock = useAdminData<LowStock>("/api/v1/admin/inventory/low-stock");
  const toast = useToast();
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [action, setAction] = useState<StockAction>("add");
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
              <h2>منتجات قاربت على النفاد</h2>
              <p>هذه المنتجات تحتاج إضافة كمية قريبًا.</p>
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
            <h2>تعديل كمية منتج</h2>
            <p>اختر المنتج، ثم حدّد هل تريد إضافة كمية أم إنقاصها.</p>
          </div>
        </div>
        <div className="manage-form">
          <fieldset className="inventory-action">
            <legend>ماذا تريد أن تفعل؟</legend>
            <label data-active={action === "add" ? "true" : undefined}>
              <input type="radio" name="stock-action" checked={action === "add"} onChange={() => setAction("add")} />
              <span>
                <b>إضافة كمية</b>
                <small>وصلت بضاعة جديدة إلى المتجر</small>
              </span>
            </label>
            <label data-active={action === "remove" ? "true" : undefined}>
              <input type="radio" name="stock-action" checked={action === "remove"} onChange={() => setAction("remove")} />
              <span>
                <b>إنقاص كمية</b>
                <small>لتصحيح خطأ أو تسجيل تلف</small>
              </span>
            </label>
          </fieldset>
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
              الكمية
              <input
                className="field num"
                dir="ltr"
                inputMode="numeric"
                placeholder="مثال: 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
              />
            </label>
            <label>
              ملاحظة (اختياري)
              <input
                className="field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder={action === "add" ? "مثال: وصلت دفعة جديدة" : "مثال: عبوة تالفة"}
              />
            </label>
          </div>
          <div className="manage-form-foot">
            <button
              className="btn btn-crimson"
              disabled={busy || !variantId || !quantity || Number(quantity) <= 0 || !Number.isInteger(Number(quantity))}
              onClick={async () => {
                setBusy(true);
                try {
                  const amount = Number(quantity);
                  const delta = action === "add" ? amount : -amount;
                  const result = await api<{ stock: number }>("/api/v1/admin/inventory/adjust", {
                    method: "POST",
                    body: {
                      variantId,
                      delta,
                      reason: action === "add" ? "restock" : "correction",
                      note: note.trim() || undefined,
                    },
                  });
                  toast.push(`تم تحديث المخزون. الكمية الحالية: ${result.stock}`);
                  setQuantity("");
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
              {busy ? "جارٍ الحفظ…" : action === "add" ? "إضافة الكمية" : "إنقاص الكمية"}
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
                  <th>الكمية</th>
                  <th>ما الذي حدث؟</th>
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
                    <td>{movementLabel(m.movement.reason, m.movement.delta)}</td>
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
