"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS, PAYMENT_METHODS } from "@/lib/config";
import { cartTotal, useCart } from "@/lib/cart";
import { formatMRU } from "@/lib/format";
import { WhatsAppIcon } from "./icons";
import { useHydrated } from "./use-hydrated";

type Result = { orderNumber: string; whatsappUrl: string; persisted: boolean };

export function CheckoutForm() {
  const router = useRouter();
  const { items, remove, clear } = useCart();
  const mounted = useHydrated();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const summary = useMemo(() => cartTotal(items), [items]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, items, total: summary.total }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر إرسال الطلب");
      setResult(payload); clear();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "حدث خطأ غير متوقع"); }
    finally { setLoading(false); }
  }

  if (!mounted) return <div className="checkout-loading">جارٍ تجهيز طلبك…</div>;
  if (result) return <div className="order-success"><span>تم تجهيز الطلب</span><h2 className="num">#{result.orderNumber}</h2><p>{result.persisted ? "حُفظ الطلب بنجاح. أكّد تفاصيله الآن عبر واتساب." : "هذا وضع المعاينة. أضف بيانات Supabase لحفظ الطلبات تلقائياً."}</p><a href={result.whatsappUrl} className="btn btn-whatsapp"><WhatsAppIcon /> تأكيد عبر واتساب</a><button className="text-button" onClick={() => router.push("/shop")}>العودة إلى المتجر</button></div>;
  if (!items.length) return <div className="empty-checkout"><h2>لا توجد منتجات في الطلب</h2><p>ابدأ بإضافة عطر من المجموعة.</p><button className="btn btn-crimson" onClick={() => router.push("/shop")}>تصفّح العطور</button></div>;

  return (
    <div className="checkout-grid">
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-heading"><span className="section-kicker">بيانات بسيطة</span><h2>أين نرسل طلبك؟</h2><p>سنراجع التوفر والتوصيل معك عبر واتساب قبل الدفع.</p></div>
        <div className="form-grid"><label>الاسم الكامل<input className="field" name="name" required minLength={3} autoComplete="name" placeholder="مثال: محمد أحمد" /></label><label>رقم الهاتف<input className="field num" name="phone" required inputMode="tel" autoComplete="tel" placeholder="22xxxxxx" /></label><label>المنطقة<select className="field" name="area" required defaultValue=""><option value="" disabled>اختر المنطقة</option>{AREAS.map((area) => <option key={area}>{area}</option>)}</select></label><label>ملاحظة التوصيل<input className="field" name="deliveryNote" placeholder="معلم قريب أو وقت مناسب" /></label></div>
        <fieldset className="payment-options"><legend>طريقة الدفع</legend>{PAYMENT_METHODS.map((method, index) => <label key={method.id}><input type="radio" name="payment" value={method.id} required defaultChecked={index === 0} /><span><b>{method.label}</b><small>{method.id === "cod" ? "ادفع عند استلام طلبك" : "يتم إرسال تفاصيل التحويل بعد التأكيد"}</small></span></label>)}</fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-whatsapp btn-block" disabled={loading}><WhatsAppIcon /> {loading ? "جارٍ تجهيز الطلب…" : "تأكيد الطلب عبر واتساب"}</button>
        <p className="privacy-note">لن يتم استخدام بياناتك إلا لتجهيز هذا الطلب والتواصل بخصوصه.</p>
      </form>
      <aside className="order-summary"><div className="summary-head"><h2>ملخص الطلب</h2><span className="num">{items.length} عناصر</span></div>{items.map((item) => <article key={`${item.slug}-${item.size}`}><div className="summary-thumb"><Image src={item.image} alt="" fill sizes="68px" /></div><div><small>{item.brand}</small><strong>{item.nameAr}</strong><span>{item.size} × <b className="num">{item.qty}</b></span></div><div><b className="num">{formatMRU(item.price === null ? null : item.price * item.qty)}</b><button onClick={() => remove(item.slug, item.size)}>حذف</button></div></article>)}<div className="summary-total"><div><span>الإجمالي المبدئي</span><strong className="num">{formatMRU(summary.total)}</strong></div>{summary.hasUnpriced && <p>توجد منتجات يُؤكد سعرها عبر واتساب.</p>}<small>التوصيل يُحدد حسب المنطقة بعد التأكيد.</small></div></aside>
    </div>
  );
}
