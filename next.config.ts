import type { NextConfig } from "next";

/**
 * Статический сайт для GitHub Pages: при сборке все страницы превращаются в обычные HTML-файлы (папка out/).
 * NEXT_PUBLIC_BASE_PATH — подпапка сайта (для https://<логин>.github.io/insida это "/insida";
 * для собственного домена — пусто).
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
