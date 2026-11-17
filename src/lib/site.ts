/** Адрес сайта и префикс пути (для GitHub Pages сайт живёт в подпапке /insida). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Путь к файлу из public/ с учётом подпапки сайта: asset("/images/a.jpg"). */
export function asset(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (/^(https?:|data:|blob:|mailto:|tel:|#)/.test(p)) return p;
  return `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
}

export const SITE_NAME = "INSIDA";
export const SITE_DESCRIPTION =
  "INSIDA — пространство для понимания себя: научно обоснованные материалы о психологии простым языком, тесты для саморефлексии, практики и программы самостоятельного изучения.";
