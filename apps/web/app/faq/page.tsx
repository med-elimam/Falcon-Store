import type { Metadata } from "next";
import { WhatsAppIcon } from "@/components/icons";
import { getContentSections, getPublicSettings } from "@/lib/api";
import { waLink } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "الأسئلة الشائعة والسياسات",
  description: "أجوبة مباشرة عن الأصالة والتوصيل والدفع والإرجاع في فالكون ستور.",
};

export default async function FaqPage() {
  const [settings, sections] = await Promise.all([getPublicSettings(), getContentSections()]);
  const faqs = sections.filter((s) => s.type === "faq" && s.titleAr && s.bodyAr);
  const whatsapp = settings?.contact.whatsapp ?? null;

  /* السياسات نصوص حقيقية يكتبها صاحب المتجر — يظهر منها ما اكتمل فقط */
  const policies = [
    settings?.policies.authenticity ? { key: "authenticity", title: "سياسة الأصالة", body: settings.policies.authenticity } : null,
    settings?.policies.returns ? { key: "returns", title: "الاستبدال والإرجاع", body: settings.policies.returns } : null,
    settings?.policies.privacy ? { key: "privacy", title: "الخصوصية", body: settings.policies.privacy } : null,
    settings?.policies.terms ? { key: "terms", title: "شروط البيع", body: settings.policies.terms } : null,
  ].filter((p) => p !== null);

  return (
    <div className="page-shell">
      <section className="shop-hero">
        <div className="shell">
          <span className="section-kicker">المساعدة</span>
          <h1>أسئلة وأجوبة واضحة</h1>
          <p>كل ما يهمك عن الأصالة والتوصيل والدفع والإرجاع، بلا مصطلحات ملتوية.</p>
        </div>
      </section>

      <section className="shell help-page section-pad">
        {faqs.length === 0 && policies.length === 0 ? (
          <div className="no-results">
            <strong>المحتوى قيد الاستكمال</strong>
            <p>تُنشر الأسئلة والسياسات هنا فور اعتمادها من إدارة المتجر.</p>
          </div>
        ) : (
          <div className="help-columns">
            {faqs.length > 0 && (
              <div className="help-block">
                <h2>الأسئلة الشائعة</h2>
                <div className="faq-list">
                  {faqs.map((f) => (
                    <details key={f.key} className="faq-item">
                      <summary>{f.titleAr}</summary>
                      <p>{f.bodyAr}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
            {policies.length > 0 && (
              <div className="help-block">
                <h2>سياسات المتجر</h2>
                <div className="faq-list">
                  {policies.map((p) => (
                    <details key={p.key} className="faq-item">
                      <summary>{p.title}</summary>
                      <p>{p.body}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {whatsapp && (
          <div className="help-cta">
            <p>لم تجد جوابك؟ اسألنا مباشرة ونرد عليك بسرعة.</p>
            <a
              href={waLink(whatsapp, "السلام عليكم، عندي سؤال عن فالكون ستور.")}
              className="btn btn-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon /> اسأل عبر واتساب
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
