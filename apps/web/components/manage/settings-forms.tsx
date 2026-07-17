"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { formatMRU } from "@/lib/format";
import { useToast } from "./ui";

/* ── نماذج مجموعات الإعدادات — تُستخدم في صفحة الإعدادات وفي معالج الإعداد ── */

export interface SettingsPayload {
  settings: Record<string, Record<string, unknown>>;
  paymentMethods: PaymentMethod[];
  deliveryZones: DeliveryZone[];
  setupProgress: { key: string; completed: boolean }[];
}

export interface PaymentMethod {
  id: string;
  key: string;
  labelAr: string;
  instructionsAr: string | null;
  enabled: boolean;
}

export interface DeliveryZone {
  id: string;
  nameAr: string;
  feeMru: number | null;
  etaAr: string | null;
  enabled: boolean;
  sortOrder: number;
}

export function useGroupSaver(onSaved?: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (group: string, value: Record<string, unknown>) => {
    setBusy(true);
    try {
      await api(`/api/v1/admin/settings/${group}`, { method: "PUT", body: value });
      toast.push("حُفظت الإعدادات.");
      onSaved?.();
      return true;
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "تعذر الحفظ.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { save, busy };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function IdentityForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    nameAr: str(initial.nameAr),
    nameLatin: str(initial.nameLatin),
    description: str(initial.description),
    logoUrl: str(initial.logoUrl),
  });
  return (
    <div className="manage-form">
      <div className="row">
        <label>
          الاسم الرسمي بالعربية
          <input className="field" value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} />
        </label>
        <label>
          الاسم اللاتيني (فرنسي/إنجليزي)
          <input className="field" dir="ltr" value={f.nameLatin} onChange={(e) => setF({ ...f, nameLatin: e.target.value })} />
        </label>
      </div>
      <label>
        وصف قصير للمتجر
        <textarea className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={400} />
      </label>
      <label>
        رابط الشعار (ارفعه من صفحة الوسائط ثم الصق الرابط)
        <input className="field" dir="ltr" value={f.logoUrl} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} />
      </label>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("identity", {
              nameAr: f.nameAr.trim() || null,
              nameLatin: f.nameLatin.trim() || null,
              description: f.description.trim() || null,
              logoUrl: f.logoUrl.trim() || null,
            })
          }
        >
          حفظ الهوية
        </button>
      </div>
    </div>
  );
}

export function ContactForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    whatsapp: str(initial.whatsapp),
    phone: str(initial.phone),
    email: str(initial.email),
    address: str(initial.address),
    mapUrl: str(initial.mapUrl),
  });
  return (
    <div className="manage-form">
      <div className="row">
        <label>
          رقم واتساب (بالصيغة الدولية، مثل 2224xxxxxxx)
          <input className="field num" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
        </label>
        <label>
          رقم الهاتف
          <input className="field num" dir="ltr" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </label>
        <label>
          البريد الإلكتروني
          <input className="field" dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </label>
      </div>
      <label>
        العنوان الفعلي للمتجر
        <input className="field" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </label>
      <label>
        رابط الموقع على الخريطة
        <input className="field" dir="ltr" value={f.mapUrl} onChange={(e) => setF({ ...f, mapUrl: e.target.value })} />
      </label>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("contact", {
              whatsapp: f.whatsapp.trim() || null,
              phone: f.phone.trim() || null,
              email: f.email.trim() || null,
              address: f.address.trim() || null,
              mapUrl: f.mapUrl.trim() || null,
            })
          }
        >
          حفظ بيانات التواصل
        </button>
      </div>
    </div>
  );
}

