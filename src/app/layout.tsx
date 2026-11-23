import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/report.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieNote } from "@/components/CookieNote";
import { themeInitScript } from "@/components/ThemeToggle";
import { SITE_URL, SITE_DESCRIPTION, asset } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL + "/"),
  title: { default: "INSIDA — пространство для понимания себя", template: "%s — INSIDA" },
  description: SITE_DESCRIPTION,
  applicationName: "INSIDA",
  openGraph: { type: "website", locale: "ru_RU", siteName: "INSIDA", title: "INSIDA — пространство для понимания себя", description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  icons: { icon: asset("/icon.svg") },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#fffbf8" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Политика безопасности: никаких внешних скриптов, шрифтов и запросов */}
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Перейти к содержанию</a>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <CookieNote />
      </body>
    </html>
  );
}
