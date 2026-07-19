"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  FAMILIES,
  FAMILY_LABELS,
  PRODUCT_STATUS_LABELS,
  TIME_LABELS,
  TIME_TAGS,
  type Family,
  type ProductStatus,
  type TimeTag,
  type VariantType,
} from "@falcon/shared";
import { api, ApiError, uploadMedia } from "@/lib/client-api";
import { formatMRU } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import {
  Chip,
  ConfirmButton,
  DrawerForm,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface AdminVariant {
  id: string;
  sizeLabel: string;
  sizeMl: number;
  sku: string;
  priceMru: number | null;
  compareAtPriceMru: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  type: VariantType;
  isActive: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

interface AdminTranslation {
  name: string;
  description: string | null;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
}

interface AdminProduct {
  id: string;
  slug: string;
  nameAr: string;
  brandId: string | null;
  categoryId: string | null;
  brandName: string;
  image: string | null;
  featured: boolean;
  glow: string;
  families: Family[];
  times: TimeTag[];
  status: ProductStatus;
  concentration: string | null;
  gender: string | null;
  origin: string | null;
  seasons: string | null;
  projection: string | null;
  images: { url: string; alt: string | null }[];
  rawVariants: AdminVariant[];
  translations: { ar: AdminTranslation | null; fr: AdminTranslation | null };
  publishProblems: string[];
  sortOrder: number;
}

interface Brand {
  id: string;
  name: string;
}
interface Category {
  id: string;
  nameAr: string;
}

interface VariantForm {
  clientKey: string;
  id?: string;
  sizeLabel: string;
  sizeMl: string;
  sku: string;
  priceMru: string;
  compareAtPriceMru: string;
  stockQuantity: string;
  lowStockThreshold: string;
  type: VariantType;
  isActive: boolean;
  isAvailable: boolean;
}

interface ImageForm {
  url: string;
  alt: string;
}

interface ProductForm {
  slug: string;
  brandId: string;
  categoryId: string;
  featured: boolean;
  gender: string;
  concentration: string;
  origin: string;
  seasons: string;
  projection: string;
  glow: string;
  families: Family[];
  times: TimeTag[];
  nameAr: string;
  descriptionAr: string;
  notesTop: string;
  notesHeart: string;
  notesBase: string;
  nameFr: string;
  descriptionFr: string;
  variants: VariantForm[];
  images: ImageForm[];
}

const splitNotes = (v: string) =>
  v
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const blankVariant = (): VariantForm => ({
  clientKey: crypto.randomUUID(),
  sizeLabel: "",
  sizeMl: "",
  sku: "",
  priceMru: "",
  compareAtPriceMru: "",
  stockQuantity: "0",
  lowStockThreshold: "3",
  type: "full_bottle",
  isActive: true,
  isAvailable: true,
});

function toForm(p: AdminProduct | null): ProductForm {
  return {
    slug: p?.slug ?? "",
    brandId: p?.brandId ?? "",
    categoryId: p?.categoryId ?? "",
    featured: p?.featured ?? false,
    gender: p?.gender ?? "",
    concentration: p?.concentration ?? "",
    origin: p?.origin ?? "",
    seasons: p?.seasons ?? "",
    projection: p?.projection ?? "",
    glow: p?.glow ?? "#5e0a22",
    families: p?.families ?? [],
    times: p?.times ?? [],
    nameAr: p?.translations.ar?.name ?? "",
    descriptionAr: p?.translations.ar?.description ?? "",
    notesTop: (p?.translations.ar?.notesTop ?? []).join("، "),
    notesHeart: (p?.translations.ar?.notesHeart ?? []).join("، "),
    notesBase: (p?.translations.ar?.notesBase ?? []).join("، "),
    nameFr: p?.translations.fr?.name ?? "",
    descriptionFr: p?.translations.fr?.description ?? "",
    variants: (p?.rawVariants ?? []).map((v) => ({
      clientKey: v.id,
      id: v.id,
      sizeLabel: v.sizeLabel,
      sizeMl: String(v.sizeMl),
      sku: v.sku,
      priceMru: v.priceMru?.toString() ?? "",
      compareAtPriceMru: v.compareAtPriceMru?.toString() ?? "",
      stockQuantity: String(v.stockQuantity),
      lowStockThreshold: String(v.lowStockThreshold),
      type: v.type,
      isActive: v.isActive,
      isAvailable: v.isAvailable,
    })),
    images: (p?.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "" })),
  };
}

