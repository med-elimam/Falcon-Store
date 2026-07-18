import type { Metadata } from "next";
import Link from "next/link";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/icons";
import { getPublicSettings } from "@/lib/api";
import { waLink } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "قنوات التواصل مع فالكون ستور في نواكشوط: واتساب، هاتف، عنوان المتجر وأوقات العمل.",
};

function formatPhoneVisual(phoneStr: string): string {
  const digits = phoneStr.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("222")) {
    return `+222 ${digits.substring(3, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)} ${digits.substring(9, 11)}`;
  }
  if (digits.length === 8) {
    return `+222 ${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 6)} ${digits.substring(6, 8)}`;
  }
  return phoneStr;
}

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const contact = settings?.contact;
  const whatsapp = contact?.whatsapp ?? null;
  const phone = contact?.phone ?? null;
  const emailRaw = contact?.email ?? null;
  const email = emailRaw && emailRaw.trim() !== "" && !emailRaw.includes("example.com") && emailRaw !== "contact@falcon-store.com" ? emailRaw : null;
  const address = contact?.address ?? null;
  const addressIsUrl = address ? /(?:https?:\/\/|www\.|maps\.app\.)/i.test(address) : false;
  const addressLabel = address && !addressIsUrl ? address : null;
  const mapUrl = settings?.contact.mapUrl ?? (addressIsUrl ? address : null);
  const hours = settings?.operations.hoursAr ?? null;
  const hasAny = whatsapp || phone || email || addressLabel || mapUrl || hours;

  return (
    <div className="page-shell">
      <section className="shop-hero">
        <div className="shell">
          <span className="section-kicker">نواكشوط</span>
          <h1>تواصل معنا</h1>
          <p>استشارة، طلب، أو استفسار — نرد عليك بالقناة التي تناسبك.</p>
        </div>
      </section>

      <section className="shell contact-page section-pad">
        {!hasAny ? (
          <div className="no-results">
            <strong>بيانات التواصل قيد الاستكمال</strong>
            <p>تُنشر قنوات التواصل هنا فور اعتمادها من إدارة المتجر.</p>
          </div>
        ) : (
          <div className="contact-grid">
            {whatsapp && (
              <a
                className="contact-card is-primary"
                href={waLink(whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon />
                <b>واتساب</b>
                <p>أسرع طريقة للطلب والاستشارة — نرد في أوقات العمل.</p>
                <span className="contact-card-action">ابدأ المحادثة</span>
              </a>
            )}
            {phone && (
              <a className="contact-card" href={`tel:${phone.replace(/\D/g, "")}`}>
                <PhoneIcon />
                <b>الهاتف</b>
                <p className="num" dir="ltr">
                  {formatPhoneVisual(phone)}
                </p>
                <span className="contact-card-action">اتصل الآن</span>
              </a>
            )}
            {email && (
              <a className="contact-card" href={`mailto:${email}`}>
                <MailIcon />
                <b>البريد الإلكتروني</b>
                <p dir="ltr">{email}</p>
                <span className="contact-card-action">أرسل رسالة</span>
              </a>
            )}
            {(addressLabel || mapUrl) && (
              <div className="contact-card">
                <PinIcon />
                <b>عنوان المتجر</b>
                {addressLabel && <p>{addressLabel}</p>}
                {mapUrl && (
                  <a className="contact-card-action" href={mapUrl} target="_blank" rel="noopener noreferrer">
                    افتح الخريطة
                  </a>
                )}
              </div>
            )}
            {hours && (
              <div className="contact-card">
                <ClockIcon />
                <b>أوقات العمل</b>
                <p>{hours}</p>
              </div>
            )}
          </div>
        )}

        <div className="help-cta">
          <p>جاهز للطلب مباشرة؟</p>
          <Link href="/shop" className="btn btn-crimson">
            تصفح العطور
          </Link>
        </div>
      </section>
    </div>
  );
}
