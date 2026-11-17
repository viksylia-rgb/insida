import { describe, expect, it } from "vitest";
import { content, linkTitles, relatedArticles, searchDocuments } from "@/lib/content";
import { checkBandCoverage, scoreTest } from "@/lib/scoring";

describe("контент сайта (папка content/)", () => {
  const c = content();

  it("все файлы читаются и проходят проверку", () => {
    expect(c.articles.length).toBeGreaterThan(0);
    expect(c.tests.length).toBeGreaterThan(0);
    expect(c.settings.crisisText.length).toBeGreaterThan(10);
  });

  it("правила результатов каждого теста покрывают все баллы без пересечений", () => {
    for (const t of c.tests) expect(checkBandCoverage(t.engine.questions, t.engine.scales, t.engine.bands), t.slug).toEqual([]);
  });

  it("тест «внутренний критик» считается правильно", () => {
    const t = c.tests.find((x) => x.slug === "vnutrenniy-kritik")!;
    const answers = Object.fromEntries(t.engine.questions.map((q, i) => [q.id, [q.options[i < 4 ? 4 : 0].id]]));
    const r = scoreTest({ ...t.engine, answers });
    expect(r.find((x) => x.key === "critic")).toMatchObject({ score: 16, percent: 100 });
    expect(r.find((x) => x.key === "care")?.band?.title).toBe("Поддержка пока даётся непросто");
  });

  it("ссылки в рекомендациях тестов ведут на существующие материалы", () => {
    for (const t of c.tests) {
      const links = t.results.flatMap((r) => r.links);
      expect(Object.keys(linkTitles(links)).sort(), t.slug).toEqual([...new Set(links)].sort());
    }
  });

  it("связанные материалы и поисковый индекс строятся", () => {
    expect(relatedArticles(c.articles[0]).length).toBeGreaterThan(0);
    expect(searchDocuments().length).toBe(c.articles.length + c.tests.length + c.practices.length + c.programs.length + c.books.length + c.guides.length);
  });

  it("в контенте нет слов «диагноз»/«диагностика» в утвердительном смысле у тестов", () => {
    for (const t of c.tests) expect(t.title + t.excerpt).not.toMatch(/диагност/i);
  });
});
