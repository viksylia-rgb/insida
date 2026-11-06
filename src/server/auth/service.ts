/**
 * Аккаунты РЕДАКЦИИ (администраторов). Читатели сайта аккаунтов не имеют —
 * их данные хранятся только у них в браузере.
 * Модуль не зависит от Next.js — поэтому покрыт интеграционными тестами.
 */
import { and, eq, isNull, gt, sql } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessions, recoveryCodes } from "../schema";
import { hashPassword, verifyPassword, dummyHash } from "./password";
import { generateRecoveryCode, hmac, normalizeRecoveryCode, randomToken, sha256 } from "@/lib/crypto";
import { RULES, hit, rateKey, reset, retryMessage, cleanup } from "./rate-limit";

export const SESSION_DAYS = 30;
export const RECOVERY_CODE_COUNT = 8;

export class AuthError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

export type SessionUser = {
  id: string;
  pseudonym: string;
  role: "admin";
  sessionId: string;
};

// ---------- Сессии ----------
export async function createSession(userId: string) {
  const token = randomToken(32);
  const id = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await getDb().insert(sessions).values({ id, userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSession(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      pseudonym: users.pseudonym,
      role: users.role,
      blocked: users.blocked,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now() || row.blocked) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  // скользящее продление: если до окончания меньше половины срока
  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * 864e5) {
    await db.update(sessions).set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) }).where(eq(sessions.id, id));
  }
  return { id: row.id, pseudonym: row.pseudonym, role: row.role, sessionId: id };
}

export async function deleteSession(token: string) {
  await getDb().delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function deleteAllSessions(userId: string) {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

// ---------- Recovery-коды ----------
async function issueRecoveryCodes(userId: string): Promise<string[]> {
  const db = getDb();
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
  await db.insert(recoveryCodes).values(codes.map((c) => ({ userId, codeHash: hmac(c) })));
  return codes;
}

export async function regenerateRecoveryCodes(userId: string) {
  return issueRecoveryCodes(userId);
}

export async function remainingRecoveryCodes(userId: string): Promise<number> {
  const res = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
  return res[0]?.n ?? 0;
}

// ---------- Создание администратора / вход ----------
/** Создаёт аккаунт редакции. Вызывается только из консольного скрипта `npm run admin:create`. */
export async function createAdmin(input: { pseudonym: string; password: string }) {
  const db = getDb();
  const lower = input.pseudonym.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.pseudonymLower, lower)).limit(1);
  if (existing.length) throw new AuthError("Этот псевдоним уже занят — выберите другой", "pseudonym");
  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    [user] = await db
      .insert(users)
      .values({
        pseudonym: input.pseudonym.trim(),
        pseudonymLower: lower,
        passwordHash,
        role: "admin",
      })
      .returning({ id: users.id, pseudonym: users.pseudonym, role: users.role });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505" || String((e as { cause?: { code?: string } }).cause?.code) === "23505")
      throw new AuthError("Этот псевдоним уже занят — выберите другой", "pseudonym");
    throw e;
  }
  const codes = await issueRecoveryCodes(user.id);
  return { user, recoveryCodes: codes };
}

const GENERIC_LOGIN_ERROR = "Неверный псевдоним или пароль";

export async function login(input: { pseudonym: string; password: string; ip: string }) {
  if (Math.random() < 0.02) cleanup().catch(() => {});
  const nameKey = rateKey("login-name", input.pseudonym.trim());
  const ipKey = rateKey("login-ip", input.ip);
  const [byName, byIp] = await Promise.all([hit(nameKey, RULES.loginByName), hit(ipKey, RULES.loginByIp)]);
  if (!byName.allowed || !byIp.allowed) {
    throw new AuthError(retryMessage(Math.max(byName.allowed ? 0 : byName.retryAfterSeconds, byIp.allowed ? 0 : byIp.retryAfterSeconds)));
  }
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.pseudonymLower, input.pseudonym.trim().toLowerCase()))
    .limit(1);
  if (!user) {
    await verifyPassword(await dummyHash(), input.password);
    throw new AuthError(GENERIC_LOGIN_ERROR);
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw new AuthError(GENERIC_LOGIN_ERROR);
  if (user.blocked) throw new AuthError("Аккаунт заблокирован другим администратором.");
  await reset(nameKey);
  const session = await createSession(user.id);
  return { user: { id: user.id, pseudonym: user.pseudonym, role: user.role }, session };
}

/** Восстановление доступа по одноразовому коду: код гасится, все сессии завершаются. */
export async function recoverWithCode(input: { pseudonym: string; code: string; newPassword: string; ip: string }) {
  const r = await hit(rateKey("recover", input.ip), RULES.recover);
  if (!r.allowed) throw new AuthError(retryMessage(r.retryAfterSeconds));
  const r2 = await hit(rateKey("recover-name", input.pseudonym.trim()), RULES.recover);
  if (!r2.allowed) throw new AuthError(retryMessage(r2.retryAfterSeconds));
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, blocked: users.blocked })
    .from(users)
    .where(eq(users.pseudonymLower, input.pseudonym.trim().toLowerCase()))
    .limit(1);
  const codeHash = hmac(normalizeRecoveryCode(input.code));
  const generic = new AuthError("Псевдоним или код восстановления не подходят");
  if (!user || user.blocked) throw generic;
  const used = await db
    .update(recoveryCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(recoveryCodes.userId, user.id), eq(recoveryCodes.codeHash, codeHash), isNull(recoveryCodes.usedAt)))
    .returning({ id: recoveryCodes.id });
  if (used.length === 0) throw generic;
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
  await deleteAllSessions(user.id);
  const left = await remainingRecoveryCodes(user.id);
  return { userId: user.id, remainingCodes: left };
}

export async function changePassword(userId: string, current: string, next: string, keepSessionId?: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, current))) throw new AuthError("Текущий пароль указан неверно", "current");
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, userId));
  // завершаем все остальные сессии
  const all = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  for (const s of all) if (s.id !== keepSessionId) await db.delete(sessions).where(eq(sessions.id, s.id));
}

export async function activeSessionCount(userId: string) {
  const res = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));
  return res[0]?.n ?? 0;
}

/** Сброс пароля из консоли сервера (`npm run admin:reset-password`), если коды восстановления потеряны. */
export async function resetPasswordByName(pseudonym: string, newPassword: string) {
  const db = getDb();
  const res = await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.pseudonymLower, pseudonym.trim().toLowerCase()))
    .returning({ id: users.id });
  if (!res.length) throw new AuthError("Администратор с таким именем не найден");
  await deleteAllSessions(res[0].id);
}