export function CommerceForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    currencyDisplay: (initial.currencyDisplay as string) === "ouguiya_ancienne" ? "ouguiya_ancienne" : "mru",
    pickupAvailable: Boolean(initial.pickupAvailable),
    codNote: str(initial.codNote),
  });
  return (
    <div className="manage-form">
      <label>
        عرض الأسعار
        <select className="field" value={f.currencyDisplay} onChange={(e) => setF({ ...f, currencyDisplay: e.target.value })}>
          <option value="mru">الأوقية الجديدة (MRU)</option>
          <option value="ouguiya_ancienne">الأوقية القديمة (×10)</option>
        </select>
      </label>
      <label className="inline-check">
        <input type="checkbox" checked={f.pickupAvailable} onChange={(e) => setF({ ...f, pickupAvailable: e.target.checked })} />
        الاستلام من المتجر متاح
      </label>
      <label>
        قواعد الدفع عند الاستلام (اختياري)
        <textarea className="field" value={f.codNote} onChange={(e) => setF({ ...f, codNote: e.target.value })} maxLength={300} />
      </label>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("commerce", {
              currencyDisplay: f.currencyDisplay,
              pickupAvailable: f.pickupAvailable,
              codNote: f.codNote.trim() || null,
            })
          }
        >
          حفظ إعدادات البيع
        </button>
      </div>
    </div>
  );
}

export function PoliciesForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    authenticity: str(initial.authenticity),
    returns: str(initial.returns),
    privacy: str(initial.privacy),
    terms: str(initial.terms),
  });
  return (
    <div className="manage-form">
      <label>
        نص الأصالة (يظهر في قسم «الأصالة» بعد اعتمادك له — يبقى القسم مخفيًا إن تُرك فارغًا)
        <textarea className="field" value={f.authenticity} onChange={(e) => setF({ ...f, authenticity: e.target.value })} maxLength={2000} />
      </label>
      <label>
        سياسة الاستبدال والإرجاع
        <textarea className="field" value={f.returns} onChange={(e) => setF({ ...f, returns: e.target.value })} maxLength={4000} />
      </label>
      <label>
        سياسة الخصوصية
        <textarea className="field" value={f.privacy} onChange={(e) => setF({ ...f, privacy: e.target.value })} maxLength={4000} />
      </label>
      <label>
        شروط البيع
        <textarea className="field" value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} maxLength={4000} />
      </label>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("policies", {
              authenticity: f.authenticity.trim() || null,
              returns: f.returns.trim() || null,
              privacy: f.privacy.trim() || null,
              terms: f.terms.trim() || null,
            })
          }
        >
          حفظ السياسات
        </button>
      </div>
    </div>
  );
}

export function SocialForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    instagram: str(initial.instagram),
    facebook: str(initial.facebook),
    tiktok: str(initial.tiktok),
    other: str(initial.other),
  });
  return (
    <div className="manage-form">
      <div className="row">
        <label>
          Instagram (رابط كامل)
          <input className="field" dir="ltr" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} />
        </label>
        <label>
          Facebook
          <input className="field" dir="ltr" value={f.facebook} onChange={(e) => setF({ ...f, facebook: e.target.value })} />
        </label>
        <label>
          TikTok
          <input className="field" dir="ltr" value={f.tiktok} onChange={(e) => setF({ ...f, tiktok: e.target.value })} />
        </label>
        <label>
          قناة أخرى
          <input className="field" dir="ltr" value={f.other} onChange={(e) => setF({ ...f, other: e.target.value })} />
        </label>
      </div>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("social", {
              instagram: f.instagram.trim() || null,
              facebook: f.facebook.trim() || null,
              tiktok: f.tiktok.trim() || null,
              other: f.other.trim() || null,
            })
          }
        >
          حفظ القنوات
        </button>
      </div>
    </div>
  );
}

