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
import "@/styles/admin.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieNote } from "@/components/CookieNote";
import { themeInitScript } from "@/components/ThemeToggle";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: "INSIDA — пространство для понимания себя", template: "%s — INSIDA" },
  description: config.siteDescription,
  applicationName: "INSIDA",
  openGraph: { type: "website", locale: "ru_RU", siteName: "INSIDA", title: "INSIDA — пространство для понимания себя", description: config.siteDescription },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4eae0" },
    { media: "(prefers-color-scheme: dark)", color: "#2c1c1a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
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
