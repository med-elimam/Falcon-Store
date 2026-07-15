"use client";

import Image from "next/image";
import { useState } from "react";
import { ApiError, api, uploadMedia } from "@/lib/client-api";
import { mediaSrc } from "@/lib/media";
import {
  ConfirmButton,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  useAdminData,
  useToast,
} from "@/components/manage/ui";

interface Asset {
  id: string;
  url: string;
  fileName: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export default function MediaPage() {
  const { data, error, loading, reload } = useAdminData<{ assets: Asset[] }>("/api/v1/admin/media");
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  return (
    <>
      <header className="manage-head">
        <div>
          <span>الكتالوج</span>
          <h1>الوسائط</h1>
        </div>
        <label className="btn btn-crimson">
          {uploading ? "جارٍ الرفع…" : "رفع صورة"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                await uploadMedia(file);
                toast.push("رُفعت الصورة وأُعيد ترميزها بأمان.");
                reload();
              } catch (err) {
                toast.push(err instanceof ApiError ? err.message : "فشل رفع الصورة.", "error");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      </header>

      <section className="manage-card">
        <div className="manage-card-head">
          <div>
            <h2>مكتبة الصور</h2>
            <p>تُعاد معالجة كل صورة تلقائيًا: إزالة بيانات EXIF، تحويل إلى WebP، وتحديد الأبعاد.</p>
          </div>
        </div>
        {loading ? (
          <LoadingBlock />
        ) : error || !data ? (
          <ErrorBlock message={error ?? "تعذر التحميل"} onRetry={reload} />
        ) : data.assets.length === 0 ? (
          <EmptyBlock title="لا توجد صور مرفوعة بعد" hint="صور المنتجات المزروعة تعيش في مجلد الموقع نفسه." />
        ) : (
          <div className="media-grid">
            {data.assets.map((a) => (
              <figure key={a.id}>
                <span className="thumb">
                  <Image src={mediaSrc(a.url)} alt={a.fileName} fill sizes="140px" />
                </span>
                <figcaption>
                  <span className="num" dir="ltr">
                    {a.width ?? "?"}×{a.height ?? "?"} · {(a.sizeBytes / 1024).toFixed(0)}KB
                  </span>
                  <ConfirmButton
                    label="حذف"
                    confirmLabel="تأكيد"
                    className="text-button"
                    onConfirm={async () => {
                      try {
                        await api(`/api/v1/admin/media/${a.id}`, { method: "DELETE" });
                        toast.push("حُذفت الصورة.");
                        reload();
                      } catch (err) {
                        toast.push(err instanceof ApiError ? err.message : "تعذر الحذف.", "error");
                      }
                    }}
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