export function OperationsForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const [f, setF] = useState({
    orderNotifyWhatsapp: str(initial.orderNotifyWhatsapp),
    lowStockThreshold: String(typeof initial.lowStockThreshold === "number" ? initial.lowStockThreshold : 3),
    hoursAr: str(initial.hoursAr),
  });
  return (
    <div className="manage-form">
      <div className="row">
        <label>
          رقم واتساب لاستقبال إشعارات الطلبات
          <input
            className="field num"
            dir="ltr"
            inputMode="tel"
            value={f.orderNotifyWhatsapp}
            onChange={(e) => setF({ ...f, orderNotifyWhatsapp: e.target.value })}
          />
        </label>
        <div className="setup-callout">
          <div>
            <b>المخزون كمي دائمًا</b>
            <p>تُخصم الكمية تلقائيًا عند كل طلب وتُعاد عند الإلغاء.</p>
          </div>
        </div>
        <label>
          حد تنبيه انخفاض المخزون
          <input
            className="field num"
            dir="ltr"
            inputMode="numeric"
            value={f.lowStockThreshold}
            onChange={(e) => setF({ ...f, lowStockThreshold: e.target.value.replace(/\D/g, "") })}
          />
        </label>
      </div>
      <label>
        أوقات العمل (كما ستظهر للزبائن)
        <input className="field" value={f.hoursAr} onChange={(e) => setF({ ...f, hoursAr: e.target.value })} maxLength={300} />
      </label>
      <div className="manage-form-foot">
        <button
          className="btn btn-crimson"
          disabled={busy}
          onClick={() =>
            save("operations", {
              orderNotifyWhatsapp: f.orderNotifyWhatsapp.trim() || null,
              defaultStockBehavior: "deduct",
              lowStockThreshold: Number(f.lowStockThreshold || "3"),
              hoursAr: f.hoursAr.trim() || null,
            })
          }
        >
          حفظ إعدادات التشغيل
        </button>
      </div>
    </div>
  );
}

const THEME_CHOICES = [
  {
    value: "light",
    label: "فاتح — بسيط ومريح للعين",
    hint: "خلفية فاتحة ونصوص داكنة، مثل المتاجر البسيطة. يُنصح به للقراءة النهارية.",
    swatch: { bg: "#f6f1f2", ink: "#2b2224", accent: "#a01f35" },
  },
  {
    value: "dark",
    label: "داكن — فخم وسينمائي",
    hint: "خلفية داكنة تُبرز صور العطور والأنيميشن. الطابع الأصلي للمتجر.",
    swatch: { bg: "#0b090a", ink: "#f3efe8", accent: "#c81743" },
  },
  {
    value: "system",
    label: "تلقائي — حسب جهاز الزائر",
    hint: "يتبع إعداد نظام الزائر (فاتح نهاراً أو داكن ليلاً).",
    swatch: { bg: "linear-gradient(135deg, #f6f1f2 50%, #0b090a 50%)", ink: "#8a8286", accent: "#b3183c" },
  },
] as const;

export function AppearanceForm({ initial, onSaved }: { initial: Record<string, unknown>; onSaved?: () => void }) {
  const { save, busy } = useGroupSaver(onSaved);
  const stored = initial.defaultTheme;
  const [theme, setTheme] = useState<string>(
    stored === "dark" || stored === "system" ? (stored as string) : "light"
  );
  return (
    <div className="manage-form">
      <div className="setup-callout">
        <div>
          <b>المظهر الافتراضي للموقع</b>
          <p>هذا ما يراه الزائر أول مرة في كل الصفحات وخاصة الواجهة الرئيسية. يبقى بإمكان الزائر تغييره من زر المظهر أعلى الموقع، ويُحفظ اختياره على جهازه.</p>
        </div>
      </div>
      {THEME_CHOICES.map((c) => (
        <label
          key={c.value}
          className="inline-check"
          style={{
            alignItems: "flex-start",
            gap: 14,
            padding: "14px 16px",
            border: `1px solid ${theme === c.value ? "var(--accent-border)" : "var(--control-border)"}`,
            background: theme === c.value ? "var(--accent-soft)" : "transparent",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="defaultTheme"
            checked={theme === c.value}
            onChange={() => setTheme(c.value)}
          />
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 54,
              height: 38,
              borderRadius: 6,
              border: "1px solid var(--control-border)",
              background: c.swatch.bg,
              display: "grid",
              placeItems: "center",
            }}
          >
            <span style={{ width: 22, height: 6, borderRadius: 3, background: c.swatch.accent, boxShadow: `0 -9px 0 ${c.swatch.ink}` }} />
          </span>
          <span>
            <b style={{ display: "block", marginBottom: 4 }}>{c.label}</b>
            <span style={{ fontSize: ".82rem", color: "var(--muted)" }}>{c.hint}</span>
          </span>
        </label>
      ))}
      <div className="manage-form-foot">
        <button className="btn btn-crimson" disabled={busy} onClick={() => save("appearance", { defaultTheme: theme })}>
          حفظ المظهر
        </button>
      </div>
    </div>
  );
}

