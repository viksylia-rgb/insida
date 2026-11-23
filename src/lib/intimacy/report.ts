/**
 * Сборщик индивидуального отчёта опросника «Эмоциональная близость в романтических отношениях».
 * Чистая функция: на вход — суммы восьми шкал (5..25), на выход — структура отчёта.
 */
import type { Combo, Exercise, Level, ProgramStep, Recommendation, ScaleInfo, ScaleKey, ScaleScores } from "./types";
import { SCALES_A } from "./scales-a";
import { SCALES_B } from "./scales-b";
import { OVERALL as OVERALL_BASE, GLOSSARY } from "./overall";
import { COMBOS } from "./combos";
import { EXERCISES_A } from "./exercises-a";
import { EXERCISES_B } from "./exercises-b";
import { EXERCISES_C } from "./exercises-c";
import { PROGRAM, STAGES } from "./program";
import { SOURCES } from "./sources";
import { LEVEL_EXTRA, VERY_HIGH_EXTRA } from "./scales-extra";

/** Шкалы с завершающим абзацем «что исследовать дальше» в каждой интерпретации. */
export const SCALES: ScaleInfo[] = [...SCALES_A, ...SCALES_B].map((s) => ({
  ...s,
  levels: {
    low: { ...s.levels.low, text: [...s.levels.low.text, LEVEL_EXTRA[s.key].low] },
    mid: { ...s.levels.mid, text: [...s.levels.mid.text, LEVEL_EXTRA[s.key].mid] },
    high: { ...s.levels.high, text: [...s.levels.high.text, LEVEL_EXTRA[s.key].high] },
  },
}));
export const OVERALL = OVERALL_BASE.map((b) => (b.id === "very-high" ? { ...b, text: [...b.text, VERY_HIGH_EXTRA] } : b));
export function overallBand(percent: number) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return OVERALL.find((b) => p >= b.from && p <= b.to) ?? OVERALL[0];
}
export const EXERCISES: Exercise[] = [...EXERCISES_A, ...EXERCISES_B, ...EXERCISES_C];
export const SCALE_KEYS: ScaleKey[] = SCALES.map((s) => s.key);
export { GLOSSARY, COMBOS, SOURCES, PROGRAM };

/** Индекс шкалы: Iₖ = (Sₖ − 5) / 20 × 100 */
export const scaleIndex = (sum: number) => Math.round(((sum - 5) / 20) * 100);
/** Общий индекс: I = (S − 40) / 160 × 100 */
export const overallIndex = (total: number) => Math.round(((total - 40) / 160) * 100);

/** Уровни шкал: низкий — сумма 5–12 (0–35%), средний — 13–19 (40–70%), высокий — 20–25 (75–100%). */
export function levelOf(sum: number): Level {
  if (sum <= 12) return "low";
  if (sum <= 19) return "mid";
  return "high";
}
export const LEVEL_LABEL: Record<Level, string> = { low: "низкие значения", mid: "средние значения", high: "высокие значения" };

/** Безопасность ниже этой суммы показывает отдельное бережное предупреждение. */
export const SAFETY_ALERT_SUM = 9;

export type ScaleResultFull = {
  key: ScaleKey;
  title: string;
  short: string;
  sum: number;
  percent: number;
  level: Level;
  info: ScaleInfo;
};

export type Discrepancy = { high: ScaleKey; low: ScaleKey; gap: number; text: string };

export type ProgramDay = ProgramStep & { day: number; scale: ScaleKey; scaleTitle: string; stage: string };

export type Report = {
  total: number;
  percent: number;
  band: (typeof OVERALL)[number];
  scales: ScaleResultFull[];
  strengths: ScaleResultFull[];
  focus: ScaleResultFull[];
  allHigh: boolean;
  combos: Combo[];
  contradictions: Combo[];
  discrepancies: Discrepancy[];
  mechanisms: { scale: ScaleResultFull; items: string[] }[];
  recommendations: (Recommendation & { source: string })[];
  exercises: Exercise[];
  program: ProgramDay[];
  tracking: string[];
  safetyAlert: boolean;
  safetyMode: boolean;
};

/** Сочетания, которые описывают внутренние противоречия профиля. */
const CONTRADICTION_IDS = new Set(["content-despite-low-response", "anxious-pursuit", "repair-without-safety", "equal-but-unsatisfied", "supported-but-distant", "safe-but-stuck"]);

export function validateScores(scores: Partial<ScaleScores>): ScaleScores {
  const out = {} as ScaleScores;
  for (const k of SCALE_KEYS) {
    const v = scores[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 5 || v > 25) throw new Error(`Некорректная сумма по шкале ${k}: ${v}`);
    out[k] = v;
  }
  return out;
}

