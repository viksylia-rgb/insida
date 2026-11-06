/** Связка авторизации с Next.js: cookie, текущий пользователь, проверки прав. */
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession, type SessionUser } from "./service";
import { config } from "@/lib/config";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-insida_session" : "insida_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Текущий пользователь (кэшируется в пределах одного запроса). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    return await validateSession(await getSessionToken());
  } catch {
    return null;
  }
});

/** Проверка прав администратора на сервере — используется в каждой админ-операции. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const n = config.trustedProxyCount;
  if (n > 0) {
    const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const ip = chain[chain.length - n];
    if (ip) return ip;
  }
  // Без доверенного прокси заголовкам о клиенте верить нельзя (их легко подделать).
  return "direct";
}

export function safeNext(next: unknown, fallback = "/admin"): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}
