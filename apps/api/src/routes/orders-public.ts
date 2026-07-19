import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { API_PREFIX } from "@falcon/config";
import { waMessageForOrder, type CurrencyDisplay } from "@falcon/shared";
import {
  addresses,
  customers,
  deliveryZones,
  inventoryMovements,
  orderItems,
  orders,
  orderStatusHistory,
  paymentMethods,
  productTranslations,
  productVariants,
  products,
  brands,
} from "@falcon/database";
import { normalizeMauritanianPhone, orderCreateSchema } from "@falcon/validation";
import { writeAudit } from "../lib/audit.js";
import { badRequest, conflict, notFound, tooMany } from "../lib/errors.js";
import { getSettingsGroup } from "../lib/settings.js";

/* حماية متسامحة من الطلبات الوهمية: سقف لعدد الطلبات من نفس الرقم خلال نافذة قصيرة.
   العميل الحقيقي لا يقترب منه، لكنه يكبح الإغراق الآلي الذي قد يستنزف المخزون. */
const RECENT_ORDER_WINDOW_MS = 10 * 60_000;
const RECENT_ORDER_CAP = 6;

interface OrderResponse {
  orderNumber: string;
  totalMru: number;
  subtotalMru: number;
  deliveryFeeMru: number | null;
  whatsappMessage: string;
  whatsappNumber: string | null;
  paymentMethodLabel: string;
  status: string;
  phone: string;
}

