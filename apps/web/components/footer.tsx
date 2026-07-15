import Link from "next/link";
import type { PublicSettingsDTO } from "@falcon/shared";
import { FalconMark } from "./icons";

/** التذييل يعرض فقط المعلومات التي أكملها صاحب المتجر — لا بيانات مخترعة. */
export function Footer({ settings }: { settings: PublicSettingsDTO | null }) {
  const social = settings?.social;
  const contact = settings?.contact;
  const identity = settings?.identity;
  const socialLinks = [
    social?.instagram ? { label: "Instagram", href: social.instagram } : null,
    social?.facebook ? { label: "Facebook", href: social.facebook } : null,
    social?.tiktok ? { label: "TikTok", href: social.tiktok } : null,
  ].filter((l): l is { label: string; href: string } => l !== null);

  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <FalconMark />
          <strong>FALCON STORE</strong>
          {identity?.description && <p>{identity.description}</p>}
        </div>
        <div>
          <h3>استكشف</h3>
          <Link href="/shop">جميع العطور</Link>
          <Link href="/#decants">تعبئة 10ml</Link>
          <Link href="/#finder">اختر عطرك</Link>
        </div>
        <div>
          <h3>خدمة العملاء</h3>
          <Link href="/checkout">إتمام الطلب</Link>
          {contact?.address && <Link href="/#visit">الموقع والتواصل</Link>}
          {socialLinks.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ))}
        </div>
        <div className="footer-note">
          <span>نواكشوط · موريتانيا</span>
          <p>
            {settings?.commerce.currencyDisplay === "ouguiya_ancienne"
              ? "الأسعار معروضة بالأوقية القديمة."
              : "الأسعار بالأوقية الجديدة MRU."}{" "}
            يتم تأكيد التوفر وموعد التوصيل قبل إتمام الطلب.
          </p>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Falcon Store</span>
        <span>{identity?.nameAr ?? "متجر الصقر للعطور"}</span>
      </div>
    </footer>
  );
}
