import { beforeAll, describe, expect, it } from "vitest";
import { authed, bootstrapOwner, createTestApp, login, type TestContext } from "./helpers.js";

interface AdminProduct {
  id: string;
  slug: string;
  publishProblems: string[];
  rawVariants: {
    id: string;
    sizeLabel: string;
    sizeMl: number;
    sku: string;
    priceMru: number | null;
    compareAtPriceMru: number | null;
    stockQuantity: number;
    lowStockThreshold: number;
    type: "decant" | "full_bottle";
    isActive: boolean;
    isAvailable: boolean;
    sortOrder: number;
  }[];
}

describe("price updates, stock updates and publish gating", () => {
  let ctx: TestContext;
  let ownerCookie: string;

  async function getProduct(slug: string): Promise<AdminProduct> {
    const res = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/products", headers: authed(ownerCookie) });
    return (res.json().products as AdminProduct[]).find((p) => p.slug === slug)!;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    await bootstrapOwner(ctx.app);
    ownerCookie = await login(ctx.app);
  });

  it("updates a variant price, audits the change, and reflects it in the public catalog", async () => {
    const product = await getProduct("uniquee-akdeniz");
    const res = await ctx.app.inject({
      method: "PUT",
      url: `/api/v1/admin/products/${product.id}/variants`,
      headers: authed(ownerCookie),
      payload: {
        variants: product.rawVariants.map((variant) => ({
          ...variant,
          priceMru: variant.sizeLabel === "10ml" ? 1350 : variant.priceMru,
        })),
      },
    });
    expect(res.statusCode).toBe(200);

    const audit = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/audit?q=price_changed", headers: authed(ownerCookie) });
    expect(audit.json().logs.length).toBeGreaterThan(0);
    const entry = audit.json().logs[0];
    expect(entry.meta.changes["10ml"]).toEqual({ from: 1300, to: 1350 });

    const pub = await ctx.app.inject({ method: "GET", url: "/api/v1/catalog/products/uniquee-akdeniz" });
    expect(pub.statusCode).toBe(200);
    expect(pub.json().product.startingPriceMru).toBe(1350);
  });

  it("blocks publishing a product with missing required data and lists the problems", async () => {
    const kirke = await getProduct("tiziana-terenzi-kirke");
    expect(kirke.publishProblems.length).toBeGreaterThan(0);
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/products/${kirke.id}`,
      headers: authed(ownerCookie),
      payload: { status: "published" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details.problems.join(" ")).toContain("سعر");

    /* المسودات لا تظهر في الكتالوج العام */
    const pub = await ctx.app.inject({ method: "GET", url: "/api/v1/catalog/products/tiziana-terenzi-kirke" });
    expect(pub.statusCode).toBe(404);
  });

  it("publishes a draft once its price is set", async () => {
    const kirke = await getProduct("tiziana-terenzi-kirke");
    await ctx.app.inject({
      method: "PUT",
      url: `/api/v1/admin/products/${kirke.id}/variants`,
      headers: authed(ownerCookie),
      payload: {
        variants: kirke.rawVariants.map((variant) => ({
          ...variant,
          priceMru: variant.sizeLabel === "10ml" ? 1500 : 12000,
          stockQuantity: variant.sizeLabel === "10ml" ? 4 : 2,
          isActive: true,
          isAvailable: true,
        })),
      },
    });
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/products/${kirke.id}`,
      headers: authed(ownerCookie),
      payload: { status: "published" },
    });
    expect(res.statusCode).toBe(200);
    const pub = await ctx.app.inject({ method: "GET", url: "/api/v1/catalog/products/tiziana-terenzi-kirke" });
    expect(pub.statusCode).toBe(200);
    expect(pub.json().product.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizeLabel: "10ml", priceMru: 1500, stockQuantity: 4 }),
        expect.objectContaining({ sizeLabel: "100ml", priceMru: 12000, stockQuantity: 2 }),
      ])
    );
  });

  it("adjusts stock through the ledger and refuses negative totals", async () => {
    const product = await getProduct("creed-silver-mountain-water");
    const variant = product.rawVariants.find((v) => v.sizeLabel === "10ml")!;
    const up = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/inventory/adjust",
      headers: authed(ownerCookie),
      payload: { variantId: variant.id, delta: 4, reason: "restock", note: "توريد أولي" },
    });
    expect(up.statusCode).toBe(200);
    expect(up.json().stock).toBe(4);

    const down = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/inventory/adjust",
      headers: authed(ownerCookie),
      payload: { variantId: variant.id, delta: -10, reason: "correction" },
    });
    expect(down.statusCode).toBe(409);

    const movements = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/inventory/movements", headers: authed(ownerCookie) });
    expect(movements.json().movements.some((m: { movement: { note: string | null } }) => m.movement.note === "توريد أولي")).toBe(true);

    const audit = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/audit?q=stock_changed", headers: authed(ownerCookie) });
    expect(audit.json().logs.length).toBeGreaterThan(0);
  });
});
