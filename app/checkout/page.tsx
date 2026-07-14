import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "إتمام الطلب", description: "أكمل طلبك المحلي من فالكون ستور وأكده عبر واتساب." };
export default function CheckoutPage() { return <div className="page-shell checkout-page"><section className="checkout-hero"><div className="shell"><span className="section-kicker">خطوة أخيرة</span><h1>إتمام الطلب</h1><p>بيانات واضحة، تأكيد مباشر، ولا خطوات زائدة.</p></div></section><section className="shell checkout-section"><CheckoutForm /></section></div>; }
