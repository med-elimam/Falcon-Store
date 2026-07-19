import type { FastifyInstance } from "fastify";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { ORDER_STATUSES, type OrderStatus } from "@falcon/shared";
import {
  customers,
  inventoryMovements,
  orderItems,
  orders,
  orderStatusHistory,
  productVariants,
} from "@falcon/database";
import { orderStatusSchema, paginationSchema, uuidSchema } from "@falcon/validation";
import { z } from "zod";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

const listQuery = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

function csvEscape(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function registerAdminOrderRoutes(app: FastifyInstance): Promise<void> {
  const P = `${API_PREFIX}/admin/orders`;

  app.get(P, { preHandler: requirePermission("orders.read") }, async (req) => {
    const q = listQuery.parse(req.query);
    const where = and(
      q.status ? eq(orders.status, q.status) : undefined,
      q.q ? or(ilike(orders.orderNumber, `%${q.q}%`), ilike(orders.customerName, `%${q.q}%`), ilike(orders.phone, `%${q.q}%`)) : undefined
    );
    const [rows, totalRows] = await Promise.all([
      app.db
        .select()
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(q.perPage)
        .offset((q.page - 1) * q.perPage),
      app.db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
    ]);
    return { orders: rows, total: totalRows[0]?.n ?? 0, page: q.page, perPage: q.perPage };
  });

  app.get(P + "/export.csv", { preHandler: requirePermission("orders.read") }, async (req, reply) => {
    const rows = await app.db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5000);
    const header = "order_number,created_at,status,customer_name,phone,area,payment_method,subtotal_mru,delivery_fee_mru,total_mru";
    const lines = rows.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.status,
        csvEscape(o.customerName),
        o.phone,
        csvEscape(o.area),
        csvEscape(o.paymentMethodLabel),
        o.subtotalMru,
        o.deliveryFeeMru ?? "",
        o.totalMru,
      ].join(",")
    );
    await writeAudit(app.db, req, { action: "order.exported", meta: { count: rows.length } });
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="falcon-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    return "﻿" + [header, ...lines].join("\n");
  });

  app.get(P + "/:id", { preHandler: requirePermission("orders.read") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [order] = await app.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw notFound("الطلب غير موجود.");
    const [items, history] = await Promise.all([
      app.db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      app.db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id)).orderBy(desc(orderStatusHistory.createdAt)),
    ]);
    return { order, items, history };
  });

  app.patch(P + "/:id/status", { preHandler: requirePermission("orders.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const body = orderStatusSchema.parse(req.body);
    const [order] = await app.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw notFound("الطلب غير موجود.");
    const from = order.status as OrderStatus;
    if (from === body.status) throw badRequest("الطلب في هذه الحالة بالفعل.");

    await app.db.transaction(async (tx) => {
      await tx.update(orders).set({ status: body.status, updatedAt: new Date() }).where(eq(orders.id, id));
      await tx.insert(orderStatusHistory).values({
        orderId: id,
        fromStatus: from,
        toStatus: body.status,
        actorId: req.authUser!.id,
        note: body.note,
      });
      /* إرجاع المخزون عند الإلغاء — مرة واحدة فقط طوال عمر الطلب.
         نحرس بوجود حركة «cancel» سابقة لهذا الطلب: هكذا لا يتضخّم المخزون عند تكرار
         دورة إلغاء ⇄ إعادة تفعيل (كان كل إلغاء يعيد الكمية من جديد). */
      if (body.status === "cancelled" && from !== "cancelled") {
        const [alreadyRestored] = await tx
          .select({ id: inventoryMovements.id })
          .from(inventoryMovements)
          .where(and(eq(inventoryMovements.orderId, id), eq(inventoryMovements.reason, "cancel")))
          .limit(1);
        if (!alreadyRestored) {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
          for (const item of items) {
            if (!item.variantId) continue;
            await tx
              .update(productVariants)
              .set({ stockQuantity: sql`${productVariants.stockQuantity} + ${item.qty}`, updatedAt: new Date() })
              .where(eq(productVariants.id, item.variantId));
            await tx.insert(inventoryMovements).values({
              variantId: item.variantId,
              delta: item.qty,
              reason: "cancel",
              orderId: id,
              actorId: req.authUser!.id,
            });
          }
        }
      }
    });

    await writeAudit(app.db, req, {
      action: "order.status_changed",
      entity: "order",
      entityId: id,
      meta: { from, to: body.status },
    });
    return { ok: true };
  });

  app.get(`${API_PREFIX}/admin/customers`, { preHandler: requirePermission("customers.read") }, async (req) => {
    const q = paginationSchema.parse(req.query);
    const where = q.q ? or(ilike(customers.name, `%${q.q}%`), ilike(customers.phone, `%${q.q}%`)) : undefined;
    const [rows, totalRows] = await Promise.all([
      app.db
        .select({
          customer: customers,
          orderCount: sql<number>`(select count(*)::int from ${orders} where ${orders.customerId} = ${customers.id})`,
          totalSpentMru: sql<number>`coalesce((select sum(${orders.totalMru})::int from ${orders} where ${orders.customerId} = ${customers.id} and ${orders.status} != 'cancelled'), 0)`,
        })
        .from(customers)
        .where(where)
        .orderBy(desc(customers.createdAt))
        .limit(q.perPage)
        .offset((q.page - 1) * q.perPage),
      app.db.select({ n: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);
    return { customers: rows, total: totalRows[0]?.n ?? 0, page: q.page, perPage: q.perPage };
  });
}
