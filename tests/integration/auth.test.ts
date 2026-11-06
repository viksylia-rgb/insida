import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { prepareDb } from "../helpers";
import { getDb } from "@/server/db";
import { users, recoveryCodes, sessions } from "@/server/schema";
import { AuthError, login, recoverWithCode, createAdmin, validateSession, deleteSession, changePassword, remainingRecoveryCodes, resetPasswordByName } from "@/server/auth/service";

const PASS = "Ночной-трамвай-17";

describe("аккаунты редакции: создание и вход", () => {
  beforeEach(prepareDb);

  it("создаёт администратора без e-mail, хранит только хеш пароля и выдаёт 8 recovery-кодов", async () => {
    const { user, recoveryCodes: codes } = await createAdmin({ pseudonym: "Тихая сова", password: PASS });
    expect(codes).toHaveLength(8);
    const [row] = await getDb().select().from(users).where(eq(users.id, user.id));
    expect(row.passwordHash).not.toContain(PASS);
    expect(row.passwordHash.startsWith("$argon2id$")).toBe(true);
    const stored = await getDb().select().from(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
    expect(stored.every((s) => !codes.includes(s.codeHash))).toBe(true);
  });

  it("псевдоним уникален без учёта регистра", async () => {
    await createAdmin({ pseudonym: "Читатель", password: PASS });
    await expect(createAdmin({ pseudonym: "читатель", password: PASS })).rejects.toThrow(/занят/);
  });

  it("вход создаёт сессию, выход её удаляет; в БД хранится только хеш токена", async () => {
    await createAdmin({ pseudonym: "Вечерний", password: PASS });
    const { session } = await login({ pseudonym: "вечерний", password: PASS, ip: "1.2.3.4" });
    const su = await validateSession(session.token);
    expect(su?.pseudonym).toBe("Вечерний");
    const all = await getDb().select().from(sessions);
    expect(all.some((s) => s.id === session.token)).toBe(false);
    await deleteSession(session.token);
    expect(await validateSession(session.token)).toBeNull();
  });

  it("одинаковая ошибка для неверного пароля и несуществующего псевдонима", async () => {
    await createAdmin({ pseudonym: "Утренний", password: PASS });
    const e1 = await login({ pseudonym: "Утренний", password: "не тот пароль", ip: "3.3.3.3" }).catch((e) => e);
    const e2 = await login({ pseudonym: "Никто-такой", password: PASS, ip: "3.3.3.3" }).catch((e) => e);
    expect(e1).toBeInstanceOf(AuthError);
    expect(e1.message).toBe(e2.message);
  });

  it("защита от перебора: после 8 неудачных попыток вход блокируется даже с верным паролем", async () => {
    await createAdmin({ pseudonym: "Осторожный", password: PASS });
    for (let i = 0; i < 8; i++) await login({ pseudonym: "Осторожный", password: `wrong-${i}`, ip: `9.9.9.${i}` }).catch(() => {});
    await expect(login({ pseudonym: "Осторожный", password: PASS, ip: "1.2.3.4" })).rejects.toThrow(/Слишком много попыток/);
  });

  it("восстановление по коду: код одноразовый, старые сессии завершаются", async () => {
    const { recoveryCodes: codes } = await createAdmin({ pseudonym: "Забывчивый", password: PASS });
    const { session } = await login({ pseudonym: "Забывчивый", password: PASS, ip: "1.2.3.4" });
    const NEW = "Новый-пароль-2026!";
    const res = await recoverWithCode({ pseudonym: "Забывчивый", code: codes[0].toLowerCase().replace(/-/g, " "), newPassword: NEW, ip: "6.6.6.6" });
    expect(res.remainingCodes).toBe(7);
    expect(await validateSession(session.token)).toBeNull();
    await expect(login({ pseudonym: "Забывчивый", password: PASS, ip: "1.2.3.4" })).rejects.toThrow();
    await expect(login({ pseudonym: "Забывчивый", password: NEW, ip: "1.2.3.4" })).resolves.toBeTruthy();
    await expect(recoverWithCode({ pseudonym: "Забывчивый", code: codes[0], newPassword: NEW, ip: "6.6.6.6" })).rejects.toThrow(/не подходят/);
  });

  it("смена пароля требует текущий пароль", async () => {
    const { user } = await createAdmin({ pseudonym: "Аккуратный", password: PASS });
    await expect(changePassword(user.id, "не тот", "Совсем-другой-пароль-1")).rejects.toThrow(/неверно/);
    await changePassword(user.id, PASS, "Совсем-другой-пароль-1");
    await expect(login({ pseudonym: "Аккуратный", password: "Совсем-другой-пароль-1", ip: "1.2.3.4" })).resolves.toBeTruthy();
    expect(await remainingRecoveryCodes(user.id)).toBe(8);
  });

  it("заблокированный пользователь не может войти", async () => {
    const { user } = await createAdmin({ pseudonym: "Нарушитель", password: PASS });
    await getDb().update(users).set({ blocked: true }).where(eq(users.id, user.id));
    await expect(login({ pseudonym: "Нарушитель", password: PASS, ip: "1.2.3.4" })).rejects.toThrow(/заблокирован/);
  });
});
