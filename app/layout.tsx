import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "فالكون ستور | عطور أصلية في نواكشوط", template: "%s | فالكون ستور" },
  description: "عطور أصلية مختارة وتعبئة 10ml دقيقة في نواكشوط. اطلب بسهولة عبر واتساب.",
  keywords: ["عطور", "نواكشوط", "موريتانيا", "عطور أصلية", "10ml", "Falcon Store"],
  openGraph: { title: "Falcon Store — The Scent Vault", description: "عطور أصلية. تعبئة دقيقة. حضور لا يُنسى.", images: ["/images/hero-wide.jpg"], locale: "ar_MR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#070707", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a href="#main" className="skip-link">انتقل إلى المحتوى</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
