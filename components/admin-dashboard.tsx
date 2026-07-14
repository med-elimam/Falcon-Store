"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/products";

type Prices = Record<string, string>;

export function AdminDashboard() {
  const [query, setQuery] = useState("");
  const [prices, setPrices] = useState<Prices>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem("falcon-admin-prices");
    const id = window.setTimeout(() => { if (raw) setPrices(JSON.parse(raw)); }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const filtered = useMemo(() => PRODUCTS.filter((product) => `${product.nameAr} ${product.nameEn} ${product.brand}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const save = () => { localStorage.setItem("falcon-admin-prices", JSON.stringify(prices)); setSaved(true); setTimeout(() => setSaved(false), 2200); };
  const decants = PRODUCTS.filter((product) => product.sizes.some((size) => size.size === "10ml" && size.available)).length;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar"><Link href="/" className="admin-logo">F<span>FALCON</span></Link><nav><button className="active">المنتجات</button><button>الطلبات <b>0</b></button><button>العملاء</button><button>المخزون</button><button>الأسعار</button><button>العروض</button><button>الإحصائيات</button></nav><Link href="/" className="back-store">فتح المتجر ←</Link></aside>
      <div className="admin-main">
        <header className="admin-head"><div><span>لوحة الإدارة</span><h1>المنتجات والمخزون</h1></div><div className="admin-user"><b>مدير المتجر</b><span>نسخة المعاينة</span></div></header>
        <section className="admin-stats"><article><span>إجمالي المنتجات</span><strong className="num">{PRODUCTS.length}</strong><small>في الكتالوج</small></article><article><span>تعبئات 10ml</span><strong className="num">{decants}</strong><small>متوفرة الآن</small></article><article><span>بانتظار السعر</span><strong className="num">{PRODUCTS.filter((p) => p.sizes.some((s) => s.price === null)).length}</strong><small>تحتاج مراجعة</small></article></section>
        <section className="admin-table-card"><div className="table-toolbar"><div><h2>كتالوج العطور</h2><p>حدّث سعر 10ml بسرعة من هنا.</p></div><div><input className="field" placeholder="ابحث عن منتج" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="btn btn-crimson" onClick={save}>حفظ التعديلات</button></div></div><div className="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>التركيز</th><th>10ml</th><th>السعر MRU</th><th>الحالة</th><th>عرض</th></tr></thead><tbody>{filtered.map((product) => { const offer = product.sizes.find((size) => size.size === "10ml"); const current = prices[product.slug] ?? (offer?.price?.toString() ?? ""); return <tr key={product.slug}><td><div className="admin-product"><span><Image src={product.image} alt="" fill sizes="52px" /></span><div><strong>{product.nameAr}</strong><small>{product.brand}</small></div></div></td><td>{product.concentration}</td><td>{offer?.available ? "متوفر" : "—"}</td><td><input className="admin-price num" inputMode="numeric" value={current} placeholder="غير محدد" onChange={(event) => setPrices((state) => ({ ...state, [product.slug]: event.target.value.replace(/\D/g, "") }))} /></td><td><span className="stock-status">متوفر</span></td><td><Link href={`/product/${product.slug}`}>فتح</Link></td></tr>; })}</tbody></table></div><div className="table-note">التعديلات في هذه المعاينة تُحفظ على هذا الجهاز فقط. اربط Supabase لتصبح مشتركة بين الأجهزة.</div></section>
      </div>
      {saved && <div className="admin-toast">حُفظت الأسعار على هذا الجهاز</div>}
    </div>
  );
}