export async function registerOrderPublicRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    `${API_PREFIX}/orders`,
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = orderCreateSchema.parse(req.body);

      /* التكرار الآمن: نفس مفتاح الطلب يعيد نفس الطلب دون إنشاء نسخة جديدة */
      const existing = await app.db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, body.idempotencyKey))
        .limit(1);
      if (existing[0]) {
        const response = await buildResponse(app, existing[0].id);
        return reply.status(200).send(response);
      }

      /* كبح الإغراق لكل رقم هاتف — إعادة المحاولة بنفس مفتاح التكرار عادت أعلاه ولا تُحتسب هنا. */
      const since = new Date(Date.now() - RECENT_ORDER_WINDOW_MS);
      const [recent] = await app.db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.phone, body.phone), gte(orders.createdAt, since)));
      if ((recent?.n ?? 0) >= RECENT_ORDER_CAP) {
        throw tooMany("سجّلت عدة طلبات في وقت قصير. تواصل معنا عبر واتساب لإكمال طلبك.");
      }

      const [zone] = await app.db
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.id, body.deliveryZoneId), eq(deliveryZones.enabled, true)))
        .limit(1);
      if (!zone) throw badRequest("منطقة التوصيل المختارة غير متاحة حاليًا.");

      const [payment] = await app.db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, body.paymentMethodId), eq(paymentMethods.enabled, true)))
        .limit(1);
      if (!payment) throw badRequest("طريقة الدفع المختارة غير متاحة حاليًا.");

      const variantIds = body.items.map((i) => i.variantId);
      const variantRows = await app.db
        .select({
          variant: productVariants,
          product: products,
          brandName: brands.name,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .leftJoin(brands, eq(brands.id, products.brandId))
        .where(inArray(productVariants.id, variantIds));
      const names = await app.db
        .select()
        .from(productTranslations)
        .where(
          and(
            inArray(productTranslations.productId, variantRows.map((r) => r.product.id)),
            eq(productTranslations.locale, "ar")
          )
        );

      /* التحقق من كل عنصر: منشور، متاح، وله سعر محدد */
      const lines = body.items.map((item) => {
        const row = variantRows.find((r) => r.variant.id === item.variantId);
        if (!row || row.product.status !== "published" || row.product.deletedAt) {
          throw badRequest("أحد المنتجات في سلتك لم يعد معروضًا. حدّث السلة وأعد المحاولة.");
        }
        if (!row.variant.isActive || !row.variant.isAvailable) {
          throw conflict("أحد الأحجام المختارة غير متوفر حاليًا.", { variantId: item.variantId });
        }
        if (row.variant.priceMru === null) {
          throw badRequest("أحد الأحجام المختارة غير مكتمل ولم يعد معروضًا. حدّث السلة وأعد المحاولة.");
        }
        const nameAr = names.find((n) => n.productId === row.product.id)?.name ?? row.product.slug;
        return {
          item,
          variant: row.variant,
          product: row.product,
          brandName: row.brandName,
          nameAr,
          unitPrice: row.variant.priceMru,
          lineTotal: row.variant.priceMru * item.qty,
        };
      });

      const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      const deliveryFee = zone.feeMru;
      const total = subtotal + (deliveryFee ?? 0);

      const orderId = await app.db.transaction(async (tx) => {
        for (const line of lines) {
            const locked = await tx
              .select({ id: productVariants.id, stockQuantity: productVariants.stockQuantity })
              .from(productVariants)
              .where(eq(productVariants.id, line.variant.id))
              .for("update");
            const current = locked[0];
            if (!current || current.stockQuantity < line.item.qty) {
              throw conflict(`الكمية المطلوبة من «${line.nameAr} ${line.variant.sizeLabel}» غير متوفرة في المخزون.`, {
                variantId: line.variant.id,
                availableStock: current?.stockQuantity ?? 0,
              });
            }
            await tx
              .update(productVariants)
              .set({ stockQuantity: current.stockQuantity - line.item.qty, updatedAt: new Date() })
              .where(eq(productVariants.id, line.variant.id));
        }

        /* العميل والعنوان */
        const [customer] = await tx
          .insert(customers)
          .values({ phone: body.phone, name: body.customerName })
          .onConflictDoUpdate({
            target: customers.phone,
            set: { name: body.customerName, updatedAt: new Date() },
          })
          .returning({ id: customers.id });
        await tx.insert(addresses).values({
          customerId: customer!.id,
          area: zone.nameAr,
          detail: body.deliveryNote,
        });

        const seq = await tx.execute(sql`select nextval('order_number_seq') as n`);
        const seqRows = (seq as unknown as { rows?: { n: string | number }[] }).rows ?? (seq as unknown as { n: string | number }[]);
        const n = Array.isArray(seqRows) ? seqRows[0]?.n : undefined;
        const orderNumber = `FLC-${n}`;

        const [created] = await tx
          .insert(orders)
          .values({
            orderNumber,
            customerId: customer!.id,
            customerName: body.customerName,
            phone: body.phone,
            area: zone.nameAr,
            deliveryZoneId: zone.id,
            deliveryFeeMru: deliveryFee,
            deliveryNote: body.deliveryNote,
            paymentMethodId: payment.id,
            paymentMethodLabel: payment.labelAr,
            subtotalMru: subtotal,
            totalMru: total,
            hasUnpricedItems: false,
            status: "new",
            idempotencyKey: body.idempotencyKey,
          })
          .returning({ id: orders.id });
        const oid = created!.id;

        for (const line of lines) {
          await tx.insert(orderItems).values({
            orderId: oid,
            variantId: line.variant.id,
            productSlug: line.product.slug,
            nameAr: line.nameAr,
            brandName: line.brandName,
            size: line.variant.sizeLabel,
            qty: line.item.qty,
            unitPriceMru: line.unitPrice,
            lineTotalMru: line.lineTotal,
          });
          await tx.insert(inventoryMovements).values({
            variantId: line.variant.id,
            delta: -line.item.qty,
            reason: "order",
            orderId: oid,
          });
        }
        await tx.insert(orderStatusHistory).values({ orderId: oid, fromStatus: null, toStatus: "new" });
        return oid;
      });

      await writeAudit(app.db, req, {
        action: "order.created",
        entity: "order",
        entityId: orderId,
        meta: { totalMru: total, items: lines.length },
      });

      const response = await buildResponse(app, orderId);
      return reply.status(201).send(response);
    }
  );

  app.get(
    `${API_PREFIX}/orders/track`,
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const query = req.query as { orderNumber: string; phone: string };
      if (!query.orderNumber || !query.phone) {
        throw badRequest("رقم الطلب ورقم الهاتف مطلوبان.");
      }

      const normalizedPhone = query.phone.replace(/\D/g, "");
      if (!normalizedPhone) {
        throw badRequest("رقم هاتف غير صالح.");
      }

      const [order] = await app.db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, query.orderNumber.trim().toUpperCase()))
        .limit(1);

      if (!order) {
        throw notFound("لم نعثر على طلب بهذا الرقم. يرجى التأكد من الرقم.");
      }

      /* مطابقة تامة لا جزئية: التطابق الجزئي كان يسمح بتخمين الطلبات بجزء من الرقم.
         نوحّد الطرفين للصيغة القياسية (222########) قبل المقارنة كي نتسامح مع صيغ الإدخال
         (+222، 00222، فواصل) لكن نرفض أي رقم غير مطابق بالكامل. */
      const queryCanonical = normalizeMauritanianPhone(query.phone);
      const orderCanonical = normalizeMauritanianPhone(order.phone);
      const orderPhoneClean = order.phone.replace(/\D/g, "");
      const exactMatch =
        (queryCanonical !== null && orderCanonical !== null && queryCanonical === orderCanonical) ||
        (normalizedPhone.length >= 8 && normalizedPhone === orderPhoneClean);
      if (!exactMatch) {
        throw badRequest("رقم الهاتف المدخل لا يتطابق مع رقم الهاتف المسجل في الطلب.");
      }

      const items = await app.db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const history = await app.db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id))
        .orderBy(asc(orderStatusHistory.createdAt));

      const contact = await getSettingsGroup(app.db, "contact");

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customerName: order.customerName,
          phone: order.phone,
          area: order.area,
          deliveryFeeMru: order.deliveryFeeMru,
          subtotalMru: order.subtotalMru,
          totalMru: order.totalMru,
        },
        items: items.map((i) => ({
          id: i.id,
          nameAr: i.nameAr,
          brandName: i.brandName,
          size: i.size,
          qty: i.qty,
          unitPriceMru: i.unitPriceMru,
          lineTotalMru: i.lineTotalMru,
        })),
        history: history.map((h) => ({
          status: h.toStatus,
          createdAt: h.createdAt,
          note: h.note,
        })),
        support: {
          whatsapp: contact.whatsapp as string | null,
          phone: contact.phone as string | null,
        }
      };
    }
  );
}

async function buildResponse(app: FastifyInstance, orderId: string): Promise<OrderResponse> {
  const [order] = await app.db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw notFound();
  const items = await app.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const contact = await getSettingsGroup(app.db, "contact");
  const commerce = await getSettingsGroup(app.db, "commerce");
  const whatsappMessage = waMessageForOrder({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    area: order.area,
    paymentLabel: order.paymentMethodLabel,
    deliveryNote: order.deliveryNote,
    lines: items.map((i) => ({ nameAr: i.nameAr, size: i.size, qty: i.qty, lineTotalMru: i.lineTotalMru })),
    totalMru: order.totalMru,
    display: commerce.currencyDisplay as CurrencyDisplay,
  });
  return {
    orderNumber: order.orderNumber,
    totalMru: order.totalMru,
    subtotalMru: order.subtotalMru,
    deliveryFeeMru: order.deliveryFeeMru,
    whatsappMessage,
    whatsappNumber: (contact.whatsapp as string | null) ?? null,
    paymentMethodLabel: order.paymentMethodLabel,
    status: order.status,
    phone: order.phone,
  };
}
