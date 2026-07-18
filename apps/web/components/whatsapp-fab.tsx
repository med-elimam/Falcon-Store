"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePublicSettings } from "./settings-context";
import { waLink } from "@/lib/format";
import { WhatsAppIcon } from "./icons";

/* زر واتساب عائم في صفحات التصفح — يختفي في الإدارة والإتمام والتواصل،
   ويتوارى تلقائياً قرب أزرار واتساب الأصلية والتذييل حتى لا يغطي المحتوى. */
export function WhatsAppFab() {
  const pathname = usePathname();
  const settings = usePublicSettings();
  const whatsapp = settings?.contact.whatsapp ?? null;
  const [obscured, setObscured] = useState(false);
  const isExcludedRoute =
    pathname.startsWith("/manage") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/product/");

  useEffect(() => {
    if (!whatsapp || isExcludedRoute || typeof IntersectionObserver === "undefined") {
      return;
    }

    const visibleTargets = new Set<Element>();
    const observedTargets = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleTargets.add(entry.target);
          else visibleTargets.delete(entry.target);
        });
        setObscured(visibleTargets.size > 0);
      },
      { threshold: 0.12, rootMargin: "24px 0px 24px" }
    );

    const observeTargets = () => {
      visibleTargets.forEach((target) => {
        if (!target.isConnected) visibleTargets.delete(target);
      });
      document
        .querySelectorAll(".hero-trust, .product-card, .btn-whatsapp, .contact-card.is-primary, .site-footer")
        .forEach((target) => {
          if (observedTargets.has(target)) return;
          observedTargets.add(target);
          observer.observe(target);
        });
      setObscured(visibleTargets.size > 0);
    };

    observeTargets();
    const mutationObserver = new MutationObserver(observeTargets);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      visibleTargets.clear();
    };
  }, [isExcludedRoute, pathname, whatsapp]);

  if (!whatsapp || isExcludedRoute) return null;
  return (
    <a
      className="wa-fab"
      data-obscured={obscured || undefined}
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
