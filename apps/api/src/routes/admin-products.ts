import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import {
  productImages,
  products,
  productTranslations,
  productVariants,
} from "@falcon/database";
import {
  productImagesSchema,
  productPatchSchema,
  productUpsertSchema,
  uuidSchema,
  variantUpsertSchema,
} from "@falcon/validation";
import { z } from "zod";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { loadProducts, publishProblems, toDetailDTO } from "../lib/catalog.js";

const variantsPayload = z.object({ variants: z.array(variantUpsertSchema).max(100) });

export async function registerAdminProductRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/products`;

  app.get(P, { preHandler: requirePermission("products.read") }, async () => {
    const all = await loadProducts(app.db);
    return {
      products: all.map((p) => ({
        ...toDetailDTO(p),
        status: p.product.status,
        sortOrder: p.product.sortOrder,
        brandId: p.product.brandId,
        categoryId: p.product.categoryId,
        stockBySize: Object.fromEntries(p.variants.map((v) => [v.sizeLabel, v.stockQuantity])),
        rawVariants: p.variants,
        translations: {
          ar: p.translations.find((t) => t.locale === "ar") ?? null,
          fr: p.translations.find((t) => t.locale === "fr") ?? null,
        },
        publishProblems: publishProblems(p),
      })),
    };
  });

  app.post(P, { preHandler: requirePermission("products.write") }, async (req, reply) => {
    const body = productUpsertSchema.parse(req.body);
    const dupe = await app.db.select({ id: products.id }).from(products).where(eq(products.slug, body.slug)).limit(1);
    if (dupe[0]) throw conflict("يوجد منتج بنفس المعرّف اللاتيني (slug).");

    const productId = await app.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          slug: body.slug,
          brandId: body.brandId,
          categoryId: body.categoryId,
          status: "draft",
          featured: body.featured,
          gender: body.gender,
          concentration: body.concentration,
          origin: body.origin,
          seasons: body.seasons,
          projection: body.projection,
          glow: body.glow,
          families: body.families,
          times: body.times,
          sortOrder: body.sortOrder,
        })
        .returning({ id: products.id });
      const id = created!.id;
      await tx.insert(productTranslations).values({
        productId: id,
        locale: "ar",
        name: body.translations.ar.name,
        description: body.translations.ar.description,
        notesTop: body.translations.ar.notesTop,
        notesHeart: body.translations.ar.notesHeart,
        notesBase: body.translations.ar.notesBase,
      });
      if (body.translations.fr?.name) {
        await tx.insert(productTranslations).values({
          productId: id,
          locale: "fr",
          name: body.translations.fr.name,
          description: body.translations.fr.description ?? null,
          notesTop: body.translations.fr.notesTop ?? [],
          notesHeart: body.translations.fr.notesHeart ?? [],
          notesBase: body.translations.fr.notesBase ?? [],
        });
      }
      return id;
    });

    await writeAudit(app.db, req, { action: "product.created", entity: "product", entityId: productId, meta: { slug: body.slug } });
    return reply.status(201).send({ id: productId });
  });

  app.patch(P + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = productPatchSchema.parse(req.body);
    const loaded = (await loadProducts(app.db, [id]))[0];
    if (!loaded) throw notFound("المنتج غير موجود.");

    await app.db.transaction(async (tx) => {
      const set: Record<string, unknown> = { updatedAt: new Date() };
      for (const key of [
        "slug",
        "brandId",
        "categoryId",
        "featured",
        "gender",
        "concentration",
        "origin",
        "seasons",
        "projection",
        "glow",
        "families",
        "times",
        "sortOrder",
        "status",
      ] as const) {
        if (body[key] !== undefined) set[key] = body[key];
      }
      await tx.update(products).set(set).where(eq(products.id, id));

      if (body.translations) {
        await tx.delete(productTranslations).where(eq(productTranslations.productId, id));
        await tx.insert(productTranslations).values({
          productId: id,
          locale: "ar",
          name: body.translations.ar.name,
          description: body.translations.ar.description,
          notesTop: body.translations.ar.notesTop,
          notesHeart: body.translations.ar.notesHeart,
          notesBase: body.translations.ar.notesBase,
        });
        if (body.translations.fr?.name) {
          await tx.insert(productTranslations).values({
            productId: id,
            locale: "fr",
            name: body.translations.fr.name,
            description: body.translations.fr.description ?? null,
            notesTop: body.translations.fr.notesTop ?? [],
            notesHeart: body.translations.fr.notesHeart ?? [],
            notesBase: body.translations.fr.notesBase ?? [],
          });
        }
      }
    });

    /* إعادة فحص شروط النشر بعد الحفظ */
    const after = (await loadProducts(app.db, [id]))[0]!;
    if (after.product.status === "published") {
      const problems = publishProblems(after);
      if (problems.length) {
        await app.db.update(products).set({ status: "draft" }).where(eq(products.id, id));
        throw badRequest("أُعيد المنتج إلى المسودة لأن بياناته غير مكتملة.", { problems });
      }
    }

    await writeAudit(app.db, req, { action: "product.updated", entity: "product", entityId: id, meta: { status: after.product.status } });
    return { ok: true };
  });

  app.delete(P + "/:id", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [row] = await app.db
      .update(products)
      .set({ deletedAt: new Date(), status: "hidden" })
      .where(and(eq(products.id, id)))
      .returning({ id: products.id, slug: products.slug });
    if (!row) throw notFound("المنتج غير موجود.");
    await writeAudit(app.db, req, { action: "product.deleted", entity: "product", entityId: id, meta: { slug: row.slug } });
    return { ok: true };
  });

  /* استبدال قائمة الأحجام والأسعار — مع تدقيق تغييرات الأسعار */
  app.put(P + "/:id/variants", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = variantsPayload.parse(req.body);
    const sizes = new Set(body.variants.map((v) => v.sizeLabel.toLocaleLowerCase()));
    if (sizes.size !== body.variants.length) throw badRequest("لا يمكن تكرار نفس الحجم مرتين.");
    const skus = new Set(body.variants.map((v) => v.sku.toLocaleUpperCase()));
    if (skus.size !== body.variants.length) throw badRequest("لا يمكن تكرار SKU داخل المنتج.");

    const loaded = (await loadProducts(app.db, [id]))[0];
    if (!loaded) throw notFound("المنتج غير موجود.");

    const priceChanges: Record<string, { from: number | null; to: number | null }> = {};
    try {
      await app.db.transaction(async (tx) => {
        const existing = loaded.variants;
        const keepIds: string[] = [];
        for (const v of body.variants) {
          const prev = v.id ? existing.find((e) => e.id === v.id) : undefined;
          if (prev) {
            if (prev.priceMru !== v.priceMru) priceChanges[v.sizeLabel] = { from: prev.priceMru, to: v.priceMru };
            await tx
              .update(productVariants)
              .set({
                sizeLabel: v.sizeLabel,
                sizeMl: v.sizeMl,
                sku: v.sku,
                priceMru: v.priceMru,
                compareAtPriceMru: v.compareAtPriceMru,
                stockQuantity: v.stockQuantity,
                lowStockThreshold: v.lowStockThreshold,
                type: v.type,
                isActive: v.isActive,
                isAvailable: v.isAvailable,
                sortOrder: v.sortOrder,
                updatedAt: new Date(),
              })
              .where(eq(productVariants.id, prev.id));
            keepIds.push(prev.id);
          } else {
            priceChanges[v.sizeLabel] = { from: null, to: v.priceMru };
            const [created] = await tx
              .insert(productVariants)
              .values({
                productId: id,
                sizeLabel: v.sizeLabel,
                sizeMl: v.sizeMl,
                sku: v.sku,
                priceMru: v.priceMru,
                compareAtPriceMru: v.compareAtPriceMru,
                stockQuantity: v.stockQuantity,
                lowStockThreshold: v.lowStockThreshold,
                type: v.type,
                isActive: v.isActive,
                isAvailable: v.isAvailable,
                sortOrder: v.sortOrder,
              })
              .returning({ id: productVariants.id });
            keepIds.push(created!.id);
          }
        }
        const removed = existing.filter((e) => !keepIds.includes(e.id));
        if (removed.length) {
          await tx.delete(productVariants).where(inArray(productVariants.id, removed.map((r) => r.id)));
        }
      });
    } catch (err: any) {
      if (err.code === "23505" || err.message?.includes("product_variants_sku_uq")) {
        throw conflict("رمز SKU المستخدم موجود بالفعل لعطر آخر. يرجى استخدام رمز فريد لكل حجم.");
      }
      throw err;
    }

    if (Object.keys(priceChanges).length) {
      await writeAudit(app.db, req, {
        action: "product.price_changed",
        entity: "product",
        entityId: id,
        meta: { changes: priceChanges },
      });
    }
    await writeAudit(app.db, req, { action: "product.variants_updated", entity: "product", entityId: id });
    return { ok: true };
  });

  /* استبدال صور المنتج (الرفع نفسه يتم عبر مسار الوسائط) */
  app.put(P + "/:id/images", { preHandler: requirePermission("products.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = productImagesSchema.parse(req.body);
    const exists = await app.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!exists[0]) throw notFound("المنتج غير موجود.");
    await app.db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.productId, id));
      for (const [i, img] of body.images.entries()) {
        await tx.insert(productImages).values({ productId: id, url: img.url, alt: img.alt, sortOrder: i });
      }
    });
    await writeAudit(app.db, req, { action: "product.images_updated", entity: "product", entityId: id, meta: { count: body.images.length } });
    return { ok: true };
  });
}
