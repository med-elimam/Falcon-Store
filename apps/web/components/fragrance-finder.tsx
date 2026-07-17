"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Family, ProductCardDTO, TimeTag } from "@falcon/shared";
import { FAMILY_LABELS, TIME_LABELS } from "@falcon/shared";
import { ArrowLeft } from "./icons";

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
          <div>
            <span className="section-kicker">اختيار سريع</span>
            <h2>اعثر على عطرك المناسب</h2>
          </div>
          <p>اختر نوع الرائحة ووقت الاستخدام، وسنعرض لك العطور الأقرب إلى ذوقك.</p>
        </div>
        <div className="finder-controls">
          <fieldset>
            <legend>نوع الرائحة</legend>
            <div className="choice-row">
              {availableFamilies.map((key) => (
                <button
                  type="button"
                  key={key}
                  className={family === key ? "selected" : ""}
                  aria-pressed={family === key}
                  onClick={() => setFamily(family === key ? "" : key)}
                >
                  {FAMILY_LABELS[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>متى ستستخدمه؟</legend>
            <div className="choice-row">
              {Object.entries(TIME_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={time === key ? "selected" : ""}
                  aria-pressed={time === key}
                  onClick={() => setTime(time === (key as TimeTag) ? "" : (key as TimeTag))}
                >
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
