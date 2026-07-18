"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CurrencyDisplay, Family, ProductCardDTO, TimeTag } from "@falcon/shared";
import { FAMILY_LABELS, TIME_LABELS } from "@falcon/shared";
import { ProductCard } from "./product-card";
import { WhatsAppIcon } from "./icons";
import { waLink } from "@/lib/format";
import { usePublicSettings } from "./settings-context";

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
  const settings = usePublicSettings();

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

  // Pagination State
  const [pageSize, setPageSize] = useState(12);

  // Mobile Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const brands = useMemo(() => [...new Set(products.map((p) => p.brandName).filter(Boolean))], [products]);

  // Determine Max Price from Catalog
  const maxProductPrice = useMemo(() => {
    return products.reduce((max, p) => {
      const price = p.startingPriceMru ?? 0;
      return price > max ? price : max;
    }, 10000);
  }, [products]);

  const [priceRange, setPriceRange] = useState(maxProductPrice);

  // Load and Restore state / scroll from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("falcon-shop-filters");
      if (saved) {
        const data = JSON.parse(saved);
        /* استعادة الفلاتر بعد الترطيب مقصودة داخل effect لتفادي تعارض SSR/الترطيب */
        /* eslint-disable react-hooks/set-state-in-effect */
        if (data.query !== undefined) setQuery(data.query);
        if (data.brand !== undefined) setBrand(data.brand);
        if (data.category !== undefined) setCategory(data.category);
        if (data.family !== undefined) setFamily(data.family);
        if (data.time !== undefined) setTime(data.time);
        if (data.gender !== undefined) setGender(data.gender);
        if (data.decantOnly !== undefined) setDecantOnly(data.decantOnly);
        if (data.inStockOnly !== undefined) setInStockOnly(data.inStockOnly);
        if (data.sort !== undefined) setSort(data.sort);
        if (data.priceRange !== undefined) setPriceRange(data.priceRange);
        /* eslint-enable react-hooks/set-state-in-effect */
      }

      const savedScroll = sessionStorage.getItem("falcon-shop-scroll");
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo({ top: Number(savedScroll), behavior: "instant" as ScrollBehavior });
        }, 120);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save Filter States to sessionStorage
  useEffect(() => {
    try {
      const filters = { query, brand, category, family, time, gender, decantOnly, inStockOnly, sort, priceRange };
      sessionStorage.setItem("falcon-shop-filters", JSON.stringify(filters));
    } catch (e) {
      console.error(e);
    }
  }, [query, brand, category, family, time, gender, decantOnly, inStockOnly, sort, priceRange]);

  // Track Scroll Position
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("falcon-shop-scroll", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          // ALWAYS sort available (in-stock) products before out-of-stock
          if (a.inStock !== b.inStock) {
            return a.inStock ? -1 : 1;
          }
          if (sort === "low") return (a.startingPriceMru ?? Infinity) - (b.startingPriceMru ?? Infinity);
          if (sort === "high") return (b.startingPriceMru ?? -1) - (a.startingPriceMru ?? -1);
          if (sort === "name") return a.nameAr.localeCompare(b.nameAr, "ar");
          return Number(b.featured) - Number(a.featured);
        }),
    [products, query, brand, category, family, time, gender, priceRange, decantOnly, inStockOnly, sort]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (brand !== "all") count++;
    if (category !== "all") count++;
    if (family !== "all") count++;
    if (time !== "all") count++;
    if (gender !== "all") count++;
    if (priceRange !== maxProductPrice) count++;
    if (decantOnly) count++;
    if (inStockOnly) count++;
    return count;
  }, [query, brand, category, family, time, gender, priceRange, maxProductPrice, decantOnly, inStockOnly]);

  const nearestMatches = useMemo(() => {
    if (filtered.length > 0 || activeFiltersCount === 0) return [];

    return products
      .map((p) => {
        let score = 0;
        if (query.trim() && `${p.nameAr} ${p.nameFr ?? ""} ${p.brandName}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) score++;
        if (brand !== "all" && p.brandName === brand) score++;
        if (category !== "all" && p.categorySlug === category) score++;
        if (family !== "all" && p.families.includes(family)) score++;
        if (time !== "all" && p.times.includes(time)) score++;
        if (gender !== "all" && p.gender === gender) score++;
        if (priceRange !== maxProductPrice && p.startingPriceMru && p.startingPriceMru <= priceRange) score++;
        if (decantOnly && p.hasDecant) score++;
        if (inStockOnly && p.inStock) score++;
        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.product.inStock ? 1 : 0) - (a.product.inStock ? 1 : 0);
      })
      .map((item) => item.product)
      .slice(0, 4);
  }, [filtered.length, activeFiltersCount, products, query, brand, category, family, time, gender, priceRange, maxProductPrice, decantOnly, inStockOnly]);

  // Paginated view of the filtered results
  const paginatedProducts = useMemo(() => {
    return filtered.slice(0, pageSize);
  }, [filtered, pageSize]);

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
    if (count === 2) return "عطران مطابقان";
    if (count >= 3 && count <= 10) return `${count} عطور مطابقة`;
    return `${count} عطرًا مطابقًا`;
  }, [filtered.length]);

  const handleResetFilters = () => {
    setQuery("");
    setBrand("all");
    setCategory("all");
    setFamily("all");
    setTime("all");
    setGender("all");
    setPriceRange(maxProductPrice);
    setDecantOnly(false);
    setInStockOnly(false);
    setPageSize(12);
  };

  const renderFiltersContent = (ctx: string) => (
    <>
      <div className="filter-block">
        <label htmlFor={`search-${ctx}`}>ابحث بالاسم أو العلامة</label>
        <input
          id={`search-${ctx}`}
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اسم العطر أو العلامة"
        />
      </div>
      <div className="filter-block">
        <label htmlFor={`category-${ctx}`}>الفئة</label>
        <select id={`category-${ctx}`} className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">جميع الفئات</option>
          <option value="niche">عطور نيش</option>
          <option value="designer">عطور ديزاينر</option>
        </select>
      </div>
      <div className="filter-block">
        <label htmlFor={`brand-${ctx}`}>العلامة</label>
        <select id={`brand-${ctx}`} className="field" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">جميع العلامات</option>
          {brands.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-block">
        <label htmlFor={`gender-${ctx}`}>الجنس</label>
        <select id={`gender-${ctx}`} className="field" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="all">جميع الأنواع</option>
          <option value="رجالي">رجالي</option>
          <option value="نسائي">نسائي</option>
          <option value="للجنسين">للجنسين</option>
        </select>
      </div>
      <div className="filter-block">
        <label htmlFor={`priceRange-${ctx}`}>الحد الأقصى للسعر: <span className="num">{priceRange} MRU</span></label>
        <input
          id={`priceRange-${ctx}`}
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
        <label htmlFor={`family-${ctx}`}>العائلة العطرية</label>
        <select
          id={`family-${ctx}`}
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
        <label htmlFor={`time-${ctx}`}>وقت الاستخدام</label>
        <select
          id={`time-${ctx}`}
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
        type="button"
        onClick={handleResetFilters}
      >
        مسح الفلاتر
      </button>
    </>
  );

  return (
    <div className="shop-layout">
      {/* Desktop Sidebar Filters */}
      <aside className="filters" aria-label="فلاتر العطور">
        {renderFiltersContent("d")}
      </aside>

      {/* Mobile Drawer (Bottom Sheet) */}
      <div
        className={`mobile-filters-scrim ${isDrawerOpen ? "open" : ""}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <div
        className={`mobile-filters-drawer ${isDrawerOpen ? "open" : ""}`}
        aria-hidden={!isDrawerOpen}
        role="dialog"
        aria-modal="true"
        aria-label="فلاتر البحث"
      >
        <div className="drawer-header">
          <h3>{matchingCountLabel}</h3>
          <button type="button" className="drawer-close" onClick={() => setIsDrawerOpen(false)} aria-label="إغلاق فلاتر البحث">
            &times;
          </button>
        </div>
        <div className="drawer-body">
          {renderFiltersContent("m")}
        </div>
        <div className="drawer-foot" style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="btn btn-crimson" style={{ flex: 1 }} onClick={() => setIsDrawerOpen(false)}>
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={handleResetFilters}
          >
            إعادة تعيين
          </button>
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
              الفلاتر
              {activeFiltersCount > 0 && (
                <span style={{
                  background: "var(--crimson)",
                  color: "white",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "0.7rem",
                  marginRight: "6px",
                  fontWeight: "700"
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <select
              className="field"
              style={{ minWidth: 140 }}
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="ترتيب النتائج"
            >
              <option value="featured">المميزة أولاً</option>
              <option value="low">السعر من الأقل</option>
              <option value="high">السعر من الأعلى</option>
              <option value="name">الاسم</option>
            </select>
          </div>
        </div>
        
        {filtered.length ? (
          <>
            <div className="product-grid">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.slug} product={product} display={display} />
              ))}
            </div>
            {filtered.length > pageSize && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setPageSize((prev) => prev + 12)}
                >
                  عرض المزيد من العطور
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-results" style={{ padding: "60px 20px" }}>
            <strong style={{ fontSize: "1.4rem", display: "block", marginBottom: 10 }}>لا توجد نتائج مطابقة</strong>
            <p style={{ color: "var(--silver)", marginBottom: 24 }}>جرّب تغيير خيارات الفلترة أو ابحث بكلمات أخرى.</p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginBottom: 40 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleResetFilters}
              >
                مسح جميع الفلاتر
              </button>
              {settings?.contact.whatsapp && (
                <a
                  href={waLink(
                    settings.contact.whatsapp,
                    `السلام عليكم، أبحث عن عطر خاص غير متوفر في الكتالوج الحالي: "${query}"`
                  )}
                  className="btn btn-whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon /> اطلب عطراً مخصصاً
                </a>
              )}
            </div>

            {nearestMatches.length > 0 && (
              <div style={{ marginTop: 60, width: "100%" }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--ivory)", marginBottom: 20, textAlign: "right" }}>عطور قد تعجبك (أقرب تطابق):</h3>
                <div className="product-grid">
                  {nearestMatches.map((product) => (
                    <ProductCard key={product.slug} product={product} display={display} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
