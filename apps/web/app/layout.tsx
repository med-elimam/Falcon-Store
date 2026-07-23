import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource-variable/alexandria";
import "@fontsource-variable/manrope";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CartDrawer } from "@/components/cart-drawer";
import { Footer } from "@/components/footer";
import { SettingsProvider } from "@/components/settings-context";
import { ThemeProvider } from "@/components/theme-switcher";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { BrandAccent } from "@/components/brand-accent";
import { BrandIntro, INTRO_BOOTSTRAP, INTRO_CRITICAL_CSS } from "@/components/brand-intro";
import { accentVars } from "@/lib/accent";
import { getPublicSettings } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const nameAr = settings?.identity.nameAr ?? "فالكون ستور";
  const description =
    settings?.identity.description ?? "متجر عطور في نواكشوط: اختيارات نيش وديزاينر وتعبئة دقيقة بحجم 10ml.";
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
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  /* المظهر الافتراضي يحدده الأدمن من الإعدادات؛ اختيار الزائر المحفوظ محلياً يتقدم عليه */
  const defaultTheme = settings?.appearance?.defaultTheme ?? "light";
  const ssrResolved = defaultTheme === "dark" ? "dark" : "light";
  /* لون العلامة يُحقن سطرياً على <html> فيتقدّم على globals.css بلا وميض */
  const htmlStyle = { colorScheme: ssrResolved, ...accentVars(settings?.appearance?.accent) } as React.CSSProperties;
  return (
    <html
      lang="ar"
      dir="rtl"
      data-theme={ssrResolved}
      data-theme-mode={defaultTheme}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      style={htmlStyle}
    >
      <head>
        <meta name="theme-color" content={ssrResolved === "dark" ? "#0b090a" : "#f6f3f4"} data-falcon-theme="true" />
        <Script id="falcon-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('falcon-theme');var m=t==='light'||t==='dark'||t==='system'?t:'${defaultTheme}';var r=m==='light'||m==='dark'?m:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var d=document.documentElement;d.dataset.theme=r;d.dataset.themeMode=m;d.style.colorScheme=r;var c=document.querySelector('meta[name="theme-color"][data-falcon-theme]');if(c)c.content=r==='light'?'#f6f3f4':'#0b090a';}catch(e){}`}
        </Script>
        {/* الافتتاحية: CSS حرج يغطّي الشاشة فوراً + سكربت خام متزامن يدير الدورة
            قبل أول رسم (وسم خام لا next/script: التزامن هنا شرط لا تحسين) */}
        <style dangerouslySetInnerHTML={{ __html: INTRO_CRITICAL_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOTSTRAP }} />
      </head>
      <body suppressHydrationWarning>
        {/* غطاء الافتتاحية في الهيكل الثابت لا في محتوى الصفحة المتدفق: يوجد من
            أول إطار فيغطي بثّ الرئيسية كاملاً، ويُخفى قبل الرسم في بقية الصفحات */}
        <BrandIntro />
        <ThemeProvider defaultMode={defaultTheme}>
          <SettingsProvider value={settings}>
            <BrandAccent />
            <a href="#main" className="skip-link">
              انتقل إلى المحتوى
            </a>
            <SiteHeader />
            <main id="main">{children}</main>
            <Footer settings={settings} />
            <WhatsAppFab />
            <CartDrawer />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
