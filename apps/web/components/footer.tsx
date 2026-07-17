import type React from "react";
import Link from "next/link";
import type { PublicSettingsDTO } from "@falcon/shared";
import { waLink } from "@/lib/format";
import {
  FalconMark,
  WhatsAppIcon,
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "./icons";

/** التذييل يعرض فقط المعلومات التي أكملها صاحب المتجر — لا بيانات مخترعة. */
export function Footer({ settings }: { settings: PublicSettingsDTO | null }) {
  const social = settings?.social;
  const contact = settings?.contact;
  const identity = settings?.identity;

  type SocialLink = { label: string; href: string; icon: React.JSX.Element };
  const socialLinks: SocialLink[] = [
    social?.instagram
      ? { label: "Instagram", href: social.instagram, icon: <InstagramIcon /> }
      : null,
    social?.facebook
      ? { label: "Facebook", href: social.facebook, icon: <FacebookIcon /> }
      : null,
    social?.tiktok
      ? { label: "TikTok", href: social.tiktok, icon: <TikTokIcon /> }
      : null,
    contact?.whatsapp
      ? {
          label: "WhatsApp",
          href: waLink(contact.whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور."),
          icon: <WhatsAppIcon />,
        }
      : null,
  ].filter(Boolean) as SocialLink[];

  const paymentMethods = settings?.paymentMethods ?? [];

  return (
    <footer className="site-footer">
      {/* ── شبكة الأعمدة الرئيسية ── */}
      <div className="shell footer-grid">
        {/* هوية المتجر */}
        <div className="footer-brand">
          <FalconMark />
          <strong>FALCON STORE</strong>
          {identity?.description && <p>{identity.description}</p>}
        </div>

        {/* روابط الاستكشاف */}
        <div>
          <h3>استكشف</h3>
          <Link href="/shop">جميع العطور</Link>
          <Link href="/#decants">تعبئة 10ml</Link>
          <Link href="/#finder">اختر عطرك</Link>
          <Link href="/#authenticity">الأصالة والجودة</Link>
        </div>

        {/* خدمة العملاء */}
        <div>
          <h3>خدمة العملاء</h3>
          <Link href="/faq">الأسئلة الشائعة</Link>
          <Link href="/contact">تواصل معنا</Link>
          <Link href="/track">تتبع طلبك</Link>
          <Link href="/checkout">إتمام الطلب</Link>
          {contact?.address && <Link href="/#visit">الموقع والساعات</Link>}
        </div>
      </div>

      {/* ── قسم التواصل والدفع — يظهر فقط عند توفر بيانات ── */}
      {(socialLinks.length > 0 || paymentMethods.length > 0) && (
        <div className="shell">
          <div className="footer-connect">
            {/* روابط التواصل — دوائر */}
            {socialLinks.length > 0 && (
              <div className="footer-connect-social">
                <span className="footer-connect-label">روابط التواصل</span>
                <div className="footer-social-circles">
                  {socialLinks.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-circle"
                      aria-label={l.label}
                      title={l.label}
                    >
                      {l.icon}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* طرق الدفع */}
            {paymentMethods.length > 0 && (
              <div className="footer-connect-pay">
                <span className="footer-connect-label">طرق الدفع</span>
                <p className="footer-pay-methods">
                  {paymentMethods.map((m) => m.labelAr).join(" · ")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── الشريط السفلي ── */}
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Falcon Store</span>
        <span className="footer-bottom-brand">
          {identity?.nameAr ?? "متجر الصقر للعطور"} — LUXURY SCENTS
        </span>
      </div>
    </footer>
  );
}