export function buildReport(input: Partial<ScaleScores>, opts: { safetyConcern?: boolean } = {}): Report {
  const scores = validateScores(input);
  const total = SCALE_KEYS.reduce((a, k) => a + scores[k], 0);
  const percent = overallIndex(total);
  const band = overallBand(percent);

  const scales: ScaleResultFull[] = SCALES.map((info) => ({
    key: info.key,
    title: info.title,
    short: info.short,
    sum: scores[info.key],
    percent: scaleIndex(scores[info.key]),
    level: levelOf(scores[info.key]),
    info,
  }));
  const order = (k: ScaleKey) => SCALE_KEYS.indexOf(k);
  // При равенстве в сильных сторонах выше ставим итоговые шкалы, в зонах внимания — «ранние» звенья цикла близости.
  const strengths = [...scales].sort((a, b) => b.percent - a.percent || order(b.key) - order(a.key)).slice(0, 2);
  const focus = [...scales].sort((a, b) => a.percent - b.percent || order(a.key) - order(b.key)).slice(0, 2);
  const allHigh = scales.every((s) => s.level === "high");

  const p = Object.fromEntries(scales.map((s) => [s.key, s.percent])) as Record<ScaleKey, number>;
  const matched = COMBOS.filter((c) => c.when(p, percent)).sort((a, b) => b.weight - a.weight);
  const combos = matched.slice(0, 4);
  const contradictions = matched.filter((c) => CONTRADICTION_IDS.has(c.id));

  // Значимые расхождения: разница не меньше 30 процентных пунктов.
  const discrepancies: Discrepancy[] = [];
  for (const a of scales) for (const b of scales) {
    const gap = a.percent - b.percent;
    if (gap >= 30) discrepancies.push({ high: a.key, low: b.key, gap, text: `«${a.title}» (${a.percent}%) заметно выше, чем «${b.title}» (${b.percent}%). ${b.info.distinct}` });
  }
  discrepancies.sort((x, y) => y.gap - x.gap);

  const safetyAlert = scores.safety <= SAFETY_ALERT_SUM;
  const safetyMode = !!opts.safetyConcern;

  // Пять персональных рекомендаций.
  const pool: (Recommendation & { source: string })[] = [];
  const add = (list: Recommendation[], source: string, idx: number) => { if (list[idx]) pool.push({ ...list[idx], source }); };
  if (safetyMode || safetyAlert) add(OVERALL[0].recommendations, "Безопасность", 0);
  const f0 = focus[0].info.levels[focus[0].level].recommendations;
  const f1 = focus[1].info.levels[focus[1].level].recommendations;
  const c0 = combos[0]?.recommendations ?? [];
  add(f0, focus[0].title, 0);
  add(f1, focus[1].title, 0);
  add(c0, combos[0]?.title ?? "", 0);
  add(f0, focus[0].title, 1);
  add(band.recommendations, "Общий результат", 0);
  add(f1, focus[1].title, 1);
  add(strengths[0].info.levels[strengths[0].level].recommendations, strengths[0].title, 0);
  add(band.recommendations, "Общий результат", 1);
  const seen = new Set<string>();
  const recommendations = pool.filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true))).slice(0, 5);

  // Три упражнения: два для самой низкой шкалы, одно — для второй. В режиме безопасности — только индивидуальные.
  const pick = (k: ScaleKey, n: number, taken: Set<string>) =>
    EXERCISES.filter((e) => e.scale === k && (!safetyMode || e.format === "solo") && !taken.has(e.id)).slice(0, n);
  const taken = new Set<string>();
  const ex1 = pick(focus[0].key, 2, taken); ex1.forEach((e) => taken.add(e.id));
  const ex2 = pick(focus[1].key, 1, taken); ex2.forEach((e) => taken.add(e.id));
  let exercises = [...ex1, ...ex2];
  if (exercises.length < 3) exercises = [...exercises, ...EXERCISES.filter((e) => !taken.has(e.id) && (!safetyMode || e.format === "solo") && focus.some((f) => f.key === e.scale))].slice(0, 3);
  if (exercises.length < 3) exercises = [...exercises, ...EXERCISES.filter((e) => !exercises.includes(e) && e.format === "solo")].slice(0, 3);

  // Программа на 14 дней: чередование шагов двух самых низких шкал.
  const program: ProgramDay[] = [];
  for (let i = 0; i < 14; i++) {
    const f = focus[i % 2];
    const stepIdx = Math.floor(i / 2);
    const step = PROGRAM[f.key][stepIdx];
    program.push({ ...step, day: i + 1, scale: f.key, scaleTitle: f.title, stage: STAGES[stepIdx] });
  }

  const tracking = [
    "Повторите опросник через четыре недели: он спрашивает о последних четырёх неделях, поэтому более частое прохождение покажет в основном случайные колебания.",
    "Сравнивайте не только общий индекс, но и две шкалы из зон внимания: изменение на 10–15 процентных пунктов заметнее, чем на 5 (одно утверждение может сдвинуть шкалу на 5%).",
    ...focus.flatMap((f) => f.info.tracking.map((t) => `${f.short}: ${t}`)),
    "Раз в неделю оценивайте по шкале 0–10, насколько близко вы ощущали партнёра, и записывайте одно событие, повлиявшее на оценку.",
    "Если показатели снижаются несколько раз подряд или появляются страх, угрозы или принуждение — это повод обратиться к специалисту, а не продолжать самостоятельную работу.",
  ];

  return {
    total, percent, band, scales, strengths, focus, allHigh, combos, contradictions,
    discrepancies: discrepancies.slice(0, 3),
    mechanisms: focus.map((f) => ({ scale: f, items: f.info.mechanisms })),
    recommendations, exercises, program, tracking, safetyAlert, safetyMode,
  };
}

/** Суммы шкал из результата общего движка (ключ шкалы → балл). */
export function scoresFromEngine(result: { key: string; score: number }[]): ScaleScores {
  return validateScores(Object.fromEntries(result.map((r) => [r.key, r.score])) as Partial<ScaleScores>);
}
