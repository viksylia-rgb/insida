import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";
import { slugify } from "@/lib/format";

describe("защита от XSS в markdown", () => {
  it("удаляет скрипты, обработчики и javascript-ссылки", () => {
    const html = renderMarkdown('Привет <script>alert(1)</script> <img src=x onerror="alert(1)"> [ссылка](javascript:alert(1)) <a href="https://example.org">ok</a>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
  it("не пропускает iframe и стили", () => {
    const html = renderMarkdown('<iframe src="https://evil"></iframe><p style="position:fixed">x</p>');
    expect(html).not.toMatch(/iframe|style=/i);
  });
});

describe("адреса страниц", () => {
  it("транслитерирует русский заголовок", () => {
    expect(slugify("Что такое личные границы?")).toBe("chto-takoe-lichnye-granitsy");
  });
});
