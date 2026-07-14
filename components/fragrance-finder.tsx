"use client";

import { useMemo, useState } from "react";
import type { Family, TimeTag } from "@/lib/products";
import { FAMILY_LABELS, TIME_LABELS, recommend } from "@/lib/products";
import { ProductCard } from "./product-card";

export function FragranceFinder() {
  const [family, setFamily] = useState<Family>("fresh");
  const [time, setTime] = useState<TimeTag>("day");
  const results = useMemo(() => recommend(family, time, 3), [family, time]);
  return (
    <section id="finder" className="finder-section section-pad">
      <div className="shell">
        <div className="finder-head"><div><span className="section-kicker">دليلك الشخصي</span><h2>أي عطر يشبهك؟</h2></div><p>اختر الطابع والوقت، وسنرشح لك أقرب ثلاث روائح من المجموعة الحالية.</p></div>
        <div className="finder-controls">
          <fieldset><legend>الطابع</legend><div className="choice-row">{Object.entries(FAMILY_LABELS).map(([key, label]) => <button type="button" key={key} className={family === key ? "selected" : ""} onClick={() => setFamily(key as Family)}>{label}</button>)}</div></fieldset>
          <fieldset><legend>وقت الاستخدام</legend><div className="choice-row">{Object.entries(TIME_LABELS).map(([key, label]) => <button type="button" key={key} className={time === key ? "selected" : ""} onClick={() => setTime(key as TimeTag)}>{label}</button>)}</div></fieldset>
        </div>
        <div className="finder-result-label"><span>اقتراحات الخزنة</span><b className="num">0{results.length}</b></div>
        <div className="product-grid">{results.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </div>
    </section>
  );
}
