"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ApiError, api, uploadMedia } from "@/lib/client-api";
import {
  HOME_IMAGE_SLOTS,
  HOME_IMAGES_SECTION_KEY,
  type HomeImageKey,
  type HomeImagesData,
  isManagedImageUrl,
  readHomeImages,
} from "@/lib/home-images";
import { mediaSrc } from "@/lib/media";
import { ErrorBlock, LoadingBlock, useAdminData, useToast } from "./ui";

interface MediaAsset {
  id: string;
  url: string;
  fileName: string;
  width: number | null;
  height: number | null;
}

interface ImageSection {
  data: Record<string, unknown> | null;
}

function withoutImage(images: HomeImagesData, key: HomeImageKey): HomeImagesData {
  const next = { ...images };
  delete next[key];
  return next;
}

function ImageUploadButton({
  busy,
  disabled,
  onFile,
}: {
  busy: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "جارٍ الرفع…" : "رفع صورة جديدة"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

export function HomeImagesEditor({
  section,
  onSaved,
}: {
  section: ImageSection | undefined;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { data: media, error: mediaError, loading: mediaLoading, reload: reloadMedia } =
    useAdminData<{ assets: MediaAsset[] }>("/api/v1/admin/media");
  const initialImages = readHomeImages(section?.data);
  const [images, setImages] = useState<HomeImagesData>(initialImages);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<HomeImageKey | null>(null);

  const assets = (media?.assets ?? []).filter((asset) => isManagedImageUrl(asset.url));
  const dirty = JSON.stringify(images) !== JSON.stringify(initialImages);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/v1/admin/content/${HOME_IMAGES_SECTION_KEY}`, {
        method: "PUT",
        body: {
          type: "section",
          titleAr: null,
          bodyAr: null,
          titleFr: null,
          bodyFr: null,
          data: images,
          enabled: true,
          sortOrder: 5,
        },
      });
      toast.push("حُفظت صور الصفحة الرئيسية.");
      onSaved();
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "تعذر حفظ الصور.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function upload(key: HomeImageKey, file: File) {
    setUploading(key);
    try {
      const { asset } = await uploadMedia(file);
      setImages((current) => ({ ...current, [key]: asset.url }));
      toast.push("رُفعت الصورة. اضغط حفظ لتطبيقها على الموقع.");
      reloadMedia();
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "فشل رفع الصورة.", "error");
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="manage-card home-images-editor">
      <div className="manage-card-head">
        <div>
          <h2>صور الصفحة الرئيسية</h2>
          <p>اختر صورة مرفوعة أو ارفع صورة جديدة لكل موضع. لن تتأثر صور المنتجات.</p>
        </div>
        {dirty && <span className="home-images-unsaved">تغييرات غير محفوظة</span>}
      </div>

      {mediaLoading ? (
        <LoadingBlock />
      ) : mediaError && !media ? (
        <ErrorBlock message="تعذر تحميل مكتبة الصور. يمكنك إعادة المحاولة قبل التعديل." onRetry={reloadMedia} />
      ) : (
        <div className="home-images-list">
          {HOME_IMAGE_SLOTS.map((slot) => {
            const customUrl = images[slot.key];
            const previewUrl = customUrl ?? slot.fallback;
            const selectedAsset = customUrl ? assets.find((asset) => asset.url === customUrl) : null;

            return (
              <article className="home-image-slot" key={slot.key}>
                <div className="home-image-preview">
                  <Image src={mediaSrc(previewUrl)} alt={`معاينة ${slot.label}`} fill sizes="180px" />
                  <span>{customUrl ? "صورة مخصصة" : "الصورة الافتراضية"}</span>
                </div>
                <div className="home-image-copy">
                  <label htmlFor={`home-image-${slot.key}`}>{slot.label}</label>
                  <p>{slot.hint}</p>
                  <select
                    className="field"
                    id={`home-image-${slot.key}`}
                    value={customUrl ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setImages((current) =>
                        value ? { ...current, [slot.key]: value } : withoutImage(current, slot.key)
                      );
                    }}
                  >
                    <option value="">استخدام الصورة الافتراضية</option>
                    {customUrl && !selectedAsset && <option value={customUrl}>الصورة المختارة حاليًا</option>}
                    {assets.map((asset) => (
                      <option value={asset.url} key={asset.id}>
                        {asset.fileName} {asset.width && asset.height ? `— ${asset.width}×${asset.height}` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="home-image-actions">
                    <ImageUploadButton
                      busy={uploading === slot.key}
                      disabled={uploading !== null || saving}
                      onFile={(file) => void upload(slot.key, file)}
                    />
                    {customUrl && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setImages((current) => withoutImage(current, slot.key))}
                        disabled={uploading !== null || saving}
                      >
                        استعادة الافتراضية
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="home-images-footer">
        <button className="btn btn-crimson" type="button" onClick={() => void save()} disabled={!dirty || saving || uploading !== null}>
          {saving ? "جارٍ الحفظ…" : "حفظ صور الصفحة الرئيسية"}
        </button>
        <p>تظهر التغييرات بعد الحفظ وتحديث الصفحة الرئيسية.</p>
      </div>
    </section>
  );
}
