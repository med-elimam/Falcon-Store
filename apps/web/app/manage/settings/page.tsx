"use client";

import { useState } from "react";
import { ErrorBlock, LoadingBlock, useAdminData } from "@/components/manage/ui";
import {
  AppearanceForm,
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

const TABS = [
  { key: "identity", label: "الهوية" },
  { key: "appearance", label: "المظهر" },
  { key: "contact", label: "التواصل" },
  { key: "commerce", label: "البيع والأسعار" },
  { key: "delivery", label: "مناطق التوصيل" },
  { key: "payments", label: "طرق الدفع" },
  { key: "policies", label: "السياسات" },
  { key: "social", label: "القنوات الاجتماعية" },
  { key: "operations", label: "التشغيل" },
] as const;

export default function SettingsPage() {
  const { data, error, loading, reload } = useAdminData<SettingsPayload>("/api/v1/admin/settings");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("identity");

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>المتجر</span>
          <h1>إعدادات المتجر</h1>
        </div>
      </header>
      <div className="wizard-steps" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <section className="manage-card">
        {tab === "identity" && <IdentityForm initial={data.settings.identity ?? {}} onSaved={reload} />}
        {tab === "appearance" && <AppearanceForm initial={data.settings.appearance ?? {}} onSaved={reload} />}
        {tab === "contact" && <ContactForm initial={data.settings.contact ?? {}} onSaved={reload} />}
        {tab === "commerce" && <CommerceForm initial={data.settings.commerce ?? {}} onSaved={reload} />}
        {tab === "delivery" && <DeliveryZonesEditor zones={data.deliveryZones} onSaved={reload} />}
        {tab === "payments" && <PaymentMethodsEditor methods={data.paymentMethods} onSaved={reload} />}
        {tab === "policies" && <PoliciesForm initial={data.settings.policies ?? {}} onSaved={reload} />}
        {tab === "social" && <SocialForm initial={data.settings.social ?? {}} onSaved={reload} />}
        {tab === "operations" && <OperationsForm initial={data.settings.operations ?? {}} onSaved={reload} />}
      </section>
    </>
  );
}
