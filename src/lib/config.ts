/** Централизованные настройки приложения из переменных окружения. */
export const config = {
  get siteUrl() {
    return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get trustedProxyCount() {
    return Math.max(0, Number(process.env.TRUSTED_PROXY_COUNT ?? 0) || 0);
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  siteName: "INSIDA",
  siteDescription:
    "INSIDA — независимый журнал о психологии и самопознании: научно обоснованные материалы простым языком, тесты для саморефлексии, практики и программы самостоятельного изучения.",
};

export function requireSecret(name: "AUTH_SECRET"): string {
  const v = process.env[name];
  if (!v || v.length < 32) {
    throw new Error(`Переменная окружения ${name} не задана или слишком короткая. См. .env.example`);
  }
  return v;
}
