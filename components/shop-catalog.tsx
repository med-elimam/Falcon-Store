"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FAMILY_LABELS, PRODUCTS, startingPrice, type Family } from "@/lib/products";
import { ProductCard } from "./product-card";

type Sort = "featured" | "low" | "high" | "name";

export function ShopCatalog() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [family, setFamily] = useState<Family | "all">("all");
  const [decantOnly, setDecantOnly] = useState(params.get("size") === "10ml");
  const [sort, setSort] = useState<Sort>("featured");
  const brands = [...new Set(PRODUCTS.map((product) => product.brand))];

  const products = useMemo(() => PRODUCTS.filter((product) => {
    const needle = query.toLocaleLowerCase();
    return (!needle || `${product.nameAr} ${product.nameEn} ${product.brand}`.toLocaleLowerCase().includes(needle))
      && (brand === "all" || product.brand === brand)
      && (family === "all" || product.families.includes(family))
      && (!decantOnly || product.sizes.some((size) => size.size === "10ml" && size.available));
  }).sort((a, b) => {
    if (sort === "low") return (startingPrice(a) ?? Infinity) - (startingPrice(b) ?? Infinity);
    if (sort === "high") return (startingPrice(b) ?? -1) - (startingPrice(a) ?? -1);
    if (sort === "name") return a.nameAr.localeCompare(b.nameAr, "ar");
    return Number(b.featured) - Number(a.featured);
  }), [query, brand, family, decantOnly, sort]);

  return (
    <div className="shop-layout">
      <aside className="filters" aria-label="فلاتر العطور">
        <div className="filter-block"><label htmlFor="search">ابحث في الخزنة</label><input id="search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم العطر أو العلامة" /></div>
        <div className="filter-block"><label htmlFor="brand">العلامة</label><select id="brand" className="field" value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">جميع العلامات</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <div className="filter-block"><label htmlFor="family">العائلة العطرية</label><select id="family" className="field" value={family} onChange={(event) => setFamily(event.target.value as Family | "all")}><option value="all">جميع العائلات</option>{Object.entries(FAMILY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        <label className="check-row"><input type="checkbox" checked={decantOnly} onChange={(event) => setDecantOnly(event.target.checked)} /><span>متوفر بحجم 10ml</span></label>
        <button className="text-button" onClick={() => { setQuery(""); setBrand("all"); setFamily("all"); setDecantOnly(false); }}>مسح الفلاتر</button>
      </aside>
      <div className="catalog">
        <div className="catalog-toolbar"><span><b className="num">{products.length}</b> عطور متاحة</span><label>ترتيب <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="featured">المميزة أولاً</option><option value="low">السعر من الأقل</option><option value="high">السعر من الأعلى</option><option value="name">الاسم</option></select></label></div>
        {products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div> : <div className="no-results"><strong>لا توجد نتائج مطابقة</strong><p>جرّب تغيير العلامة أو العائلة العطرية.</p></div>}
      </div>
    </div>
  );
}
