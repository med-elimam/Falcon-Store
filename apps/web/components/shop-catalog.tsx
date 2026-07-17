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
  const categoryParam = params.get("category");

  // Filter States
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState<string>(categoryParam ?? "all");
  const [family, setFamily] = useState<Family | "all">(isFamily(familyParam) ? familyParam : "all");
  const [time, setTime] = useState<TimeTag | "all">(isTime(timeParam) ? timeParam : "all");
  const [gender, setGender] = useState("all");
  const [decantOnly, setDecantOnly] = useState(params.get("size") === "10ml");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const brands = [...new Set(products.map((p) => p.brandName).filter(Boolean))];

  // Determine Max Price from Catalog
  const maxProductPrice = useMemo(() => {
    return products.reduce((max, p) => {
      const price = p.startingPriceMru ?? 0;
      return price > max ? price : max;
    }, 1000);
  }, [products]);

  const [priceRange, setPriceRange] = useState(maxProductPrice);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => {
          const needle = query.toLocaleLowerCase();
          return (
            (!needle || `${p.nameAr} ${p.nameFr ?? ""} ${p.brandName}`.toLocaleLowerCase().includes(needle)) &&
            (brand === "all" || p.brandName === brand) &&
            (category === "all" || p.categorySlug === category) &&
            (family === "all" || p.families.includes(family)) &&
            (time === "all" || p.times.includes(time)) &&
            (gender === "all" || p.gender === gender) &&
            (!p.startingPriceMru || p.startingPriceMru <= priceRange) &&
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
    [products, query, brand, category, family, time, gender, priceRange, decantOnly, inStockOnly, sort]
  );

  // Grammatically correct Arabic count label
  const countLabel = useMemo(() => {
    const count = filtered.length;
    if (inStockOnly) {
      if (count === 0) return "لا توجد عطور متوفرة";
      if (count === 1) return "عطر واحد متوفر";
      if (count === 2) return "عطران متوفران";
      if (count >= 3 && count <= 10) return `${count} عطور متوفرة`;
      return `${count} عطر متوفر`;
    } else {
      if (count === 0) return "لا توجد عطور";
      if (count === 1) return "عطر واحد";
      if (count === 2) return "عطران";
      if (count >= 3 && count <= 10) return `${count} عطور`;
      return `${count} عطر`;
    }
  }, [filtered.length, inStockOnly]);

  // Grammatically correct Arabic matching count label for the drawer header
  const matchingCountLabel = useMemo(() => {
    const count = filtered.length;
    if (count === 0) return "لا توجد عطور مطابقة";
    if (count === 1) return "عطر واحد مطابق";
    if (count === 2) return "عطران مطبقان";
    if (count >= 3 && count <= 10) return `${count} عطور مطابقة`;
    return `${count} عطرًا مطابقًا`;
  }, [filtered.length]);

  const renderFiltersContent = () => (
    <>
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
        <label htmlFor="category">الفئة</label>
        <select id="category" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">جميع الفئات</option>
          <option value="niche">عطور نيش</option>
          <option value="designer">عطور ديزاينر</option>
        </select>
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
        <label htmlFor="gender">الجنس</label>
        <select id="gender" className="field" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="all">جميع الأنواع</option>
          <option value="رجالي">رجالي</option>
          <option value="نسائي">نسائي</option>
          <option value="للجنسين">للجنسين</option>
        </select>
      </div>
      <div className="filter-block">
        <label htmlFor="priceRange">الحد الأقصى للسعر: <span className="num">{priceRange} MRU</span></label>
        <input
          id="priceRange"
          type="range"
          min="0"
          max={maxProductPrice}
          step="100"
          value={priceRange}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--crimson)" }}
        />
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
          setCategory("all");
          setFamily("all");
          setTime("all");
          setGender("all");
          setPriceRange(maxProductPrice);
          setDecantOnly(false);
          setInStockOnly(false);
        }}
      >
        مسح الفلاتر
      </button>
    </>
  );

  return (
    <div className="shop-layout">
      {/* Desktop Sidebar Filters */}
      <aside className="filters" aria-label="فلاتر العطور">
        {renderFiltersContent()}
      </aside>

      {/* Mobile Drawer (Bottom Sheet) */}
      <div
        className={`mobile-filters-scrim ${isDrawerOpen ? "open" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <div className={`mobile-filters-drawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h3>{matchingCountLabel}</h3>
          <button type="button" className="drawer-close" onClick={() => setIsDrawerOpen(false)}>
            &times;
          </button>
        </div>
        <div className="drawer-body">
          {renderFiltersContent()}
        </div>
      </div>

      <div className="catalog">
        <div className="catalog-toolbar">
          <span>{countLabel}</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="mobile-filter-trigger-btn"
              onClick={() => setIsDrawerOpen(true)}
            >
              الفلترة والترتيب
            </button>
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
