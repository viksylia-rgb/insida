import { createHash } from "node:crypto";
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
  let v = process.env[name];
  // Если AUTH_SECRET не задан, секрет выводится из (секретной) строки подключения к базе.
  // Это упрощает первую публикацию; для надёжности позже задайте AUTH_SECRET отдельно
  // (после смены секрета выпустите новые коды восстановления в админке).
  if (!v && process.env.DATABASE_URL) {
    v = createHash("sha256").update(`insida-auth:${process.env.DATABASE_URL}`).digest("base64url");
  }
  if (!v || v.length < 32) {
    throw new Error(`Переменная окружения ${name} не задана или слишком короткая. См. .env.example`);
  }
  return v;
}
