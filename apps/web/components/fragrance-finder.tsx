"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Family, ProductCardDTO, TimeTag } from "@falcon/shared";
import { FAMILY_LABELS, TIME_LABELS } from "@falcon/shared";
import { ArrowLeft } from "./icons";

type FinderChoice = Family | TimeTag;

function FinderChoiceIcon({ choice }: { choice: FinderChoice }) {
  const common = {
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (choice === "fresh") return <svg {...common}><circle cx="14" cy="17" r="8" /><path d="M14 9v16M6 17h16M8.5 11.5l11 11M19.5 11.5l-11 11M22 8c2.8-2.5 5.5-2.2 7-1-1.4 2.9-3.8 4.1-7 3" /></svg>;
  if (choice === "woody") return <svg {...common}><circle cx="16" cy="16" r="11" /><circle cx="16" cy="16" r="7" /><path d="M16 5c-2 4-1 7 1.2 9.2 2.5 2.5 2.4 6.1.8 9.8M7 11c3 1 5 3.2 5 6.2 0 2.2-1 4.2-2.6 5.6" /></svg>;
  if (choice === "sweet") return <svg {...common}><path d="m10 11-6-3 2 7-2 7 6-3M22 11l6-3-2 7 2 7-6-3" /><rect x="10" y="9" width="12" height="14" rx="5" /><path d="m13 13 6 6m0-6-6 6" /></svg>;
  if (choice === "leather") return <svg {...common}><path d="M9 5c2.2 2 4.4 2.8 7 2.8S20.8 7 23 5l4 6-3 4 1 9-9 3-9-3 1-9-3-4 4-6Z" /><path d="M10 12c3.8 2 8.2 2 12 0M10 21c4-1.8 8-1.8 12 0" /></svg>;
  if (choice === "fruity") return <svg {...common}><circle cx="13" cy="13" r="4" /><circle cx="19" cy="13" r="4" /><circle cx="10" cy="18" r="4" /><circle cx="16" cy="18" r="4" /><circle cx="22" cy="18" r="4" /><circle cx="13" cy="23" r="4" /><circle cx="19" cy="23" r="4" /><path d="M16 9c0-3 2-5 5-6M17 7c3-1 5 0 6 2" /></svg>;
  if (choice === "oriental") return <svg {...common}><path d="M8 24h16M11 21h10M13 21v-8h6v8M12 13h8l-4-7-4 7Z" /><path d="M10 8c-2-2-2-4 0-6m12 6c2-2 2-4 0-6" /></svg>;
  if (choice === "day") return <svg {...common}><circle cx="16" cy="16" r="6" /><path d="M16 3v5m0 16v5M3 16h5m16 0h5M7 7l3.5 3.5m11 11L25 25m0-18-3.5 3.5m-11 11L7 25" /></svg>;
  if (choice === "evening") return <svg {...common}><path d="M24.5 21.5A11 11 0 0 1 11 7.5 11 11 0 1 0 24.5 21.5Z" /><path d="m23 6 .7 1.7L25.5 8l-1.8.7L23 10.5l-.7-1.8L20.5 8l1.8-.3L23 6Z" /></svg>;
  if (choice === "work") return <svg {...common}><rect x="5" y="7" width="22" height="20" rx="3" /><path d="M10 4v6m12-6v6M5 13h22M10 18h3m4 0h3m4 0h1M10 22h3m4 0h3" /></svg>;
  return <svg {...common}><path d="M16 4v7m0 10v7M4 16h7m10 0h7M7.5 7.5l5 5m7 7 5 5m0-17-5 5m-7 7-5 5" /><circle cx="16" cy="16" r="3" /></svg>;
}

/* أداة اختيار العطر: تجمع تفضيل الزائر ثم تنقله إلى صفحة العطور بنتائج مفلترة
   مسبقًا — لا تعرض بطاقات منتجات داخل الرئيسية (تفاديًا للتكرار وطول الصفحة). */
export function FragranceFinder({ products }: { products: ProductCardDTO[] }) {
  const router = useRouter();
  const [family, setFamily] = useState<Family | "">("");
  const [time, setTime] = useState<TimeTag | "">("");

  /* لا نعرض إلا العائلات التي يوجد لها عطر فعلاً */
  const availableFamilies = useMemo(() => {
    const set = new Set<Family>();
    for (const p of products) for (const f of p.families) set.add(f);
    return (Object.keys(FAMILY_LABELS) as Family[]).filter((f) => set.has(f));
  }, [products]);

  if (availableFamilies.length === 0) return null;

  const goToResults = () => {
    const params = new URLSearchParams();
    if (family) params.set("family", family);
    if (time) params.set("time", time);
    router.push(params.toString() ? `/shop?${params.toString()}` : "/shop");
  };

  return (
    <section id="finder" className="finder-section section-pad">
      <div className="shell">
        <div className="finder-head">
          <span className="section-kicker">اختيار سريع</span>
          <h2>اعثر على عطرك المناسب</h2>
          <p>اختر نوع الرائحة ووقت الاستخدام، وسنعرض لك العطور الأقرب إلى ذوقك.</p>
        </div>
        <div className="finder-controls">
          <fieldset>
            <legend>نوع الرائحة</legend>
            <div className="choice-row family-choices">
              {availableFamilies.map((key) => (
                <button
                  type="button"
                  key={key}
                  className={family === key ? "selected" : ""}
                  aria-pressed={family === key}
                  onClick={() => setFamily(family === key ? "" : key)}
                >
                  <FinderChoiceIcon choice={key} />
                  {FAMILY_LABELS[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>متى ستستخدمه؟</legend>
            <div className="choice-row time-choices">
              {Object.entries(TIME_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={time === key ? "selected" : ""}
                  aria-pressed={time === key}
                  onClick={() => setTime(time === (key as TimeTag) ? "" : (key as TimeTag))}
                >
                  <FinderChoiceIcon choice={key as TimeTag} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <button type="button" className="btn btn-crimson finder-submit" onClick={goToResults}>
          عرض النتائج <ArrowLeft />
        </button>
      </div>
    </section>
  );
}
