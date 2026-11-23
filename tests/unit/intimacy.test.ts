import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildReport, scaleIndex, overallIndex, levelOf, SCALES, EXERCISES, COMBOS, OVERALL, PROGRAM, SCALE_KEYS, SOURCES,
} from "@/lib/intimacy/report";
import { scoreTest, checkBandCoverage, type EngineQuestion } from "@/lib/scoring";
import type { ScaleKey } from "@/lib/intimacy/types";

const all = (v: number) => Object.fromEntries(SCALE_KEYS.map((k) => [k, v])) as Record<ScaleKey, number>;

describe("формулы", () => {
  it("индекс шкалы и общий индекс по формулам методики", () => {
    expect(scaleIndex(5)).toBe(0);
    expect(scaleIndex(25)).toBe(100);
    expect(scaleIndex(15)).toBe(50);
    expect(overallIndex(40)).toBe(0);
    expect(overallIndex(200)).toBe(100);
    expect(overallIndex(120)).toBe(50);
  });
  it("уровни шкал", () => {
    expect(levelOf(12)).toBe("low");
    expect(levelOf(13)).toBe("mid");
    expect(levelOf(19)).toBe("mid");
    expect(levelOf(20)).toBe("high");
  });
  it("диапазоны общего результата покрывают 0–100 без пересечений", () => {
    for (let p = 0; p <= 100; p++) expect(OVERALL.filter((b) => p >= b.from && p <= b.to)).toHaveLength(1);
  });
});

describe("опросник в content/tests", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/tests/emotsionalnaya-blizost.json"), "utf8"));
  const questions: EngineQuestion[] = raw.questions.map((q: { text: string; options: { label: string; scores: { scale: string; points: number }[] }[] }, i: number) => ({
    id: `q${i + 1}`, position: i + 1, type: "scale", text: q.text,
    options: q.options.map((o, j) => ({ id: `q${i + 1}o${j + 1}`, label: o.label, scores: Object.fromEntries(o.scores.map((s) => [s.scale, s.points])) })),
  }));
  const bands = raw.results.map((r: { scale: string; from: number; to: number; title: string; description: string }) => ({ scaleKey: r.scale, minScore: r.from, maxScore: r.to, title: r.title, description: r.description, recommendations: "", links: [] }));

  it("40 утверждений, 8 шкал по 5", () => {
    expect(questions).toHaveLength(40);
    expect(raw.scales.map((s: { key: string }) => s.key)).toEqual(SCALE_KEYS);
    for (const k of SCALE_KEYS) expect(questions.filter((q) => Object.keys(q.options[0].scores)[0] === k)).toHaveLength(5);
  });
  it("обратные утверждения 3, 9, 13, 18, 23, 28, 33, 38", () => {
    const reversed = questions.filter((q) => Object.values(q.options[0].scores)[0] === 5).map((q) => q.position);
    expect(reversed).toEqual([3, 9, 13, 18, 23, 28, 33, 38]);
  });
  it("правила результатов покрывают диапазон 5–25", () => {
    expect(checkBandCoverage(questions, raw.scales, bands)).toEqual([]);
  });
  it("ответ «полностью согласен» везде даёт 25 по прямым и 5 по обратным пунктам → сумма", () => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, [`${q.id}o5`]]));
    const r = scoreTest({ questions, scales: raw.scales, bands, answers });
    // в каждой шкале 4 прямых (по 5) и один обратный (1), кроме шкал без обратных
    const total = r.reduce((a, s) => a + s.score, 0);
    expect(total).toBe(40 * 5 - 8 * 4);
    const rep = buildReport(Object.fromEntries(r.map((s) => [s.key, s.score])));
    expect(rep.total).toBe(total);
    expect(rep.percent).toBe(overallIndex(total));
  });
});

