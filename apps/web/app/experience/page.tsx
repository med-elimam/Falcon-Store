import type { Metadata } from "next";
import { CinematicExperience } from "@/components/cinematic-experience";
import { getCatalog, getProductDetail, getPublicSettings } from "@/lib/api";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Falcon Store — Cinematic Prototype",
  description: "نموذج بصري وظيفي لتجربة Falcon Store السينمائية.",
};

export default async function ExperiencePage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getPublicSettings()]);
  const signatures = (catalog ?? []).filter((product) => product.featured).slice(0, 3);
  const products = signatures.length ? signatures : (catalog ?? []).slice(0, 3);
  const lead = products[0];
  const detail = lead ? await getProductDetail(lead.slug) : null;

  if (!lead || !detail || detail === "unavailable") {
    return (
      <div className="page-shell shell section-pad">
        <div className="no-results">
          <strong>النموذج البصري يحتاج اتصالًا بالكتالوج الحقيقي</strong>
          <p>شغّل Falcon API ثم حدّث الصفحة لعرض المنتجات والأسعار والمخزون الفعلي.</p>
        </div>
      </div>
    );
  }

  return (
    <CinematicExperience
      products={products}
      product={detail}
      display={settings?.commerce.currencyDisplay ?? "mru"}
    />
  );
}
