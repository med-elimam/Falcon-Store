import { NextResponse } from "next/server";
import { STORE, waLink } from "@/lib/config";
import { formatMRU } from "@/lib/format";
import type { CartItem } from "@/lib/cart";

type OrderBody = { name?: string; phone?: string; area?: string; deliveryNote?: string; payment?: string; items?: CartItem[]; total?: number };

export async function POST(request: Request) {
  let body: OrderBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 }); }
  if (!body.name || !body.phone || !body.area || !body.payment || !body.items?.length) return NextResponse.json({ error: "أكمل البيانات المطلوبة وأضف منتجاً واحداً على الأقل" }, { status: 400 });
  const orderNumber = `FLC-${String(Date.now()).slice(-6)}`;
  const lines = body.items.map((item) => `${item.nameAr} — ${item.size} × ${item.qty}${item.price === null ? " — السعر عند التأكيد" : ` — ${formatMRU(item.price * item.qty)}`}`).join("\n");
  const message = `طلب جديد #${orderNumber}\n\nالعميل: ${body.name}\nالهاتف: ${body.phone}\nالمنطقة: ${body.area}\nطريقة الدفع: ${body.payment}\n${body.deliveryNote ? `ملاحظة: ${body.deliveryNote}\n` : ""}\n${lines}\n\nالإجمالي المبدئي: ${formatMRU(body.total ?? 0)}`;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let persisted = false;
  if (supabaseUrl && serviceKey) {
    const response = await fetch(`${supabaseUrl}/rest/v1/orders`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ order_number: orderNumber, customer_name: body.name, phone: body.phone, area: body.area, delivery_note: body.deliveryNote || null, payment_method: body.payment, items: body.items, total_mru: body.total ?? 0, status: "new" }) });
    if (!response.ok) return NextResponse.json({ error: "تعذر حفظ الطلب. راجع إعدادات قاعدة البيانات." }, { status: 502 });
    persisted = true;
  }
  return NextResponse.json({ orderNumber, whatsappUrl: waLink(message), persisted, store: STORE.nameEn });
}
