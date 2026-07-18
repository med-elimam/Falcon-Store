"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cartTotal, useCart } from "@/lib/cart";
import { formatMRU, waLink } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { api, ApiError } from "@/lib/client-api";
import { usePublicSettings } from "./settings-context";
import { WhatsAppIcon } from "./icons";
import { useHydrated } from "./use-hydrated";

interface OrderResult {
  orderNumber: string;
  totalMru: number;
  subtotalMru: number;
  deliveryFeeMru: number | null;
  whatsappMessage: string;
  whatsappNumber: string | null;
  paymentMethodLabel: string;
  status: string;
  phone: string;
}

function formatArabicItemCount(count: number): string {
  if (count === 1) return "عنصر واحد";
  if (count === 2) return "عنصران";
  if (count >= 3 && count <= 10) return `${count} عناصر`;
  return `${count} عنصرًا`;
}

export function CheckoutForm() {
  const router = useRouter();
  const settings = usePublicSettings();
  const { items, remove, clear } = useCart();
  const mounted = useHydrated();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  
  /* مفتاح تكرار ثابت لمحاولة الطلب الواحدة — يمنع إنشاء طلبين عند إعادة المحاولة */
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const subtotal = useMemo(() => cartTotal(items), [items]);

  const display = settings?.commerce.currencyDisplay ?? "mru";
  const zones = settings?.deliveryZones ?? [];
  const methods = settings?.paymentMethods ?? [];
  const checkoutReady = settings?.checkoutReady ?? false;
  const [zoneId, setZoneId] = useState("");
  const selectedZone = zones.find((z) => z.id === zoneId) ?? null;
  const whatsappUrl = result?.whatsappNumber ? waLink(result.whatsappNumber, result.whatsappMessage) : null;

  useEffect(() => {
    if (!whatsappUrl) return;

    const redirect = window.setTimeout(() => {
      window.location.assign(whatsappUrl);
    }, 1500);

    return () => window.clearTimeout(redirect);
  }, [whatsappUrl]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentMethodId) {
      setError("يرجى اختيار طريقة الدفع.");
      return;
    }
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    try {
      const payload = await api<OrderResult>("/api/v1/orders", {
        method: "POST",
        timeoutMs: 15_000,
        body: {
          customerName: data.name,
          phone: data.phone,
          deliveryZoneId: data.area,
          deliveryNote: data.deliveryNote || undefined,
          paymentMethodId: paymentMethodId,
          idempotencyKey: idempotencyKey.current,
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        },
      });
      setResult(payload);
      clear();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : "حدث خطأ غير متوقع. أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="checkout-grid" aria-hidden="true">
        <div className="checkout-form">
          <span className="sk-line" style={{ height: 28, width: "40%" }} />
          <span className="sk-line" style={{ height: 50, marginTop: 18 }} />
          <span className="sk-line" style={{ height: 50, marginTop: 10 }} />
          <span className="sk-line" style={{ height: 50, marginTop: 10 }} />
        </div>
        <aside className="order-summary">
          <span className="sk-line" style={{ height: 24, width: "50%" }} />
          <span className="sk-line" style={{ height: 60, marginTop: 14 }} />
        </aside>
      </div>
    );
  }

  if (result) {
    const successTrackUrl = `/track?orderNumber=${result.orderNumber}&phone=${result.phone}`;
    return (
      <div className="order-success" role="status" aria-live="polite" style={{ padding: "40px 16px" }}>
        <span style={{ color: "var(--success)", fontSize: "3.5rem", display: "block", marginBottom: 12 }}>✓</span>
        <h2>تم تسجيل طلبكم بنجاح</h2>
        <p style={{ marginBottom: 32 }}>نسعد بخدمتكم! تم تسجيل الطلب في النظام بنجاح وبانتظار التأكيد.</p>

        <div className="success-details-card" style={{
          background: "var(--surface-soft)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
          padding: "24px",
          width: "100%",
          maxWidth: "480px",
          textAlign: "right",
          margin: "0 auto 32px",
          display: "grid",
          gap: "14px"
        }}>
          <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: "10px", margin: "0 0 10px", fontSize: "1.1rem" }}>تفاصيل الطلب</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>رقم الطلب:</span>
            <strong className="num">#{result.orderNumber}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>طريقة الدفع:</span>
            <strong>{result.paymentMethodLabel}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>حالة الطلب:</span>
            <span style={{ background: "var(--info-soft)", color: "var(--info)", padding: "3px 10px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600" }}>
              جديد
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--line)", paddingTop: "12px", fontWeight: "700" }}>
            <span>الإجمالي:</span>
            <strong className="num">{formatMRU(result.totalMru, display)}</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "340px", margin: "0 auto" }}>
          {whatsappUrl && (
            <a href={whatsappUrl} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> تأكيد الطلب عبر واتساب
            </a>
          )}
          <Link href={successTrackUrl} className="btn btn-ghost">
            تتبع حالة الطلب
          </Link>
          <Link href="/shop" className="btn btn-crimson">
            الاستمرار في التسوق
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty-checkout">
        <h2>سلتك فارغة</h2>
        <p>أضف عطرًا إلى السلة لإتمام الطلب.</p>
        <button className="btn btn-crimson" onClick={() => router.push("/shop")}>
          تصفّح العطور
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="empty-checkout">
        <h2>تعذر الاتصال بالخادم مؤقتًا</h2>
        <p>سلتك محفوظة على جهازك. حدّث الصفحة بعد قليل لإكمال الطلب.</p>
        <button className="btn btn-ghost" onClick={() => router.refresh()}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!checkoutReady) {
    return (
      <div className="empty-checkout">
        <h2>الطلب عبر الموقع متوقف مؤقتًا</h2>
        <p>
          لن نرسل طلبًا خارج النظام حتى لا تضيع بيانات العميل أو المخزون. حدّث الإعدادات، ثم أعد تحميل الصفحة.
        </p>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>
          تحديث صفحة الطلب
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-heading">
          <span className="section-kicker">بيانات التوصيل</span>
          <h2>أين نرسل طلبك؟</h2>
          <p>أدخل بيانات التوصيل، راجع طلبك ثم أكّد العملية.</p>
        </div>
        <div className="form-grid">
          <label>
            الاسم الكامل
            <input className="field" name="name" required minLength={3} maxLength={120} autoComplete="name" disabled={loading} />
          </label>
          <label>
            رقم الهاتف
            <input
              className="field num"
              name="phone"
              required
              inputMode="tel"
              placeholder="مثال: 36000000"
              autoComplete="tel"
              disabled={loading}
            />
          </label>
          <label>
            المنطقة
            <select
              className="field"
              name="area"
              required
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                اختر المنطقة
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.nameAr}
                  {zone.feeMru !== null ? ` — توصيل ${formatMRU(zone.feeMru, display)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            ملاحظة التوصيل (اختياري)
            <input className="field" name="deliveryNote" maxLength={300} placeholder="معلم قريب أو وقت مناسب" disabled={loading} />
          </label>
        </div>
        <fieldset className="payment-options" disabled={loading}>
          <legend>طريقة الدفع</legend>
          {methods.map((method) => (
            <label key={method.id}>
              <input
                type="radio"
                name="payment"
                value={method.id}
                required
                checked={paymentMethodId === method.id}
                onChange={() => setPaymentMethodId(method.id)}
              />
              <span>
                <b>{method.labelAr}</b>
                {method.instructionsAr && <small>{method.instructionsAr}</small>}
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="form-error" role="alert" style={{ marginBottom: 18 }}>
            {error}
          </p>
        )}
        <button className="btn btn-crimson btn-block" disabled={loading || !paymentMethodId}>
          {loading ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </button>
        <p className="privacy-note">لن تُستخدم بياناتك إلا لتجهيز هذا الطلب والتواصل بخصوصه.</p>
      </form>
      
      <aside className={`order-summary ${summaryExpanded ? "is-expanded" : ""}`}>
        <div
          className="summary-head"
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          aria-expanded={summaryExpanded}
          aria-label="توسيع أو طي ملخص الطلب"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>ملخص الطلب</h2>
            <span className="num" style={{ fontSize: "0.82rem", background: "var(--surface-soft)", padding: "2px 8px", borderRadius: "4px" }}>
              {formatArabicItemCount(items.length)}
            </span>
          </div>
          <span className="chevron-toggle" style={{ fontSize: "0.8rem", color: "var(--silver)" }}>
            {summaryExpanded ? "▲" : "▼"}
          </span>
        </div>
        
        <div className="summary-body">
          <div className="summary-items-list" style={{ marginTop: 14 }}>
            {items.map((item) => (
              <article key={item.variantId}>
                <div className="summary-thumb">
                  {item.image && <Image src={mediaSrc(item.image)} alt="" fill sizes="68px" />}
                </div>
                <div>
                  <small>{item.brand}</small>
                  <strong>{item.nameAr}</strong>
                  <span>
                    {item.size} × <b className="num">{item.qty}</b>
                  </span>
                </div>
                <div>
                  <b className="num">{formatMRU(item.priceMru * item.qty, display)}</b>
                  <button type="button" onClick={() => remove(item.variantId)} disabled={loading}>
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
          
          <div className="summary-total" style={{ marginTop: 20 }}>
            <div>
              <span>المنتجات</span>
              <strong className="num">{formatMRU(subtotal, display)}</strong>
            </div>
            <div>
              <span>التوصيل</span>
              <strong className="num">
                {selectedZone
                  ? selectedZone.feeMru !== null
                    ? formatMRU(selectedZone.feeMru, display)
                    : "يُحدد عند التأكيد"
                  : "يُحدد بعد اختيار المنطقة"}
              </strong>
            </div>
            <div>
              <span>الإجمالي المبدئي</span>
              <strong className="num">{formatMRU(subtotal + (selectedZone?.feeMru ?? 0), display)}</strong>
            </div>
            {selectedZone?.etaAr && <small>مدة التوصيل المتوقعة: {selectedZone.etaAr}</small>}
          </div>
        </div>
      </aside>
    </div>
  );
}
