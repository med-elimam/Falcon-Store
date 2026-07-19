import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracker } from "@/components/order-tracker";

export const metadata: Metadata = {
  title: "تتبع الطلب",
  description: "تابع حالة طلبك من فالكون ستور خطوة بخطوة.",
};

export default function TrackPage() {
  return (
    <div className="page-shell track-page">
      <section className="checkout-hero">
        <div className="shell">
          <span className="section-kicker">تتبع مباشر</span>
          <h1>أين طلبي؟</h1>
          <p>أدخل تفاصيل طلبك لمشاهدة حالة التجهيز والتوصيل الحالية.</p>
        </div>
      </section>
      <section className="shell track-section">
        <Suspense fallback={null}>
          <OrderTracker />
        </Suspense>
      </section>
    </div>
  );
}