export function PaymentMethodsEditor({ methods, onSaved }: { methods: PaymentMethod[]; onSaved: () => void }) {
  const toast = useToast();
  return (
    <div className="manage-form">
      {methods.map((m) => (
        <PaymentRow key={m.id} method={m} onSaved={onSaved} toast={toast} />
      ))}
    </div>
  );
}

function PaymentRow({
  method,
  onSaved,
  toast,
}: {
  method: PaymentMethod;
  onSaved: () => void;
  toast: { push: (m: string, t?: "ok" | "error") => void };
}) {
  const [enabled, setEnabled] = useState(method.enabled);
  const [instructions, setInstructions] = useState(method.instructionsAr ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="variant-row" style={{ gridTemplateColumns: "110px auto 1fr auto" }}>
      <b>{method.labelAr}</b>
      <label className="inline-check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        مفعّل
      </label>
      <input
        className="field"
        placeholder="تعليمات تظهر للزبون (اختياري)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        maxLength={500}
      />
      <button
        className="btn btn-ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/v1/admin/settings/payment-methods/${method.id}`, {
              method: "PATCH",
              body: { enabled, instructionsAr: instructions.trim() || null },
            });
            toast.push("حُفظت طريقة الدفع.");
            onSaved();
          } catch (err) {
            toast.push(err instanceof ApiError ? err.message : "تعذر الحفظ.", "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        حفظ
      </button>
    </div>
  );
}

export function DeliveryZonesEditor({ zones, onSaved }: { zones: DeliveryZone[]; onSaved: () => void }) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="manage-form">
      {zones.map((z) => (
        <ZoneRow key={z.id} zone={z} onSaved={onSaved} toast={toast} />
      ))}
      <div className="variant-row" style={{ gridTemplateColumns: "1fr auto" }}>
        <input className="field" placeholder="منطقة جديدة (الاسم بالعربية)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button
          className="btn btn-ghost"
          disabled={busy || !newName.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await api("/api/v1/admin/settings/delivery-zones", {
                method: "POST",
                body: { nameAr: newName.trim(), feeMru: null, enabled: false, sortOrder: zones.length },
              });
              setNewName("");
              toast.push("أُضيفت المنطقة. حدد رسومها ثم فعّلها.");
              onSaved();
            } catch (err) {
              toast.push(err instanceof ApiError ? err.message : "تعذرت الإضافة.", "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          إضافة
        </button>
      </div>
    </div>
  );
}

function ZoneRow({
  zone,
  onSaved,
  toast,
}: {
  zone: DeliveryZone;
  onSaved: () => void;
  toast: { push: (m: string, t?: "ok" | "error") => void };
}) {
  const [enabled, setEnabled] = useState(zone.enabled);
  const [fee, setFee] = useState(zone.feeMru?.toString() ?? "");
  const [eta, setEta] = useState(zone.etaAr ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="variant-row" style={{ gridTemplateColumns: "130px auto 1fr 1fr auto" }}>
      <b>{zone.nameAr}</b>
      <label className="inline-check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        مفعّلة
      </label>
      <input
        className="field num"
        dir="ltr"
        inputMode="numeric"
        placeholder="رسوم التوصيل MRU"
        value={fee}
        onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
      />
      <input className="field" placeholder="المدة المتوقعة (اختياري)" value={eta} onChange={(e) => setEta(e.target.value)} maxLength={120} />
      <button
        className="btn btn-ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/v1/admin/settings/delivery-zones/${zone.id}`, {
              method: "PATCH",
              body: { enabled, feeMru: fee.trim() === "" ? null : Number(fee), etaAr: eta.trim() || null },
            });
            toast.push(`حُفظت «${zone.nameAr}»${enabled && fee ? ` — ${formatMRU(Number(fee))}` : ""}.`);
            onSaved();
          } catch (err) {
            toast.push(err instanceof ApiError ? err.message : "تعذر الحفظ.", "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        حفظ
      </button>
    </div>
  );
}
