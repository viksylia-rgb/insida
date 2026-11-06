import { describe, expect, it } from "vitest";
import { answeredPath, checkBandCoverage, nextQuestion, scoreTest, ScoringError, type EngineBand, type EngineQuestion } from "@/lib/scoring";

const q = (position: number, type: EngineQuestion["type"], opts: [string, Record<string, number>, number?][]): EngineQuestion => ({
  id: `q${position}`,
  position,
  type,
  text: `Вопрос ${position}`,
  options: opts.map(([id, scores, jump]) => ({ id, label: id, scores, jumpToPosition: jump ?? null })),
});

const questions = [
  q(1, "scale", [["1a", { a: 0 }], ["1b", { a: 1 }], ["1c", { a: 2 }]]),
  q(2, "scale", [["2a", { a: 0, b: 1 }], ["2b", { a: 2, b: 0 }]]),
  q(3, "multiple", [["3a", { b: 1 }], ["3b", { b: 1 }], ["3c", { b: 0 }]]),
];
const scales = [
  { key: "a", title: "Шкала А" },
  { key: "b", title: "Шкала Б" },
];
const bands: EngineBand[] = [
  { scaleKey: "a", minScore: 0, maxScore: 1, title: "Низко", description: "...", recommendations: "", links: [] },
  { scaleKey: "a", minScore: 2, maxScore: 4, title: "Высоко", description: "...", recommendations: "", links: ["library/x"] },
  { scaleKey: "b", minScore: 0, maxScore: 3, title: "Любой", description: "...", recommendations: "", links: [] },
];

describe("подсчёт результатов", () => {
  it("суммирует баллы по нескольким шкалам и выбирает правило", () => {
    const res = scoreTest({ questions, scales, bands, answers: { q1: ["1c"], q2: ["2b"], q3: ["3a", "3b"] } });
    expect(res[0]).toMatchObject({ key: "a", score: 4, min: 0, max: 4, percent: 100 });
    expect(res[0].band?.title).toBe("Высоко");
    expect(res[1]).toMatchObject({ key: "b", score: 2, max: 3 });
  });

  it("минимальные ответы дают 0%", () => {
    const res = scoreTest({ questions, scales, bands, answers: { q1: ["1a"], q2: ["2a"], q3: ["3c"] } });
    expect(res[0]).toMatchObject({ score: 0, percent: 0 });
    expect(res[0].band?.title).toBe("Низко");
  });

  it("не принимает пропущенный вопрос", () => {
    expect(() => scoreTest({ questions, scales, bands, answers: { q1: ["1a"], q3: ["3a"] } })).toThrow(ScoringError);
  });

  it("не принимает несколько ответов в одиночном вопросе", () => {
    expect(() => scoreTest({ questions, scales, bands, answers: { q1: ["1a", "1b"], q2: ["2a"], q3: ["3a"] } })).toThrow(/только один/);
  });

  it("не принимает чужой вариант ответа", () => {
    expect(() => scoreTest({ questions, scales, bands, answers: { q1: ["2a"], q2: ["2a"], q3: ["3a"] } })).toThrow(/несуществующий/);
  });
});

describe("ветвление", () => {
  const branching = [
    q(1, "single", [["yes", { a: 1 }], ["no", { a: 0 }, 3]]),
    q(2, "single", [["2a", { a: 2 }], ["2b", { a: 0 }]]),
    q(3, "single", [["3a", { a: 1 }], ["3b", { a: 0 }]]),
  ];
  it("переход по jumpToPosition пропускает вопрос", () => {
    expect(nextQuestion(branching, branching[0], ["no"])?.position).toBe(3);
    expect(nextQuestion(branching, branching[0], ["yes"])?.position).toBe(2);
    expect(answeredPath(branching, { q1: ["no"], q3: ["3a"] }).map((x) => x.position)).toEqual([1, 3]);
  });
  it("считает только пройденный путь, пропущенный вопрос не обязателен", () => {
    const res = scoreTest({
      questions: branching,
      scales: [{ key: "a", title: "А" }],
      bands: [{ scaleKey: "a", minScore: 0, maxScore: 10, title: "ok", description: "", recommendations: "", links: [] }],
      answers: { q1: ["no"], q3: ["3a"], q2: ["2a"] },
    });
    expect(res[0].score).toBe(1);
  });
});

describe("проверка правил результатов", () => {
  it("находит дыры и пересечения", () => {
    const problems = checkBandCoverage(questions, scales, [
      { scaleKey: "a", minScore: 0, maxScore: 2, title: "1", description: "", recommendations: "", links: [] },
      { scaleKey: "a", minScore: 2, maxScore: 3, title: "2", description: "", recommendations: "", links: [] },
    ]);
    expect(problems.some((p) => p.includes("несколько"))).toBe(true);
    expect(problems.some((p) => p.includes("балл 4"))).toBe(true);
    expect(problems.some((p) => p.includes("Шкала Б"))).toBe(true);
  });
  it("корректная конфигурация без предупреждений", () => {
    expect(checkBandCoverage(questions, scales, bands)).toEqual([]);
  });
});
