"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CurrencyDisplay, Family, ProductCardDTO, TimeTag } from "@falcon/shared";
import { FAMILY_LABELS, TIME_LABELS } from "@falcon/shared";
import { ProductCard } from "./product-card";

type Sort = "featured" | "low" | "high" | "name";

const isFamily = (v: string | null): v is Family => v !== null && v in FAMILY_LABELS;
const isTime = (v: string | null): v is TimeTag => v !== null && v in TIME_LABELS;

export function ShopCatalog({
  products,
  display,
}: {
  products: ProductCardDTO[];
  display: CurrencyDisplay;
}) {
  const params = useSearchParams();
  const familyParam = params.get("family");
  const timeParam = params.get("time");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [family, setFamily] = useState<Family | "all">(isFamily(familyParam) ? familyParam : "all");
  const [time, setTime] = useState<TimeTag | "all">(isTime(timeParam) ? timeParam : "all");
  const [decantOnly, setDecantOnly] = useState(params.get("size") === "10ml");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const brands = [...new Set(products.map((p) => p.brandName).filter(Boolean))];

  const filtered = useMemo(
    () =>
      products
        .filter((p) => {
          const needle = query.toLocaleLowerCase();
          return (
            (!needle || `${p.nameAr} ${p.nameFr ?? ""} ${p.brandName}`.toLocaleLowerCase().includes(needle)) &&
            (brand === "all" || p.brandName === brand) &&
            (family === "all" || p.families.includes(family)) &&
            (time === "all" || p.times.includes(time)) &&
            (!decantOnly || p.hasDecant) &&
            (!inStockOnly || p.inStock)
          );
        })
        .sort((a, b) => {
          if (sort === "low") return (a.startingPriceMru ?? Infinity) - (b.startingPriceMru ?? Infinity);
          if (sort === "high") return (b.startingPriceMru ?? -1) - (a.startingPriceMru ?? -1);
          if (sort === "name") return a.nameAr.localeCompare(b.nameAr, "ar");
          return Number(b.featured) - Number(a.featured);
        }),
    [products, query, brand, family, time, decantOnly, inStockOnly, sort]
  );

  return (
    <div className="shop-layout">
      <aside className="filters" aria-label="فلاتر العطور">
        <div className="filter-block">
          <label htmlFor="search">ابحث بالاسم أو العلامة</label>
          <input
            id="search"
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم العطر أو العلامة"
          />
        </div>
        <div className="filter-block">
          <label htmlFor="brand">العلامة</label>
          <select id="brand" className="field" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="all">جميع العلامات</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-block">
          <label htmlFor="family">العائلة العطرية</label>
          <select
            id="family"
            className="field"
            value={family}
            onChange={(e) => setFamily(e.target.value as Family | "all")}
          >
            <option value="all">جميع العائلات</option>
            {Object.entries(FAMILY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-block">
          <label htmlFor="time">وقت الاستخدام</label>
          <select
            id="time"
            className="field"
            value={time}
            onChange={(e) => setTime(e.target.value as TimeTag | "all")}
          >
            <option value="all">كل الأوقات</option>
            {Object.entries(TIME_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={decantOnly} onChange={(e) => setDecantOnly(e.target.checked)} />
          <span>متوفر بحجم 10ml</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          <span>متوفر الآن</span>
        </label>
        <button
          className="text-button"
          onClick={() => {
            setQuery("");
            setBrand("all");
            setFamily("all");
            setTime("all");
            setDecantOnly(false);
            setInStockOnly(false);
          }}
        >
          مسح الفلاتر
        </button>
      </aside>
      <div className="catalog">
        <div className="catalog-toolbar">
          <span>
            <b className="num">{filtered.length}</b> عطور متاحة
          </span>
          <label>
            ترتيب{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">المميزة أولاً</option>
              <option value="low">السعر من الأقل</option>
              <option value="high">السعر من الأعلى</option>
              <option value="name">الاسم</option>
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.slug} product={product} display={display} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <strong>لا توجد نتائج مطابقة</strong>
            <p>جرّب تغيير العلامة أو العائلة العطرية.</p>
          </div>
        )}
      </div>
    </div>
  );
}
