import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { customers, orders, products, productVariants } from "@falcon/database";
import { requirePermission } from "../plugins/auth.js";
import { mediaStorageMode } from "../lib/media-storage.js";

/** نظرة عامة مجمعة في طلب واحد لتقليل جولات الشبكة من لوحة الإدارة. */
export async function registerAdminOverviewRoutes(app: FastifyInstance): Promise<void> {
  app.get(`${API_PREFIX}/admin/overview`, { preHandler: requirePermission("dashboard.view") }, async () => {
    const since30 = new Date(Date.now() - 30 * 86400_000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [statusCounts, productCounts, customerCount, recentOrders, revenue30, todayOrders, outOfStock] = await Promise.all([
      app.db
        .select({ status: orders.status, n: sql<number>`count(*)::int` })
        .from(orders)
        .groupBy(orders.status),
      app.db
        .select({ status: products.status, n: sql<number>`count(*)::int` })
        .from(products)
        .where(isNull(products.deletedAt))
        .groupBy(products.status),
      app.db.select({ n: sql<number>`count(*)::int` }).from(customers),
      app.db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
      app.db
        .select({ total: sql<number>`coalesce(sum(${orders.totalMru}), 0)::int` })
        .from(orders)
        .where(and(gte(orders.createdAt, since30), ne(orders.status, "cancelled"))),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(gte(orders.createdAt, startOfToday)),
      app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(productVariants)
        .where(and(eq(productVariants.stockQuantity, 0), eq(productVariants.isActive, true))),
    ]);

    const low = await app.db
      .select({ n: sql<number>`count(*)::int` })
      .from(productVariants)
      .where(sql`${productVariants.stockQuantity} <= ${productVariants.lowStockThreshold} and ${productVariants.isActive} = true and ${productVariants.isAvailable} = true`);
    const lowStockCount = low[0]?.n ?? 0;

    const orderStatusMap = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
    const pendingOrdersCount = (orderStatusMap.new ?? 0) + (orderStatusMap.confirmed ?? 0) + (orderStatusMap.preparing ?? 0) + (orderStatusMap.out_for_delivery ?? 0);

    return {
      orderStatusCounts: orderStatusMap,
      productStatusCounts: Object.fromEntries(productCounts.map((r) => [r.status, r.n])),
      customerCount: customerCount[0]?.n ?? 0,
      revenue30dMru: revenue30[0]?.total ?? 0,
      lowStockCount,
      outOfStockCount: outOfStock[0]?.n ?? 0,
      todayOrdersCount: todayOrders[0]?.n ?? 0,
      pendingOrdersCount,
      stockTracked: true,
      mediaStorage: mediaStorageMode(app.env),
      recentOrders,
    };
  });
}