export default function ProductsPage() {
  const { data, error, loading, reload } = useAdminData<{ products: AdminProduct[] }>("/api/v1/admin/products");
  const brands = useAdminData<{ brands: Brand[] }>("/api/v1/admin/brands");
  const categories = useAdminData<{ categories: Category[] }>("/api/v1/admin/categories");
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null | "new">(null);
  const [form, setForm] = useState<ProductForm>(toForm(null));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);

  const products = useMemo(
    () =>
      (data?.products ?? []).filter((p) =>
        `${p.nameAr} ${p.slug} ${p.brandName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      ),
    [data, query]
  );

  const openEditor = (p: AdminProduct | "new") => {
    setEditing(p);
    setForm(toForm(p === "new" ? null : p));
    setFormError("");
  };

  async function save(publish?: boolean) {
    setSaving(true);
    setFormError("");
    try {
      const base = {
        brandId: form.brandId || null,
        categoryId: form.categoryId || null,
        featured: form.featured,
        gender: form.gender.trim() || null,
        concentration: form.concentration.trim() || null,
        origin: form.origin.trim() || null,
        seasons: form.seasons.trim() || null,
        projection: form.projection.trim() || null,
        glow: form.glow,
        families: form.families,
        times: form.times,
        translations: {
          ar: {
            name: form.nameAr.trim(),
            description: form.descriptionAr.trim() || null,
            notesTop: splitNotes(form.notesTop),
            notesHeart: splitNotes(form.notesHeart),
            notesBase: splitNotes(form.notesBase),
          },
          fr: form.nameFr.trim()
            ? {
                name: form.nameFr.trim(),
                description: form.descriptionFr.trim() || null,
                notesTop: [],
                notesHeart: [],
                notesBase: [],
              }
            : null,
        },
      };

      let id: string;
      if (editing === "new") {
        const created = await api<{ id: string }>("/api/v1/admin/products", {
          method: "POST",
          body: { ...base, slug: form.slug.trim(), status: "draft", sortOrder: 0 },
        });
        id = created.id;
      } else {
        id = (editing as AdminProduct).id;
        await api(`/api/v1/admin/products/${id}`, { method: "PATCH", body: { ...base, slug: form.slug.trim() } });
      }

      const variants = form.variants.map((v, i) => ({
          id: v.id,
          sizeLabel: v.sizeLabel.trim(),
          sizeMl: Number(v.sizeMl),
          sku: v.sku.trim(),
          priceMru: v.priceMru.trim() === "" ? null : Number(v.priceMru),
          compareAtPriceMru: v.compareAtPriceMru.trim() === "" ? null : Number(v.compareAtPriceMru),
          stockQuantity: Number(v.stockQuantity),
          lowStockThreshold: Number(v.lowStockThreshold),
          type: v.type,
          isActive: v.isActive,
          isAvailable: v.isAvailable,
          sortOrder: i,
        }));
      await api(`/api/v1/admin/products/${id}/variants`, { method: "PUT", body: { variants } });
      await api(`/api/v1/admin/products/${id}/images`, {
        method: "PUT",
        body: { images: form.images.map((img) => ({ url: img.url, alt: img.alt.trim() || null })) },
      });

      if (publish !== undefined) {
        await api(`/api/v1/admin/products/${id}`, {
          method: "PATCH",
          body: { status: publish ? "published" : "hidden" },
        });
      }

      toast.push("تم حفظ المنتج.");
      setEditing(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object" && "problems" in err.details) {
        setFormError(`لا يمكن النشر بعد: ${(err.details as { problems: string[] }).problems.join("، ")}`);
        reload();
      } else {
        setFormError(err instanceof ApiError ? err.message : "تعذر الحفظ.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const { asset } = await uploadMedia(file);
      setForm((f) => ({ ...f, images: [...f.images, { url: asset.url, alt: "" }] }));
      toast.push("رُفعت الصورة.");
    } catch (err) {
      toast.push(err instanceof ApiError ? err.message : "فشل رفع الصورة.", "error");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />;

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>المنتجات والأحجام</h1>
        </div>
        <button className="btn btn-crimson" onClick={() => openEditor("new")}>
          منتج جديد
        </button>
      </header>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>كل المنتجات ({data.products.length})</h2>
            <p>المسودات لا تظهر للزبائن حتى تكتمل وتُنشر.</p>
          </div>
          <input className="field" placeholder="ابحث عن منتج" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {products.length === 0 ? (
          <EmptyBlock title="لا توجد منتجات مطابقة" />
        ) : (
          <div className="manage-table-wrap">
            <table className="manage-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الأحجام والأسعار</th>
                  <th>الحالة</th>
                  <th>مميز</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ position: "relative", width: 44, height: 52, background: "#0b0b0b", flexShrink: 0 }}>
                          {p.image && <Image src={mediaSrc(p.image)} alt="" fill sizes="44px" />}
                        </span>
                        <div>
                          <strong>{p.nameAr}</strong>
                          <div style={{ color: "var(--silver)", fontSize: ".7rem" }}>{p.brandName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.rawVariants.map((v) => (
                        <div key={v.id} className="num" style={{ whiteSpace: "nowrap" }}>
                          {v.sizeLabel}: {v.priceMru !== null ? formatMRU(v.priceMru) : "غير مكتمل"}
                        </div>
                      ))}
                    </td>
                    <td>
                      <Chip tone={p.status === "published" ? "good" : p.status === "draft" ? "warn" : "bad"}>
                        {PRODUCT_STATUS_LABELS[p.status]}
                      </Chip>
                      {p.status !== "published" && p.publishProblems.length > 0 && (
                        <div style={{ color: "var(--silver)", fontSize: ".66rem", marginTop: 6, maxWidth: 220 }}>
                          {p.publishProblems.join("، ")}
                        </div>
                      )}
                    </td>
                    <td>{p.featured ? <Chip tone="info">مميز</Chip> : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost" onClick={() => openEditor(p)}>
                          تعديل
                        </button>
                        {p.status === "published" ? (
                          <button
                            className="btn btn-ghost"
                            onClick={async () => {
                              try {
                                await api(`/api/v1/admin/products/${p.id}`, { method: "PATCH", body: { status: "hidden" } });
                                toast.push("أُخفي المنتج من المتجر.");
                                reload();
                              } catch (err) {
                                toast.push(err instanceof ApiError ? err.message : "تعذر التنفيذ.", "error");
                              }
                            }}
                          >
                            إخفاء
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={async () => {
                              try {
                                await api(`/api/v1/admin/products/${p.id}`, { method: "PATCH", body: { status: "published" } });
                                toast.push("نُشر المنتج.");
                                reload();
                              } catch (err) {
                                if (err instanceof ApiError && err.details && typeof err.details === "object" && "problems" in err.details) {
                                  toast.push(`أكمل أولًا: ${(err.details as { problems: string[] }).problems.join("، ")}`, "error");
                                } else {
                                  toast.push(err instanceof ApiError ? err.message : "تعذر النشر.", "error");
                                }
                              }
                            }}
                          >
                            نشر
                          </button>
                        )}
                        <ConfirmButton
                          label="حذف"
                          confirmLabel="تأكيد الحذف"
                          onConfirm={async () => {
                            try {
                              await api(`/api/v1/admin/products/${p.id}`, { method: "DELETE" });
                              toast.push("حُذف المنتج.");
                              reload();
                            } catch (err) {
                              toast.push(err instanceof ApiError ? err.message : "تعذر الحذف.", "error");
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing !== null && (
        <DrawerForm title={editing === "new" ? "منتج جديد" : `تعديل: ${(editing as AdminProduct).nameAr}`} onClose={() => setEditing(null)}>
          <div className="manage-form">
            <div className="row">
              <label>
                الاسم العربي
                <input className="field" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
              </label>
              <label>
                الاسم الفرنسي/اللاتيني
                <input className="field" dir="ltr" value={form.nameFr} onChange={(e) => setForm({ ...form, nameFr: e.target.value })} />
              </label>
              <label>
                المعرّف اللاتيني (slug)
                <input className="field" dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </label>
            </div>
            <div className="row">
              <label>
                العلامة التجارية
                <select className="field" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                  <option value="">بدون علامة</option>
                  {(brands.data?.brands ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                التصنيف
                <select className="field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">بدون تصنيف</option>
                  {(categories.data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-check">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                منتج مميز في الرئيسية
              </label>
            </div>
            <label>
              الوصف العربي
              <textarea className="field" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
            </label>
            <div className="row">
              <label>
                النوع (رجالي/نسائي/للجنسين)
                <input className="field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
              </label>
              <label>
                التركيز
                <input className="field" value={form.concentration} onChange={(e) => setForm({ ...form, concentration: e.target.value })} />
              </label>
              <label>
                بلد المنشأ
                <input className="field" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
              </label>
              <label>
                الموسم
                <input className="field" value={form.seasons} onChange={(e) => setForm({ ...form, seasons: e.target.value })} />
              </label>
              <label>
                الفوحان
                <input className="field" value={form.projection} onChange={(e) => setForm({ ...form, projection: e.target.value })} />
              </label>
              <label>
                لون التوهج
                <input className="field" dir="ltr" value={form.glow} onChange={(e) => setForm({ ...form, glow: e.target.value })} />
              </label>
            </div>
            <div className="row">
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 700, fontSize: ".78rem", marginBottom: 8 }}>العائلات العطرية</legend>
                <div className="choice-row">
                  {FAMILIES.map((f) => (
                    <button
                      type="button"
                      key={f}
                      className={form.families.includes(f) ? "selected" : ""}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          families: prev.families.includes(f) ? prev.families.filter((x) => x !== f) : [...prev.families, f],
                        }))
                      }
                    >
                      {FAMILY_LABELS[f]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 700, fontSize: ".78rem", marginBottom: 8 }}>أوقات الاستخدام</legend>
                <div className="choice-row">
                  {TIME_TAGS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      className={form.times.includes(t) ? "selected" : ""}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          times: prev.times.includes(t) ? prev.times.filter((x) => x !== t) : [...prev.times, t],
                        }))
                      }
                    >
                      {TIME_LABELS[t]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="row">
              <label>
                نوتات الافتتاحية (مفصولة بفواصل)
                <input className="field" value={form.notesTop} onChange={(e) => setForm({ ...form, notesTop: e.target.value })} />
              </label>
              <label>
                نوتات القلب
                <input className="field" value={form.notesHeart} onChange={(e) => setForm({ ...form, notesHeart: e.target.value })} />
              </label>
              <label>
                نوتات القاعدة
                <input className="field" value={form.notesBase} onChange={(e) => setForm({ ...form, notesBase: e.target.value })} />
              </label>
            </div>

            <div className="variant-editor">
              <div className="variant-editor-head">
                <div>
                  <b>متغيرات المنتج</b>
                  <p>الحجم، النوع، السعر، المخزون والتوفر تأتي كلها من قاعدة البيانات.</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, blankVariant()] }))}>
                  إضافة متغير
                </button>
              </div>
              {form.variants.map((v, i) => (
                <div className="variant-card" key={v.clientKey}>
                  <div className="variant-card-toolbar">
                    <strong>{v.sizeLabel || `متغير ${i + 1}`}</strong>
                    <div>
                      <button type="button" className="icon-button" disabled={i === 0} onClick={() => setForm((current) => {
                        const variants = [...current.variants];
                        [variants[i - 1], variants[i]] = [variants[i]!, variants[i - 1]!];
                        return { ...current, variants };
                      })} aria-label="تحريك لأعلى">↑</button>
                      <button type="button" className="icon-button" disabled={i === form.variants.length - 1} onClick={() => setForm((current) => {
                        const variants = [...current.variants];
                        [variants[i], variants[i + 1]] = [variants[i + 1]!, variants[i]!];
                        return { ...current, variants };
                      })} aria-label="تحريك لأسفل">↓</button>
                      <button type="button" className="icon-button danger" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((_, index) => index !== i) }))}>حذف</button>
                    </div>
                  </div>
                  <div className="variant-fields">
                    <label>اسم الحجم<input className="field num" placeholder="10ml" value={v.sizeLabel} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, sizeLabel: e.target.value }; setForm({ ...form, variants });
                    }} /></label>
                    <label>الحجم بالمل<input className="field num" inputMode="numeric" value={v.sizeMl} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, sizeMl: e.target.value.replace(/\D/g, "") }; setForm({ ...form, variants });
                    }} /></label>
                    <label>SKU<input className="field" dir="ltr" value={v.sku} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, sku: e.target.value }; setForm({ ...form, variants });
                    }} /></label>
                    <label>النوع<select className="field" value={v.type} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, type: e.target.value as VariantType }; setForm({ ...form, variants });
                    }}><option value="decant">تعبئة 10ml</option><option value="full_bottle">زجاجة كاملة</option></select></label>
                    <label>السعر MRU<input className="field num" inputMode="numeric" value={v.priceMru} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, priceMru: e.target.value.replace(/\D/g, "") }; setForm({ ...form, variants });
                    }} /></label>
                    <label>السعر قبل الخصم<input className="field num" inputMode="numeric" placeholder="اختياري" value={v.compareAtPriceMru} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, compareAtPriceMru: e.target.value.replace(/\D/g, "") }; setForm({ ...form, variants });
                    }} /></label>
                    <label>المخزون<input className="field num" inputMode="numeric" value={v.stockQuantity} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, stockQuantity: e.target.value.replace(/\D/g, "") }; setForm({ ...form, variants });
                    }} /></label>
                    <label>حد المخزون المنخفض<input className="field num" inputMode="numeric" value={v.lowStockThreshold} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, lowStockThreshold: e.target.value.replace(/\D/g, "") }; setForm({ ...form, variants });
                    }} /></label>
                  </div>
                  <div className="variant-flags">
                    <label className="inline-check"><input type="checkbox" checked={v.isActive} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, isActive: e.target.checked }; setForm({ ...form, variants });
                    }} />نشط</label>
                    <label className="inline-check"><input type="checkbox" checked={v.isAvailable} onChange={(e) => {
                      const variants = [...form.variants]; variants[i] = { ...v, isAvailable: e.target.checked }; setForm({ ...form, variants });
                    }} />متاح للشراء</label>
                    {(!v.sizeLabel || !v.sizeMl || !v.sku || !v.priceMru) && <Chip tone="warn">غير مكتمل — لن يظهر للزبائن</Chip>}
                  </div>
                </div>
              ))}
              {form.variants.length === 0 && <EmptyBlock title="لا توجد متغيرات بعد" />}
            </div>

            <div className="image-manager">
              <b>صور المنتج (الأولى هي الرئيسية)</b>
              {form.images.map((img, i) => (
                <div className="image-row" key={`${img.url}-${i}`}>
                  <span className="thumb">
                    <Image src={mediaSrc(img.url)} alt="" fill sizes="56px" />
                  </span>
                  <input
                    className="field"
                    placeholder="وصف الصورة (alt)"
                    value={img.alt}
                    onChange={(e) => {
                      const images = [...form.images];
                      images[i] = { ...img, alt: e.target.value };
                      setForm({ ...form, images });
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={i === 0}
                    onClick={() => {
                      const images = [...form.images];
                      const [moved] = images.splice(i, 1);
                      images.splice(i - 1, 0, moved!);
                      setForm({ ...form, images });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={i === form.images.length - 1}
                    onClick={() => {
                      const images = [...form.images];
                      const [moved] = images.splice(i, 1);
                      images.splice(i + 1, 0, moved!);
                      setForm({ ...form, images });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setForm({ ...form, images: form.images.filter((_, x) => x !== i) })}
                  >
                    إزالة
                  </button>
                </div>
              ))}
              <label className="btn btn-ghost" style={{ justifySelf: "start" }}>
                {uploading ? "جارٍ الرفع…" : "رفع صورة جديدة"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="manage-form-foot">
              <button className="btn btn-crimson" disabled={saving} onClick={() => save()}>
                {saving ? "جارٍ الحفظ…" : "حفظ"}
              </button>
              <button className="btn btn-ghost" disabled={saving} onClick={() => save(true)}>
                حفظ ونشر
              </button>
              <button className="text-button" onClick={() => setEditing(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </DrawerForm>
      )}
    </>
  );
}
