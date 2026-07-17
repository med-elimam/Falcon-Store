"use client";

import { usePathname } from "next/navigation";
import { usePublicSettings } from "./settings-context";
import { waLink } from "@/lib/format";
import { WhatsAppIcon } from "./icons";

/* زر واتساب عائم في كل صفحات المتجر — يظهر فقط إن أدخل صاحب المتجر رقمه،
   ويختفي في لوحة التحكم وصفحة إتمام الطلب حتى لا يشتت. */
export function WhatsAppFab() {
  const pathname = usePathname();
  const settings = usePublicSettings();
  const whatsapp = settings?.contact.whatsapp ?? null;
  if (!whatsapp || pathname.startsWith("/manage") || pathname.startsWith("/checkout")) return null;
  return (
    <a
      className="wa-fab"
      href={waLink(whatsapp, "السلام عليكم، أريد الاستفسار عن عطور فالكون ستور.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      title="تواصل معنا عبر واتساب"
    >
      <WhatsAppIcon />
    </a>
  );
}
