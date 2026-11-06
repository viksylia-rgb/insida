import { describe, expect, it } from "vitest";
import {
  addTestResult, emptyData, exportData, importData, ImportError, isFavorite, parseData, removeEntry, removeTestResult, saveEntry, setLessonDone, setPseudonym, toggleFavorite,
} from "@/lib/local-store";

const fav = { type: "article" as const, id: "a1", title: "Границы", url: "/library/granitsy" };
const res = { testSlug: "t", testTitle: "Тест", result: [{ key: "a", title: "А", score: 2, min: 0, max: 4, percent: 50, band: null }] };

describe("личные данные в браузере", () => {
  it("избранное переключается", () => {
    let d = toggleFavorite(emptyData(), fav);
    expect(isFavorite(d, "article", "a1")).toBe(true);
    d = toggleFavorite(d, fav);
    expect(d.favorites).toHaveLength(0);
  });

  it("результаты тестов добавляются и удаляются", () => {
    let d = addTestResult(emptyData(), res);
    expect(d.testResults).toHaveLength(1);
    d = removeTestResult(d, d.testResults[0].id);
    expect(d.testResults).toHaveLength(0);
  });

  it("ответы практики: черновик перезаписывается и удаляется", () => {
    let d = saveEntry(emptyData(), "p1", { slug: "p", title: "П", values: { q: "черновик" }, isDraft: true });
    d = saveEntry(d, "p1", { slug: "p", title: "П", values: { q: "готово" }, isDraft: false });
    expect(d.practiceEntries.p1).toMatchObject({ isDraft: false, values: { q: "готово" } });
    expect(removeEntry(d, "p1").practiceEntries).toEqual({});
  });

  it("прогресс программы и продолжение с места остановки", () => {
    const program = { slug: "opora", title: "Опора", total: 3 };
    let d = setLessonDone(emptyData(), program, "l1", true);
    d = setLessonDone(d, program, "l2", true);
    d = setLessonDone(d, program, "l2", false);
    expect(d.lessonProgress.opora.done).toEqual(["l1"]);
  });

  it("повреждённые данные не ломают сайт", () => {
    expect(parseData("{не json")).toEqual(emptyData());
    expect(parseData(JSON.stringify({ version: 99 }))).toEqual(emptyData());
  });

  it("экспорт → импорт с заменой восстанавливает данные", () => {
    let d = setPseudonym(emptyData(), "  Тихая сова  ");
    d = toggleFavorite(addTestResult(d, res), fav);
    const restored = importData(emptyData(), exportData(d), "replace");
    expect(restored.profile.pseudonym).toBe("Тихая сова");
    expect(restored.favorites).toHaveLength(1);
    expect(restored.testResults).toHaveLength(1);
  });

  it("импорт с объединением не дублирует и берёт более свежую запись", () => {
    const a = saveEntry(toggleFavorite(emptyData(), fav), "p1", { slug: "p", title: "П", values: { q: "старое" }, isDraft: true }, new Date("2026-01-01"));
    const b = saveEntry(toggleFavorite(emptyData(), fav), "p1", { slug: "p", title: "П", values: { q: "новое" }, isDraft: false }, new Date("2026-02-01"));
    const merged = importData(a, exportData(b), "merge");
    expect(merged.favorites).toHaveLength(1);
    expect(merged.practiceEntries.p1.values.q).toBe("новое");
  });

  it("чужой файл отклоняется с понятной ошибкой", () => {
    expect(() => importData(emptyData(), "hello", "merge")).toThrow(ImportError);
    expect(() => importData(emptyData(), JSON.stringify({ favorites: [{ url: "javascript:x" }] }), "merge")).toThrow(ImportError);
  });
});
