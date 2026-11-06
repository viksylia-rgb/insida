/**
 * Движок подсчёта результатов опросников. Чистые функции без БД — покрыты автотестами.
 * Результаты описывают выраженность тенденций, а НЕ ставят диагноз.
 */
export type QType = "single" | "multiple" | "scale";
export type EngineOption = { id: string; label: string; scores: Record<string, number>; jumpToPosition?: number | null };
export type EngineQuestion = { id: string; position: number; type: QType; text: string; options: EngineOption[] };
export type EngineBand = {
  scaleKey: string;
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
  recommendations: string;
  links: string[];
};
export type EngineScale = { key: string; title: string };
export type Answers = Record<string, string[]>; // questionId -> optionIds

export type ScaleResult = {
  key: string;
  title: string;
  score: number;
  min: number;
  max: number;
  /** 0..100 — положение балла между минимумом и максимумом шкалы */
  percent: number;
  band: Omit<EngineBand, "scaleKey" | "minScore" | "maxScore"> | null;
};

export function sortQuestions(qs: EngineQuestion[]) {
  return [...qs].sort((a, b) => a.position - b.position);
}

/**
 * Следующий вопрос с учётом ветвления: если у выбранного варианта задан jumpToPosition
 * и он больше текущей позиции — переходим к нему, иначе к следующему по порядку.
 */
export function nextQuestion(questions: EngineQuestion[], current: EngineQuestion, chosen: string[]): EngineQuestion | null {
  const sorted = sortQuestions(questions);
  const jump = current.options
    .filter((o) => chosen.includes(o.id) && o.jumpToPosition != null && o.jumpToPosition > current.position)
    .map((o) => o.jumpToPosition as number)
    .sort((a, b) => a - b)[0];
  if (jump != null) return sorted.find((q) => q.position >= jump) ?? null;
  return sorted.find((q) => q.position > current.position) ?? null;
}

/** Путь, который реально прошёл пользователь (с учётом ветвлений). */
export function answeredPath(questions: EngineQuestion[], answers: Answers): EngineQuestion[] {
  const sorted = sortQuestions(questions);
  const path: EngineQuestion[] = [];
  let q: EngineQuestion | null = sorted[0] ?? null;
  const guard = new Set<string>();
  while (q && !guard.has(q.id)) {
    guard.add(q.id);
    path.push(q);
    const chosen = answers[q.id] ?? [];
    q = nextQuestion(sorted, q, chosen);
  }
  return path;
}

export class ScoringError extends Error {}

/** Проверяет, что ответы корректны: каждый вопрос пути отвечен, варианты существуют. */
export function validateAnswers(questions: EngineQuestion[], answers: Answers): EngineQuestion[] {
  const path = answeredPath(questions, answers);
  for (const q of path) {
    const chosen = answers[q.id];
    if (!chosen || chosen.length === 0) throw new ScoringError(`Нет ответа на вопрос: «${q.text}»`);
    if (q.type !== "multiple" && chosen.length > 1) throw new ScoringError("В этом вопросе можно выбрать только один вариант");
    const ids = new Set(q.options.map((o) => o.id));
    if (chosen.some((c) => !ids.has(c))) throw new ScoringError("Выбран несуществующий вариант ответа");
    if (new Set(chosen).size !== chosen.length) throw new ScoringError("Повторяющиеся ответы");
  }
  return path;
}

function scaleRange(path: EngineQuestion[], key: string) {
  let min = 0;
  let max = 0;
  for (const q of path) {
    const vals = q.options.map((o) => o.scores[key] ?? 0);
    if (q.type === "multiple") {
      min += vals.filter((v) => v < 0).reduce((a, b) => a + b, 0);
      max += vals.filter((v) => v > 0).reduce((a, b) => a + b, 0);
    } else {
      min += vals.length ? Math.min(...vals) : 0;
      max += vals.length ? Math.max(...vals) : 0;
    }
  }
  return { min, max };
}

export function scoreTest(input: {
  questions: EngineQuestion[];
  scales: EngineScale[];
  bands: EngineBand[];
  answers: Answers;
}): ScaleResult[] {
  const path = validateAnswers(input.questions, input.answers);
  return input.scales.map((scale) => {
    let score = 0;
    for (const q of path) {
      for (const optId of input.answers[q.id] ?? []) {
        const opt = q.options.find((o) => o.id === optId);
        score += opt?.scores[scale.key] ?? 0;
      }
    }
    const { min, max } = scaleRange(path, scale.key);
    const percent = max === min ? 0 : Math.round(((score - min) / (max - min)) * 100);
    const band =
      input.bands.find((b) => b.scaleKey === scale.key && score >= b.minScore && score <= b.maxScore) ?? null;
    return {
      key: scale.key,
      title: scale.title,
      score,
      min,
      max,
      percent: Math.max(0, Math.min(100, percent)),
      band: band
        ? { title: band.title, description: band.description, recommendations: band.recommendations, links: band.links }
        : null,
    };
  });
}

/** Проверка конфигурации теста для админки: полосы покрывают весь диапазон без пересечений. */
export function checkBandCoverage(questions: EngineQuestion[], scales: EngineScale[], bands: EngineBand[]): string[] {
  const problems: string[] = [];
  const sorted = sortQuestions(questions);
  for (const s of scales) {
    const { min, max } = scaleRange(sorted, s.key);
    const own = bands.filter((b) => b.scaleKey === s.key).sort((a, b) => a.minScore - b.minScore);
    if (own.length === 0) {
      problems.push(`Шкала «${s.title}»: нет ни одного правила результата`);
      continue;
    }
    for (let v = min; v <= max; v++) {
      const hits = own.filter((b) => v >= b.minScore && v <= b.maxScore).length;
      if (hits === 0) problems.push(`Шкала «${s.title}»: балл ${v} не попадает ни в одно правило`);
      if (hits > 1) problems.push(`Шкала «${s.title}»: балл ${v} попадает в несколько правил`);
    }
  }
  return problems;
}
