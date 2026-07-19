import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { authed, bootstrapOwner, createTestApp, login, TEST_ORIGIN, type TestContext } from "./helpers.js";

interface AdminProduct {
  slug: string;
  rawVariants: { id: string; sizeLabel: string; priceMru: number | null; stockQuantity: number }[];
}

describe("order creation, stock and idempotency", () => {
  let ctx: TestContext;
  let ownerCookie: string;
  let variantId: string;
  let zoneId: string;
  let paymentId: string;

  async function getVariantStock(id: string): Promise<number> {
    const res = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/products", headers: authed(ownerCookie) });
    const products = res.json().products as (AdminProduct & { rawVariants: { id: string; stockQuantity: number }[] })[];
    for (const p of products) {
      const v = p.rawVariants.find((x) => x.id === id);
      if (v) return v.stockQuantity;
    }
    throw new Error("variant not found");
  }

  async function getRevenue30d(): Promise<number> {
    const overview = await ctx.app.inject({
      method: "GET",
      url: "/api/v1/admin/overview",
      headers: authed(ownerCookie),
    });
    expect(overview.statusCode).toBe(200);
    return overview.json().revenue30dMru as number;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    await bootstrapOwner(ctx.app);
    ownerCookie = await login(ctx.app);

    /* تفعيل التتبع الكمي للمخزون */
    const ops = await ctx.app.inject({
      method: "PUT",
      url: "/api/v1/admin/settings/operations",
      headers: authed(ownerCookie),
      payload: { defaultStockBehavior: "deduct", lowStockThreshold: 3 },
    });
    expect(ops.statusCode).toBe(200);

    /* تفعيل طريقة دفع ومنطقة توصيل حقيقيتين من بيانات الزرع */
    const settings = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/settings", headers: authed(ownerCookie) });
    const pm = settings.json().paymentMethods.find((m: { key: string }) => m.key === "cod");
    paymentId = pm.id;
    await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/settings/payment-methods/${paymentId}`,
      headers: authed(ownerCookie),
      payload: { enabled: true },
    });
    const zone = settings.json().deliveryZones[0];
    zoneId = zone.id;
    await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/settings/delivery-zones/${zoneId}`,
      headers: authed(ownerCookie),
      payload: { enabled: true, feeMru: 100 },
    });

    /* منتج منشور بسعر محدد + مخزون 5 */
    const products = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/products", headers: authed(ownerCookie) });
    const aventus = (products.json().products as AdminProduct[]).find((p) => p.slug === "creed-aventus")!;
    variantId = aventus.rawVariants.find((v) => v.sizeLabel === "10ml")!.id;
    const adjust = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/inventory/adjust",
      headers: authed(ownerCookie),
      payload: { variantId, delta: 5, reason: "restock" },
    });
    expect(adjust.statusCode).toBe(200);
  });

  it("creates an order inside a transaction and decrements stock", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { origin: TEST_ORIGIN },
      payload: {
        customerName: "زبون تجريبي",
        phone: "22212345678",
        deliveryZoneId: zoneId,
        paymentMethodId: paymentId,
        idempotencyKey: randomUUID(),
        items: [{ variantId, qty: 2 }],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.orderNumber).toMatch(/^FLC-\d+$/);
    expect(body.subtotalMru).toBe(3400);
    expect(body.totalMru).toBe(3500);
    expect(body.whatsappMessage).toContain(body.orderNumber);
    expect(await getVariantStock(variantId)).toBe(3);
  });

  it("returns the same order for a repeated idempotency key without touching stock", async () => {
    const key = randomUUID();
    const payload = {
      customerName: "زبون مكرر",
      phone: "22287654321",
      deliveryZoneId: zoneId,
      paymentMethodId: paymentId,
      idempotencyKey: key,
      items: [{ variantId, qty: 1 }],
    };
    const first = await ctx.app.inject({ method: "POST", url: "/api/v1/orders", headers: { origin: TEST_ORIGIN }, payload });
    expect(first.statusCode).toBe(201);
    const second = await ctx.app.inject({ method: "POST", url: "/api/v1/orders", headers: { origin: TEST_ORIGIN }, payload });
    expect(second.statusCode).toBe(200);
    expect(second.json().orderNumber).toBe(first.json().orderNumber);
    expect(await getVariantStock(variantId)).toBe(2);
  });

  it("rejects an order that exceeds available stock with a calm 409", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { origin: TEST_ORIGIN },
      payload: {
        customerName: "زبون",
        phone: "22200112233",
        deliveryZoneId: zoneId,
        paymentMethodId: paymentId,
        idempotencyKey: randomUUID(),
        items: [{ variantId, qty: 10 }],
      },
    });
    expect(res.statusCode).toBe(409);
    expect(await getVariantStock(variantId)).toBe(2);
  });

  it("rejects incomplete hidden variants as unavailable", async () => {
    const products = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/products", headers: authed(ownerCookie) });
    const aventus = (products.json().products as AdminProduct[]).find((p) => p.slug === "creed-aventus")!;
    const unpriced = aventus.rawVariants.find((v) => v.sizeLabel === "100ml")!;
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { origin: TEST_ORIGIN },
      payload: {
        customerName: "زبون",
        phone: "22200112233",
        deliveryZoneId: zoneId,
        paymentMethodId: paymentId,
        idempotencyKey: randomUUID(),
        items: [{ variantId: unpriced.id, qty: 1 }],
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("restores stock exactly once when an order is cancelled", async () => {
    const key = randomUUID();
    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { origin: TEST_ORIGIN },
      payload: {
        customerName: "زبون إلغاء",
        phone: "22233445566",
        deliveryZoneId: zoneId,
        paymentMethodId: paymentId,
        idempotencyKey: key,
        items: [{ variantId, qty: 2 }],
      },
    });
    expect(created.statusCode).toBe(201);
    expect(await getVariantStock(variantId)).toBe(0);
    const revenueBeforeCancel = await getRevenue30d();

    const list = await ctx.app.inject({
      method: "GET",
      url: `/api/v1/admin/orders?q=${created.json().orderNumber}`,
      headers: authed(ownerCookie),
    });
    const orderId = list.json().orders[0].id as string;

    const cancel = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/orders/${orderId}/status`,
      headers: authed(ownerCookie),
      payload: { status: "cancelled", note: "طلب اختبار" },
    });
    expect(cancel.statusCode).toBe(200);
    expect(await getVariantStock(variantId)).toBe(2);
    expect(await getRevenue30d()).toBe(revenueBeforeCancel - created.json().totalMru);

    const detail = await ctx.app.inject({ method: "GET", url: `/api/v1/admin/orders/${orderId}`, headers: authed(ownerCookie) });
    const history = detail.json().history as { toStatus: string }[];
    expect(history.some((h) => h.toStatus === "cancelled")).toBe(true);

    /* تغيير حالة أخرى بعد الإلغاء لا يعيد المخزون مرة ثانية */
    const reopen = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/orders/${orderId}/status`,
      headers: authed(ownerCookie),
      payload: { status: "new" },
    });
    expect(reopen.statusCode).toBe(200);
    expect(await getVariantStock(variantId)).toBe(2);
    expect(await getRevenue30d()).toBe(revenueBeforeCancel);

    /* إلغاء ثانٍ بعد إعادة الفتح لا يعيد المخزون من جديد — كان الخلل يضيف الكمية كل دورة إلغاء */
    const cancelAgain = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/orders/${orderId}/status`,
      headers: authed(ownerCookie),
      payload: { status: "cancelled", note: "إلغاء ثانٍ" },
    });
    expect(cancelAgain.statusCode).toBe(200);
    expect(await getVariantStock(variantId)).toBe(2);
  });

  it("rejects a partial phone on tracking but accepts the full number in any format", async () => {
    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/orders",
      headers: { origin: TEST_ORIGIN },
      payload: {
        customerName: "زبون تتبّع",
        phone: "22239998877",
        deliveryZoneId: zoneId,
        paymentMethodId: paymentId,
        idempotencyKey: randomUUID(),
        items: [{ variantId, qty: 1 }],
      },
    });
    expect(created.statusCode).toBe(201);
    const orderNumber = created.json().orderNumber as string;

    /* جزء من الرقم لم يعد يكفي — التطابق الجزئي كان يسمح بتخمين طلبات الغير */
    const partial = await ctx.app.inject({
      method: "GET",
      url: `/api/v1/orders/track?orderNumber=${orderNumber}&phone=39998`,
    });
    expect(partial.statusCode).toBe(400);

    /* الرقم الكامل يعمل، ويتسامح مع صيغة +222 والمسافات */
    const exact = await ctx.app.inject({
      method: "GET",
      url: `/api/v1/orders/track?orderNumber=${orderNumber}&phone=${encodeURIComponent("+222 39 99 88 77")}`,
    });
    expect(exact.statusCode).toBe(200);
    expect(exact.json().order.orderNumber).toBe(orderNumber);
  });
});
