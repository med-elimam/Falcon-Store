"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
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
  deliveryFeeMru: number | null;
  whatsappMessage: string;
  whatsappNumber: string | null;
}

export function CheckoutForm() {
  const router = useRouter();
  const settings = usePublicSettings();
  const { items, remove, clear } = useCart();
  const mounted = useHydrated();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  /* مفتاح تكرار ثابت لمحاولة الطلب الواحدة — يمنع إنشاء طلبين عند إعادة المحاولة */
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const subtotal = useMemo(() => cartTotal(items), [items]);

  const display = settings?.commerce.currencyDisplay ?? "mru";
  const zones = settings?.deliveryZones ?? [];
  const methods = settings?.paymentMethods ?? [];
  const checkoutReady = settings?.checkoutReady ?? false;
  const whatsapp = settings?.contact.whatsapp ?? null;
  const [zoneId, setZoneId] = useState("");
  const selectedZone = zones.find((z) => z.id === zoneId) ?? null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          paymentMethodId: data.payment,
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

  if (!mounted) return <div className="checkout-loading">جارٍ تجهيز طلبك…</div>;

  if (result) {
    return (
      <div className="order-success">
        <span>تم استلام الطلب</span>
        <h2 className="num">#{result.orderNumber}</h2>
        <p>حُفظ طلبك برقم مرجعي وسنراجعه فورًا.</p>
        {result.whatsappNumber ? (
          <a
            href={waLink(result.whatsappNumber, result.whatsappMessage)}
            className="btn btn-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> تأكيد عبر واتساب
          </a>
        ) : (
          <p>سنتواصل معك على رقم الهاتف الذي أدخلته لتأكيد التفاصيل.</p>
        )}
        <button className="text-button" onClick={() => router.push("/shop")}>
          العودة إلى المتجر
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty-checkout">
        <h2>لا توجد منتجات في الطلب</h2>
        <p>ابدأ بإضافة عطر من المجموعة.</p>
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
        {whatsapp ? (
          <>
            <h2>أكمل طلبك مباشرة عبر واتساب</h2>
            <p>أرسل لنا اختياراتك وسنؤكد السعر والتوصيل معك فورًا. سلتك محفوظة على جهازك.</p>
            <a
              href={waLink(
                whatsapp,
                `السلام عليكم، أريد إتمام طلب من فالكون ستور:\n${items
                  .map((i) => `${i.nameAr} — ${i.size} × ${i.qty}`)
                  .join("\n")}`
              )}
              className="btn btn-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon /> إرسال الطلب عبر واتساب
            </a>
          </>
        ) : (
          <>
            <h2>الطلب عبر الموقع غير متاح في هذه اللحظة</h2>
            <p>سلتك محفوظة على جهازك. أعد المحاولة بعد قليل.</p>
            <button className="btn btn-ghost" onClick={() => router.refresh()}>
              إعادة المحاولة
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-heading">
          <span className="section-kicker">بيانات بسيطة</span>
          <h2>أين نرسل طلبك؟</h2>
          <p>سنراجع التوفر والتوصيل معك قبل الدفع.</p>
        </div>
        <div className="form-grid">
          <label>
            الاسم الكامل
            <input className="field" name="name" required minLength={3} maxLength={120} autoComplete="name" />
          </label>
          <label>
            رقم الهاتف
            <input
              className="field num"
              name="phone"
              required
              inputMode="tel"
              pattern="\+?\d{8,15}"
              autoComplete="tel"
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
            <input className="field" name="deliveryNote" maxLength={300} placeholder="معلم قريب أو وقت مناسب" />
          </label>
        </div>
        <fieldset className="payment-options">
          <legend>طريقة الدفع</legend>
          {methods.map((method, index) => (
            <label key={method.id}>
              <input type="radio" name="payment" value={method.id} required defaultChecked={index === 0} />
              <span>
                <b>{method.labelAr}</b>
                {method.instructionsAr && <small>{method.instructionsAr}</small>}
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-crimson btn-block" disabled={loading}>
          {loading ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </button>
        <p className="privacy-note">لن تُستخدم بياناتك إلا لتجهيز هذا الطلب والتواصل بخصوصه.</p>
      </form>
      <aside className="order-summary">
        <div className="summary-head">
          <h2>ملخص الطلب</h2>
          <span className="num">{items.length} عناصر</span>
        </div>
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
              <button type="button" onClick={() => remove(item.variantId)}>
                حذف
              </button>
            </div>
          </article>
        ))}
        <div className="summary-total">
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
                : "اختر المنطقة"}
            </strong>
          </div>
          <div>
            <span>الإجمالي المبدئي</span>
            <strong className="num">{formatMRU(subtotal + (selectedZone?.feeMru ?? 0), display)}</strong>
          </div>
          {selectedZone?.etaAr && <small>مدة التوصيل المتوقعة: {selectedZone.etaAr}</small>}
        </div>
      </aside>
    </div>
  );
}
