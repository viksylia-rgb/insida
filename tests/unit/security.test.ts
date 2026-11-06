import { describe, expect, it } from "vitest";
import { generateRecoveryCode, normalizeRecoveryCode } from "@/lib/crypto";
import { renderMarkdown } from "@/lib/markdown";
import { passwordSchema, pseudonymSchema } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("пароли", () => {
  it("Argon2id: верный пароль проходит, неверный нет", async () => {
    const h = await hashPassword("правильный пароль 123");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "правильный пароль 123")).toBe(true);
    expect(await verifyPassword(h, "неправильный")).toBe(false);
  });
  it("требования к паролю", () => {
    expect(passwordSchema.safeParse("короткий").success).toBe(false);
    expect(passwordSchema.safeParse("aaaaaaaaaaaa").success).toBe(false);
    expect(passwordSchema.safeParse("Ночной-трамвай-17").success).toBe(true);
  });
});

describe("псевдоним", () => {
  it("допускает кириллицу, запрещает спецсимволы", () => {
    expect(pseudonymSchema.safeParse("Тихая_сова").success).toBe(true);
    expect(pseudonymSchema.safeParse("<script>").success).toBe(false);
    expect(pseudonymSchema.safeParse("ab").success).toBe(false);
  });
});

describe("recovery-коды", () => {
  it("формат XXXX-XXXX-XXXX без похожих символов", () => {
    for (let i = 0; i < 50; i++) expect(generateRecoveryCode()).toMatch(/^[A-HJ-NP-TV-Z2-9]{4}-[A-HJ-NP-TV-Z2-9]{4}-[A-HJ-NP-TV-Z2-9]{4}$/);
  });
  it("нормализация ввода", () => {
    expect(normalizeRecoveryCode(" abcd efgh-jkmn ")).toBe("ABCD-EFGH-JKMN");
  });
});

describe("защита от XSS в markdown", () => {
  it("удаляет скрипты, обработчики и javascript-ссылки", () => {
    const html = renderMarkdown('Привет <script>alert(1)</script> <img src=x onerror="alert(1)"> [ссылка](javascript:alert(1)) <a href="https://example.org">ok</a>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe("адреса страниц", () => {
  it("транслитерирует русский заголовок", () => {
    expect(slugify("Что такое личные границы?")).toBe("chto-takoe-lichnye-granitsy");
  });
});
