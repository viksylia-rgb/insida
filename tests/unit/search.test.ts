import { describe, expect, it } from "vitest";
import { search, type SearchDoc } from "@/lib/search";

const docs: SearchDoc[] = [
  { type: "article", url: "/a", title: "Когда приходит тревога", excerpt: "", text: "Тревога — естественная реакция организма.", tags: ["эмоции"] },
  { type: "article", url: "/b", title: "Личные границы", excerpt: "Как говорить «нет»", text: "Границы помогают сохранять отношения.", tags: ["границы"] },
  { type: "practice", url: "/c", title: "Дневник", excerpt: "", text: "Запишите, что вас тревожит сегодня.", tags: [] },
];

describe("поиск по сайту", () => {
  it("находит разные формы слова", () => {
    expect(search(docs, "тревожности").map((h) => h.url)).toEqual(["/a", "/c"]);
    expect(search(docs, "границам").map((h) => h.url)).toEqual(["/b"]);
  });
  it("совпадение в заголовке важнее, чем в тексте", () => {
    expect(search(docs, "тревога")[0].url).toBe("/a");
  });
  it("все слова запроса должны найтись", () => {
    expect(search(docs, "границы тревога")).toHaveLength(0);
  });
  it("учитывает теги и ё/е", () => {
    expect(search(docs, "эмоций").map((h) => h.url)).toEqual(["/a"]);
    expect(search(docs, "")).toEqual([]);
  });
});
