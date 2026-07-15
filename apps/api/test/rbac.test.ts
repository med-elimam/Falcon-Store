import { beforeAll, describe, expect, it } from "vitest";
import { authed, bootstrapOwner, createTestApp, login, type TestContext } from "./helpers.js";

describe("role-based access control", () => {
  let ctx: TestContext;
  let ownerCookie: string;
  let orderStaffCookie: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    await bootstrapOwner(ctx.app);
    ownerCookie = await login(ctx.app);

    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/staff",
      headers: authed(ownerCookie),
      payload: {
        email: "orders@falcon.test",
        displayName: "موظف الطلبات",
        role: "order_staff",
        tempPassword: "TempStaffPass123!",
      },
    });
    expect(created.statusCode).toBe(201);
    orderStaffCookie = await login(ctx.app, "orders@falcon.test", "TempStaffPass123!");
  });

  it("lets order staff read orders but denies settings, staff and audit", async () => {
    const orders = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/orders", headers: authed(orderStaffCookie) });
    expect(orders.statusCode).toBe(200);

    const settings = await ctx.app.inject({
      method: "PUT",
      url: "/api/v1/admin/settings/contact",
      headers: authed(orderStaffCookie),
      payload: { whatsapp: "22212345678" },
    });
    expect(settings.statusCode).toBe(403);

    const staff = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/staff",
      headers: authed(orderStaffCookie),
      payload: { email: "x@falcon.test", displayName: "x", role: "manager", tempPassword: "TempStaffPass123!" },
    });
    expect(staff.statusCode).toBe(403);

    const audit = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/audit", headers: authed(orderStaffCookie) });
    expect(audit.statusCode).toBe(403);

    const products = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/products",
      headers: authed(orderStaffCookie),
      payload: { slug: "should-fail", translations: { ar: { name: "منتج" } } },
    });
    expect(products.statusCode).toBe(403);
  });

  it("denies protected data to a session-less request even when the route is known", async () => {
    for (const url of [
      "/api/v1/admin/overview",
      "/api/v1/admin/products",
      "/api/v1/admin/orders",
      "/api/v1/admin/settings",
      "/api/v1/admin/staff",
      "/api/v1/admin/audit",
      "/api/v1/admin/media",
    ]) {
      const res = await ctx.app.inject({ method: "GET", url });
      expect(res.statusCode, url).toBe(401);
      expect(res.body).not.toContain("orderNumber");
    }
  });

  it("prevents disabling or demoting the owner account", async () => {
    const staffList = await ctx.app.inject({ method: "GET", url: "/api/v1/admin/staff", headers: authed(ownerCookie) });
    const owner = staffList.json().staff.find((u: { roleKey: string }) => u.roleKey === "owner");
    const res = await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/staff/${owner.id}`,
      headers: authed(ownerCookie),
      payload: { isActive: false },
    });
    expect(res.statusCode).toBe(400);
  });

  it("revokes access immediately when a staff account is deactivated", async () => {
    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/v1/admin/staff",
      headers: authed(ownerCookie),
      payload: { email: "temp@falcon.test", displayName: "مؤقت", role: "inventory_staff", tempPassword: "TempStaffPass123!" },
    });
    const id = created.json().id as string;
    const cookie = await login(ctx.app, "temp@falcon.test", "TempStaffPass123!");
    const before = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(cookie) });
    expect(before.statusCode).toBe(200);

    await ctx.app.inject({
      method: "PATCH",
      url: `/api/v1/admin/staff/${id}`,
      headers: authed(ownerCookie),
      payload: { isActive: false },
    });
    const after = await ctx.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: authed(cookie) });
    expect(after.statusCode).toBe(401);
  });
});