describe("содержание", () => {
  it("8 шкал × 3 уровня, каждая интерпретация не короче 200 слов", () => {
    expect(SCALES).toHaveLength(8);
    for (const s of SCALES) for (const l of ["low", "mid", "high"] as const) {
      const words = s.levels[l].text.join(" ").split(/\s+/).length;
      expect(words, `${s.key}/${l}`).toBeGreaterThanOrEqual(200);
      expect(s.levels[l].recommendations.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("5 общих интерпретаций по 400–600 слов", () => {
    expect(OVERALL).toHaveLength(5);
    for (const b of OVERALL) {
      const words = b.text.join(" ").split(/\s+/).length;
      expect(words, b.id).toBeGreaterThanOrEqual(400);
      expect(words, b.id).toBeLessThanOrEqual(600);
    }
  });
  it("не меньше 12 сочетаний", () => expect(COMBOS.length).toBeGreaterThanOrEqual(12));
  it("32 упражнения, по 4 на шкалу, все поля заполнены, не менее 5 шагов", () => {
    expect(EXERCISES).toHaveLength(32);
    for (const k of SCALE_KEYS) {
      const own = EXERCISES.filter((e) => e.scale === k);
      expect(own).toHaveLength(4);
      expect(own.some((e) => e.format === "solo"), `solo для ${k}`).toBe(true);
    }
    for (const e of EXERCISES) {
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(5);
      expect(e.name.length).toBeGreaterThan(3);
      for (const f of ["goal", "rationale", "indications", "prep", "expected", "limits"] as const) expect(e[f].length, `${e.id}.${f}`).toBeGreaterThan(10);
      expect(e.phrases.length).toBeGreaterThan(0);
      expect(e.reflection.length).toBeGreaterThan(0);
      expect(e.minutes).toBeGreaterThan(0);
    }
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(32);
  });
  it("программа: 7 шагов на каждую шкалу", () => {
    for (const k of SCALE_KEYS) expect(PROGRAM[k]).toHaveLength(7);
  });
  it("все ссылки на источники существуют", () => {
    const ids = new Set(SOURCES.map((s) => s.id));
    for (const s of SCALES) for (const e of s.evidence) for (const r of e.refs) expect(ids.has(r), `${s.key}: ${r}`).toBe(true);
  });
  it("в текстах нет слов «диагноз/диагностика»", () => {
    const blob = JSON.stringify([SCALES.map((s) => ({ ...s, evidence: s.evidence })), OVERALL, COMBOS.map((c) => c.text), EXERCISES, PROGRAM]);
    expect(blob).not.toMatch(/диагноз|диагностик/i);
  });
});

describe("сборка отчёта", () => {
  it("две сильные стороны и две зоны внимания", () => {
    const r = buildReport({ ...all(15), safety: 24, satisf: 22, repair: 6, mutual: 8 });
    expect(r.strengths.map((s) => s.key)).toEqual(["safety", "satisf"]);
    expect(r.focus.map((s) => s.key)).toEqual(["repair", "mutual"]);
  });
  it("ровно 5 рекомендаций и 3 упражнения", () => {
    for (const v of [5, 10, 15, 20, 25]) {
      const r = buildReport(all(v));
      expect(r.recommendations).toHaveLength(5);
      expect(r.exercises).toHaveLength(3);
      expect(r.program).toHaveLength(14);
    }
  });
  it("программа чередует две самые низкие шкалы и идёт от наблюдения к закреплению", () => {
    const r = buildReport({ ...all(20), disclos: 8, respons: 9 });
    expect(r.program.filter((d) => d.scale === "disclos")).toHaveLength(7);
    expect(r.program.filter((d) => d.scale === "respons")).toHaveLength(7);
    expect(r.program[0].stage).toBe("Наблюдение");
    expect(r.program[13].stage).toBe("Закрепление");
  });
  it("сочетание «самораскрытие высокое, отзывчивость низкая»", () => {
    const r = buildReport({ ...all(16), disclos: 23, respons: 9 });
    expect(r.combos.map((c) => c.id)).toContain("open-no-response");
  });
  it("сочетание «поддержка без понимания»", () => {
    const r = buildReport({ ...all(16), support: 23, underst: 9 });
    expect(r.combos.map((c) => c.id)).toContain("support-no-understanding");
  });
  it("сочетание «близость при трудном примирении»", () => {
    const r = buildReport({ ...all(18), satisf: 23, repair: 8 });
    expect(r.combos.map((c) => c.id)).toContain("close-but-poor-repair");
  });
  it("режим безопасности: только индивидуальные упражнения и первая рекомендация о безопасности", () => {
    const r = buildReport(all(8), { safetyConcern: true });
    expect(r.safetyMode).toBe(true);
    expect(r.exercises.every((e) => e.format === "solo")).toBe(true);
    expect(r.recommendations[0].title).toMatch(/безопасност/i);
  });
  it("низкая безопасность включает предупреждение", () => {
    expect(buildReport({ ...all(20), safety: 7 }).safetyAlert).toBe(true);
    expect(buildReport(all(20)).safetyAlert).toBe(false);
  });
  it("некорректные суммы отклоняются", () => {
    expect(() => buildReport({ ...all(15), safety: 26 })).toThrow();
    expect(() => buildReport({ safety: 10 })).toThrow();
  });
  it("каждое сочетание достижимо", () => {
    const found = new Set<string>();
    const vals = [5, 9, 13, 17, 21, 25];
    // перебор пар шкал с остальными на среднем уровне
    for (const a of SCALE_KEYS) for (const b of SCALE_KEYS) for (const va of vals) for (const vb of vals) for (const rest of [10, 15, 21]) {
      const r = buildReport({ ...all(rest), [a]: va, [b]: vb });
      COMBOS.filter((c) => c.when(Object.fromEntries(r.scales.map((s) => [s.key, s.percent])) as Record<ScaleKey, number>, r.percent)).forEach((c) => found.add(c.id));
    }
    for (const c of COMBOS) expect(found.has(c.id), c.id).toBe(true);
  });
});
