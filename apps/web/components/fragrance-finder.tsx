"use client";

import { useMemo, useState } from "react";
import type { CurrencyDisplay, Family, ProductCardDTO, TimeTag } from "@falcon/shared";
import { FAMILY_LABELS, TIME_LABELS } from "@falcon/shared";
import { recommend } from "@/lib/recommend";
import { ProductCard } from "./product-card";

export function FragranceFinder({
  products,
  display,
}: {
  products: ProductCardDTO[];
  display: CurrencyDisplay;
}) {
  const [family, setFamily] = useState<Family>("fresh");
  const [time, setTime] = useState<TimeTag>("day");
  const results = useMemo(() => recommend(products, family, time, 3), [products, family, time]);

  return (
    <section id="finder" className="finder-section section-pad">
      <div className="shell">
        <div className="finder-head">
          <div>
            <span className="section-kicker">دليلك الشخصي</span>
            <h2>أي عطر يشبهك؟</h2>
          </div>
          <p>اختر الطابع والوقت، وسنرشح لك أقرب الروائح من المجموعة المعروضة حاليًا.</p>
        </div>
        <div className="finder-controls">
          <fieldset>
            <legend>الطابع</legend>
            <div className="choice-row">
              {Object.entries(FAMILY_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={family === key ? "selected" : ""}
                  onClick={() => setFamily(key as Family)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>وقت الاستخدام</legend>
            <div className="choice-row">
              {Object.entries(TIME_LABELS).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  className={time === key ? "selected" : ""}
                  onClick={() => setTime(key as TimeTag)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="finder-result-label">
          <span>اقتراحات الخزنة</span>
          <b className="num">{String(results.length).padStart(2, "0")}</b>
        </div>
        {results.length ? (
          <div className="product-grid">
            {results.map((product) => (
              <ProductCard key={product.slug} product={product} display={display} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <strong>لا يوجد ترشيح مطابق لهذا المزيج بعد</strong>
            <p>جرّب طابعًا أو وقتًا مختلفًا، أو تصفح المجموعة كاملة.</p>
          </div>
        )}
      </div>
    </section>
  );
}
