import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Alexandria, Bodoni_Moda, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { SettingsProvider } from "@/components/settings-context";
import { ThemeProvider } from "@/components/theme-switcher";
import { getPublicSettings } from "@/lib/api";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const nameAr = settings?.identity.nameAr ?? "فالكون ستور";
  const description =
    settings?.identity.description ?? "متجر عطور في نواكشوط: اختيارات نيش ومصممين وتعبئة دقيقة بحجم 10ml.";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: `${nameAr} | عطور نواكشوط`, template: `%s | ${nameAr}` },
    description,
    openGraph: {
      title: "Falcon Store — The Scent Vault",
      description,
      images: ["/images/hero-wide.jpg"],
      locale: "ar_MR",
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${alexandria.variable} ${bodoni.variable} ${inter.variable}`}>
      <head>
        <meta name="theme-color" content="#0b090a" data-falcon-theme="true" />
        <Script id="falcon-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('falcon-theme');var m=t==='light'||t==='dark'||t==='system'?t:'system';var r=m==='light'||m==='dark'?m:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var d=document.documentElement;d.dataset.theme=r;d.dataset.themeMode=m;d.style.colorScheme=r;var c=document.querySelector('meta[name="theme-color"][data-falcon-theme]');if(c)c.content=r==='light'?'#f6f3f4':'#0b090a';}catch(e){}`}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <SettingsProvider value={settings}>
            <a href="#main" className="skip-link">
              انتقل إلى المحتوى
            </a>
            <SiteHeader />
            <main id="main">{children}</main>
            <Footer settings={settings} />
            <CartDrawer />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
