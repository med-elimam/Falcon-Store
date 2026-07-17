/**
 * منطق الزرع المشترك — يعمل على PostgreSQL الحقيقي وعلى PGlite في الاختبارات.
 * آمن لإعادة التشغيل: يعتمد على upsert بمفاتيح فريدة ولا يكرر البيانات.
 */
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PERMISSION_KEYS, ROLE_LABELS, ROLE_PERMISSIONS, type RoleKey } from "@falcon/shared";
import * as s from "./schema.js";
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_DELIVERY_ZONES,
  SEED_PAYMENT_METHODS,
  SEED_PRODUCTS,
} from "./seed-data.js";

export type AnyDb = PgDatabase<PgQueryResultHKT, typeof s>;

export async function seedCore(db: AnyDb): Promise<void> {
  /* الأدوار والصلاحيات */
  for (const key of PERMISSION_KEYS) {
    await db.insert(s.permissions).values({ key }).onConflictDoNothing({ target: s.permissions.key });
  }
  for (const roleKey of Object.keys(ROLE_PERMISSIONS) as RoleKey[]) {
    await db
      .insert(s.roles)
      .values({ key: roleKey, nameAr: ROLE_LABELS[roleKey] })
      .onConflictDoNothing({ target: s.roles.key });
  }
  const allRoles = await db.select().from(s.roles);
  const allPerms = await db.select().from(s.permissions);
  for (const role of allRoles) {
    const wanted = ROLE_PERMISSIONS[role.key as RoleKey] ?? [];
    for (const permKey of wanted) {
      const perm = allPerms.find((p: { key: string }) => p.key === permKey);
      if (!perm) continue;
      await db
        .insert(s.rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }

  /* طرق الدفع (تفعيل Bankily والدفع عند الاستلام افتراضيًا) ومناطق التوصيل */
  for (const pm of SEED_PAYMENT_METHODS) {
    const isDefaultEnabled = pm.key === "cod" || pm.key === "bankily";
    await db
      .insert(s.paymentMethods)
      .values({ key: pm.key, labelAr: pm.labelAr, labelFr: pm.labelFr, enabled: isDefaultEnabled, sortOrder: pm.sortOrder })
      .onConflictDoUpdate({
        target: s.paymentMethods.key,
        set: { enabled: isDefaultEnabled }
      });
  }

  const defaultZones = [
    { nameAr: "تفرغ زينة", feeMru: 100, etaAr: "24–48 ساعة" },
    { nameAr: "لكصر", feeMru: 100, etaAr: "24–48 ساعة" },
    { nameAr: "تيارت", feeMru: 150, etaAr: "24–48 ساعة" },
    { nameAr: "عرفات", feeMru: 150, etaAr: "24–48 ساعة" },
    { nameAr: "دار النعيم", feeMru: 150, etaAr: "24–48 ساعة" },
    { nameAr: "توجنين", feeMru: 150, etaAr: "24–48 ساعة" },
    { nameAr: "الرياض", feeMru: 200, etaAr: "24–48 ساعة" },
    { nameAr: "السبخة", feeMru: 150, etaAr: "24–48 ساعة" },
    { nameAr: "الميناء", feeMru: 150, etaAr: "24–48 ساعة" },
  ];

  const existingZones = await db.select().from(s.deliveryZones);
  if (existingZones.length === 0) {
    for (const [i, zone] of defaultZones.entries()) {
      await db.insert(s.deliveryZones).values({
        nameAr: zone.nameAr,
        enabled: true,
        feeMru: zone.feeMru,
        etaAr: zone.etaAr,
        sortOrder: i
      });
    }
  } else {
    // Ensure they have realistic data and are enabled
    for (const zone of defaultZones) {
      await db
        .update(s.deliveryZones)
        .set({ feeMru: zone.feeMru, etaAr: zone.etaAr, enabled: true })
        .where(eq(s.deliveryZones.nameAr, zone.nameAr));
    }
  }

  /* الكتالوج */
  for (const brand of SEED_BRANDS) {
    await db
      .insert(s.brands)
      .values({ slug: brand.slug, name: brand.name, nameAr: brand.nameAr })
      .onConflictDoNothing({ target: s.brands.slug });
  }
  for (const cat of SEED_CATEGORIES) {
    await db
      .insert(s.categories)
      .values({ slug: cat.slug, nameAr: cat.nameAr, nameFr: cat.nameFr, sortOrder: cat.sortOrder })
      .onConflictDoNothing({ target: s.categories.slug });
  }
  const brandRows = await db.select().from(s.brands);

  for (const p of SEED_PRODUCTS) {
    const brandId = brandRows.find((b: { slug: string }) => b.slug === p.brandSlug)?.id ?? null;
    const inserted = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        brandId,
        status: p.status,
        featured: p.featured,
        gender: p.gender,
        concentration: p.concentration,
        origin: p.origin,
        seasons: p.seasons,
        projection: p.projection,
        glow: p.glow,
        families: p.families,
        times: p.times,
        sortOrder: p.sortOrder,
      })
      .onConflictDoNothing({ target: s.products.slug })
      .returning({ id: s.products.id });
    const productId =
      inserted[0]?.id ??
      (await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, p.slug)))[0]?.id;
    if (!productId || inserted.length === 0) continue;

    await db.insert(s.productTranslations).values({
      productId,
      locale: "ar",
      name: p.nameAr,
      description: p.descriptionAr,
      notesTop: p.notesTop,
      notesHeart: p.notesHeart,
      notesBase: p.notesBase,
    });
    await db.insert(s.productTranslations).values({
      productId,
      locale: "fr",
      name: p.nameFr,
      description: null,
      notesTop: [],
      notesHeart: [],
      notesBase: [],
    });
    for (const [i, v] of p.variants.entries()) {
      await db.insert(s.productVariants).values({
        productId,
        sizeLabel: v.size,
        sizeMl: Number.parseInt(v.size, 10),
        sku: `${p.slug}-${v.size}`.toUpperCase(),
        priceMru: v.priceMru,
        compareAtPriceMru: null,
        stockQuantity: 0,
        lowStockThreshold: 3,
        type: v.isDecant ? "decant" : "full_bottle",
        isActive: v.priceMru !== null,
        isAvailable: v.available && v.priceMru !== null,
        sortOrder: i,
      });
    }
    for (const [i, img] of p.gallery.entries()) {
      await db.insert(s.productImages).values({ productId, url: img.url, alt: img.alt, sortOrder: i });
    }
  }

  /* إعدادات افتراضية غير تجارية + تقدم الإعداد */
  await db
    .insert(s.siteSettings)
    .values({ key: "commerce", value: { currencyDisplay: "mru", pickupAvailable: false, codNote: null } })
    .onConflictDoNothing({ target: s.siteSettings.key });
  await db
    .insert(s.siteSettings)
    .values({
      key: "operations",
      value: { orderNotifyWhatsapp: null, defaultStockBehavior: "deduct", lowStockThreshold: 3, hoursAr: "يومياً من 4 مساءً حتى 11 مساءً" },
    })
    .onConflictDoNothing({ target: s.siteSettings.key });

  await db
    .insert(s.siteSettings)
    .values({
      key: "contact",
      value: {
        whatsapp: "22234744257",
        phone: "22234744257",
        email: "contact@falcon-store.com",
        address: "نواكشوط — تفرغ زينه، قرب ملتقى طرق كلينيك",
        mapUrl: "https://maps.google.com"
      }
    })
    .onConflictDoUpdate({
      target: s.siteSettings.key,
      set: {
        value: {
          whatsapp: "22234744257",
          phone: "22234744257",
          email: "contact@falcon-store.com",
          address: "نواكشوط — تفرغ زينه، قرب ملتقى طرق كلينيك",
          mapUrl: "https://maps.google.com"
        }
      }
    });

  await db
    .insert(s.siteSettings)
    .values({
      key: "identity",
      value: {
        nameAr: "متجر الصقر للعطور",
        nameLatin: "Falcon Store",
        description: "عطور نيش ومصممين وتعبئة دقيقة بحجم 10ml في نواكشوط.",
        logoUrl: null
      }
    })
    .onConflictDoUpdate({
      target: s.siteSettings.key,
      set: {
        value: {
          nameAr: "متجر الصقر للعطور",
          nameLatin: "Falcon Store",
          description: "عطور نيش ومصممين وتعبئة دقيقة بحجم 10ml في نواكشوط.",
          logoUrl: null
        }
      }
    });

  /* أقسام المحتوى الأساسية — نص افتراضي محايد بلا ادعاءات غير موثقة */
  await db
    .insert(s.contentSections)
    .values({
      key: "hero",
      type: "hero",
      titleAr: "عطور أصلية مختارة بعناية",
      bodyAr: "اكتشف عطور النيش والمصممين، وجرّب أحجام 10ml قبل شراء الزجاجة الكاملة.",
      enabled: true,
      sortOrder: 0,
    })
    .onConflictDoNothing({ target: s.contentSections.key });
  await db
    .insert(s.contentSections)
    .values({
      key: "decants",
      type: "section",
      titleAr: "جرّب العطر قبل شراء الحجم الكامل",
      bodyAr: "اختر عطرك المفضل بحجم عملي. تعبئة بعناية من الزجاجة الأصلية، مناسبة للتجربة أو الاستخدام اليومي والسفر.",
      enabled: true,
      sortOrder: 1,
    })
    .onConflictDoNothing({ target: s.contentSections.key });
}
