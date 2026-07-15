"use client";

import { useState } from "react";
import { api } from "@/lib/client-api";
import { ErrorBlock, LoadingBlock, useAdminData, useToast } from "@/components/manage/ui";
import {
  CommerceForm,
  ContactForm,
  DeliveryZonesEditor,
  IdentityForm,
  OperationsForm,
  PaymentMethodsEditor,
  PoliciesForm,
  SocialForm,
  type SettingsPayload,
} from "@/components/manage/settings-forms";

type StepKey = "identity" | "contact" | "commerce" | "delivery" | "payments" | "policies" | "social" | "operations";

const STEPS: { key: StepKey; label: string; required: boolean; hint: string }[] = [
  { key: "identity", label: "هوية المتجر", required: true, hint: "الاسم الرسمي والوصف والشعار." },
  { key: "contact", label: "التواصل", required: true, hint: "رقم واتساب الطلبات هو الأساس — بدونه تختفي أزرار واتساب من الموقع." },
  { key: "commerce", label: "العملة والبيع", required: true, hint: "طريقة عرض الأسعار وقواعد الاستلام." },
  { key: "delivery", label: "مناطق التوصيل", required: true, hint: "فعّل المناطق وحدد رسومها — الطلب عبر الموقع لا يفتح بدونها." },
  { key: "payments", label: "طرق الدفع", required: true, hint: "فعّل الطرق التي تستخدمها فعلاً فقط." },
  { key: "policies", label: "السياسات والأصالة", required: true, hint: "نص الأصالة الذي تعتمده يظهر للزبائن؛ يبقى القسم مخفيًا حتى تكتبه." },
  { key: "social", label: "القنوات الاجتماعية", required: false, hint: "روابط حساباتك المعتمدة فقط." },
  { key: "operations", label: "التشغيل", required: false, hint: "إشعارات الطلبات وسلوك المخزون وأوقات العمل." },
];

/** يقيّم اكتمال كل خطوة من البيانات الفعلية، لا من مجرد الضغط على حفظ. */
function stepDone(key: StepKey, data: SettingsPayload): boolean {
  const s = data.settings;
  switch (key) {
    case "identity":
      return Boolean(s.identity?.nameAr);
    case "contact":
      return Boolean(s.contact?.whatsapp);
    case "commerce":
      return Boolean(s.commerce?.currencyDisplay);
    case "delivery":
      return data.deliveryZones.some((z) => z.enabled && z.feeMru !== null);
    case "payments":
      return data.paymentMethods.some((m) => m.enabled);
    case "policies":
      return Boolean(s.policies?.authenticity || s.policies?.returns);
    case "social":
    case "operations":
      return data.setupProgress.find((p) => p.key === key)?.completed ?? false;
  }
}

export default function SetupWizardPage() {
  const { data, error, loading, reload } = useAdminData<SettingsPayload>("/api/v1/admin/settings");
  const toast = useToast();
  const [active, setActive] = useState<StepKey>("identity");

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  const doneMap = Object.fromEntries(STEPS.map((s) => [s.key, stepDone(s.key, data)])) as Record<StepKey, boolean>;
  const doneCount = STEPS.filter((s) => doneMap[s.key]).length;
  const percent = Math.round((doneCount / STEPS.length) * 100);
  const step = STEPS.find((s) => s.key === active)!;

  /* بعد كل حفظ: أعد التحميل وسجّل حالة الخطوة في قاعدة البيانات */
  const afterSave = async () => {
    const fresh = await api<SettingsPayload>("/api/v1/admin/settings");
    for (const s of STEPS) {
      const completed = stepDone(s.key, fresh);
      const stored = fresh.setupProgress.find((p) => p.key === s.key)?.completed ?? false;
      if (completed !== stored && (s.key !== "social" && s.key !== "operations")) {
        await api("/api/v1/admin/setup/step", { method: "PUT", body: { key: s.key, completed } }).catch(() => undefined);
      }
    }
    reload();
  };

  const markStepSaved = async (key: StepKey) => {
    await api("/api/v1/admin/setup/step", { method: "PUT", body: { key, completed: true } }).catch(() => undefined);
    await afterSave();
    toast.push("سُجّلت الخطوة كمكتملة.");
  };

  return (
    <>
      <header className="manage-head">
        <div>
          <span>المتجر</span>
          <h1>معالج إعداد المتجر</h1>
        </div>
      </header>

      <div className="wizard-progress">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <b>
            الاكتمال: <span className="num">{percent}%</span> ({doneCount}/{STEPS.length})
          </b>
          <span style={{ color: "var(--silver)", fontSize: ".78rem" }}>يُحفظ تقدمك تلقائيًا ويمكنك العودة في أي وقت.</span>
        </div>
        <div className="bar">
          <i style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s) => (
          <button key={s.key} className={active === s.key ? "active" : ""} data-done={doneMap[s.key] || undefined} onClick={() => setActive(s.key)}>
            {s.label}
            {s.required ? "" : " (اختياري)"}
          </button>
        ))}
      </div>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>{step.label}</h2>
            <p>{step.hint}</p>
          </div>
        </div>
        {active === "identity" && <IdentityForm initial={data.settings.identity ?? {}} onSaved={afterSave} />}
        {active === "contact" && <ContactForm initial={data.settings.contact ?? {}} onSaved={afterSave} />}
        {active === "commerce" && <CommerceForm initial={data.settings.commerce ?? {}} onSaved={afterSave} />}
        {active === "delivery" && <DeliveryZonesEditor zones={data.deliveryZones} onSaved={afterSave} />}
        {active === "payments" && <PaymentMethodsEditor methods={data.paymentMethods} onSaved={afterSave} />}
        {active === "policies" && <PoliciesForm initial={data.settings.policies ?? {}} onSaved={afterSave} />}
        {active === "social" && (
          <>
            <SocialForm initial={data.settings.social ?? {}} onSaved={afterSave} />
            <div className="manage-form" style={{ paddingTop: 0 }}>
              <button className="btn btn-ghost" onClick={() => markStepSaved("social")}>
                اعتماد هذه الخطوة كمكتملة
              </button>
            </div>
          </>
        )}
        {active === "operations" && (
          <>
            <OperationsForm initial={data.settings.operations ?? {}} onSaved={afterSave} />
            <div className="manage-form" style={{ paddingTop: 0 }}>
              <button className="btn btn-ghost" onClick={() => markStepSaved("operations")}>
                اعتماد هذه الخطوة كمكتملة
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
