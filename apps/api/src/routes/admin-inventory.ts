import type { FastifyInstance } from "fastify";
import { and, desc, eq, lte } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import {
  brands,
  inventoryMovements,
  products,
  productTranslations,
  productVariants,
} from "@falcon/database";
import { paginationSchema, stockAdjustSchema } from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { conflict, notFound } from "../lib/errors.js";
import { getSettingsGroup } from "../lib/settings.js";

export async function registerAdminInventoryRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/inventory`;

  app.get(P + "/movements", { preHandler: requirePermission("inventory.read") }, async (req) => {
    const q = paginationSchema.parse(req.query);
    const rows = await app.db
      .select({
        movement: inventoryMovements,
        size: productVariants.sizeLabel,
        productSlug: products.slug,
        nameAr: productTranslations.name,
      })
      .from(inventoryMovements)
      .innerJoin(productVariants, eq(productVariants.id, inventoryMovements.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "ar"))
      )
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(q.perPage)
      .offset((q.page - 1) * q.perPage);
    return { movements: rows, page: q.page, perPage: q.perPage };
  });

  app.get(P + "/low-stock", { preHandler: requirePermission("inventory.read") }, async () => {
    const rows = await app.db
      .select({
        variantId: productVariants.id,
        size: productVariants.sizeLabel,
        stock: productVariants.stockQuantity,
        lowStockThreshold: productVariants.lowStockThreshold,
        productSlug: products.slug,
        nameAr: productTranslations.name,
        brandName: brands.name,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "ar"))
      )
      .where(and(lte(productVariants.stockQuantity, productVariants.lowStockThreshold), eq(productVariants.isActive, true), eq(productVariants.isAvailable, true)))
      .orderBy(productVariants.stockQuantity);
    return { stockTracked: true, threshold: null, items: rows };
  });

  app.post(P + "/adjust", { preHandler: requirePermission("inventory.write") }, async (req) => {
    const body = stockAdjustSchema.parse(req.body);
    const newStock = await app.db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: productVariants.id, stock: productVariants.stockQuantity })
        .from(productVariants)
        .where(eq(productVariants.id, body.variantId))
        .for("update");
      const current = locked[0];
      if (!current) throw notFound("الحجم غير موجود.");
      const next = current.stock + body.delta;
      if (next < 0) {
        throw conflict("لا يمكن أن يصبح المخزون سالبًا.", { currentStock: current.stock });
      }
      await tx
        .update(productVariants)
        .set({ stockQuantity: next, updatedAt: new Date() })
        .where(eq(productVariants.id, body.variantId));
      await tx.insert(inventoryMovements).values({
        variantId: body.variantId,
        delta: body.delta,
        reason: body.reason,
        actorId: req.authUser!.id,
        note: body.note,
      });
      return next;
    });
    await writeAudit(app.db, req, {
      action: "inventory.stock_changed",
      entity: "variant",
      entityId: body.variantId,
      meta: { delta: body.delta, reason: body.reason, newStock },
    });
    return { ok: true, stock: newStock };
  });
}
