import Link from "next/link";
import { FalconMark } from "./icons";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand"><FalconMark /><strong>FALCON STORE</strong><p>عطور أصلية مختارة وتعبئة دقيقة بحجم 10ml في نواكشوط.</p></div>
        <div><h3>استكشف</h3><Link href="/shop">جميع العطور</Link><Link href="/#decants">تعبئة 10ml</Link><Link href="/#finder">اختر عطرك</Link></div>
        <div><h3>خدمة العملاء</h3><Link href="/checkout">إتمام الطلب</Link><Link href="/#visit">الموقع والتواصل</Link><Link href="/admin">لوحة الإدارة</Link></div>
        <div className="footer-note"><span>نواكشوط · موريتانيا</span><p>الأسعار بالأوقية الجديدة MRU. يتم تأكيد التوفر وموعد التوصيل قبل إتمام الطلب.</p></div>
      </div>
      <div className="shell footer-bottom"><span>© 2026 Falcon Store</span><span>الأصالة تُعرض، لا تُدّعى.</span></div>
    </footer>
  );
}
