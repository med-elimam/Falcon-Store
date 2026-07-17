"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { formatMRU, waLink } from "@/lib/format";
import { usePublicSettings } from "./settings-context";
import { WhatsAppIcon } from "./icons";

interface OrderData {
  order: {
    id: string;
    orderNumber: string;
    status: "new" | "confirmed" | "preparing" | "out_for_delivery" | "completed" | "cancelled";
    createdAt: string;
    customerName: string;
    phone: string;
    area: string;
    deliveryFeeMru: number | null;
    subtotalMru: number;
    totalMru: number;
  };
  items: Array<{
    id: string;
    nameAr: string;
    brandName: string | null;
    size: string;
    qty: number;
    unitPriceMru: number;
    lineTotalMru: number;
  }>;
  history: Array<{
    status: string;
    createdAt: string;
    note: string | null;
  }>;
  support: {
    whatsapp: string | null;
    phone: string | null;
  };
}

const STEPS = [
  { key: "new", label: "تم استلام الطلب", desc: "تلقينا طلبك وبانتظار التأكيد" },
  { key: "confirmed", label: "تم تأكيد الطلب", desc: "تم تأكيد التوفر والتجهيز للتوصيل" },
  { key: "preparing", label: "جارٍ التجهيز", desc: "نقوم بتعبئة وتغليف عطورك بعناية" },
  { key: "out_for_delivery", label: "خرج للتوصيل", desc: "المندوب في طريقه إليك" },
  { key: "completed", label: "تم التسليم", desc: "تمنياتنا لك بتجربة عطرية رائعة" },
];

export function OrderTracker() {
  const settings = usePublicSettings();
  const display = settings?.commerce.currencyDisplay ?? "mru";

  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<OrderData | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) return;

    setLoading(true);
    setError("");

    try {
      const payload = await api<OrderData>(
        `/api/v1/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`
      );
      setData(payload);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حدث خطأ غير متوقع. أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setData(null);
    setOrderNumber("");
    setPhone("");
    setError("");
  }

  if (data) {
    const { order, items, support } = data;
    const isCancelled = order.status === "cancelled";
    
    // Find active step index
    const activeIndex = STEPS.findIndex((s) => s.key === order.status);

    const whatsappUrl = support.whatsapp
      ? waLink(support.whatsapp, `السلام عليكم، أستفسر عن حالة طلبي رقم ${order.orderNumber}`)
      : null;

    return (
      <div className="tracker-result-container">
        <div className="tracker-header">
          <div>
            <span className="order-badge">الطلب #{order.orderNumber}</span>
            <h2>حالة طلبك الحالية</h2>
            <p>تاريخ التسجيل: {new Date(order.createdAt).toLocaleDateString("ar-MR", { dateStyle: "long" })}</p>
          </div>
          <button className="btn btn-ghost" onClick={handleReset}>
            تتبع طلب آخر
          </button>
        </div>

        {isCancelled ? (
          <div className="cancellation-banner">
            <div className="cancel-icon">✕</div>
            <div>
              <h3>تم إلغاء هذا الطلب</h3>
              <p>إذا كان لديك أي استفسار، تواصل معنا مباشرة عبر خدمة العملاء.</p>
            </div>
          </div>
        ) : (
          <div className="timeline-container">
            <div className="timeline-progress-bar">
              <div
                className="timeline-progress-fill"
                style={{
                  height: `${(Math.max(0, activeIndex) / (STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>
            
            <div className="timeline-steps">
              {STEPS.map((step, idx) => {
                const isPassed = idx <= activeIndex;
                const isCurrent = idx === activeIndex;
                return (
                  <div
                    key={step.key}
                    className={`timeline-step-item ${isPassed ? "passed" : ""} ${isCurrent ? "current" : ""}`}
                  >
                    <div className="step-bullet">
                      {isPassed && idx < activeIndex ? "✓" : idx + 1}
                    </div>
                    <div className="step-info">
                      <strong>{step.label}</strong>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="tracker-details-grid">
          {/* تفاصيل العميل والوجهة */}
          <div className="tracker-card">
            <h3>تفاصيل الشحن والتوصيل</h3>
            <ul className="details-list">
              <li>
                <span>الاسم الكامل:</span>
                <strong>{order.customerName}</strong>
              </li>
              <li>
                <span>رقم الهاتف:</span>
                <strong>{order.phone}</strong>
              </li>
              <li>
                <span>المنطقة:</span>
                <strong>{order.area}</strong>
              </li>
            </ul>
          </div>

          {/* ملخص السعر والمنتجات */}
          <div className="tracker-card">
            <h3>ملخص المنتجات</h3>
            <div className="tracker-products-list">
              {items.map((item) => (
                <div key={item.id} className="tracker-product-item">
                  <div>
                    {item.brandName && <small>{item.brandName}</small>}
                    <strong>{item.nameAr}</strong>
                    <span>الحجم: {item.size} × {item.qty}</span>
                  </div>
                  <b className="num">{formatMRU(item.lineTotalMru, display)}</b>
                </div>
              ))}
            </div>

            <div className="tracker-totals">
              <div>
                <span>المجموع الفرعي:</span>
                <span className="num">{formatMRU(order.subtotalMru, display)}</span>
              </div>
              <div>
                <span>رسوم التوصيل:</span>
                <span className="num">
                  {order.deliveryFeeMru !== null ? formatMRU(order.deliveryFeeMru, display) : "مجاني"}
                </span>
              </div>
              <div className="grand-total">
                <span>الإجمالي:</span>
                <strong className="num">{formatMRU(order.totalMru, display)}</strong>
              </div>
            </div>
          </div>
        </div>

        {whatsappUrl && (
          <div className="tracker-cta-container">
            <p>أو تواصل مع الدعم الفني للمتجر مباشرة للاستفسار أو التعديل:</p>
            <a href={whatsappUrl} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> استفسار عبر واتساب
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tracker-form-container">
      <form className="tracker-form" onSubmit={handleSearch}>
        <h2>أدخل بيانات الطلب للتتبع</h2>
        <p>تحتاج إلى رقم الطلب ورقم الهاتف الذي سجلت به الطلب.</p>

        <div className="form-grid">
          <label>
            رقم الطلب
            <input
              className="field num"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="مثال: FLC-1001"
              required
            />
          </label>

          <label>
            رقم الهاتف
            <input
              className="field num"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 22234744257"
              required
            />
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-crimson btn-block" disabled={loading}>
          {loading ? "جارٍ البحث عن طلبك…" : "تتبع حالة الطلب"}
        </button>
      </form>
    </div>
  );
}
