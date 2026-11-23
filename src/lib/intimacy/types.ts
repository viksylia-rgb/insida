/**
 * Типы данных расширенного отчёта опросника «Эмоциональная близость в романтических отношениях».
 * Все тексты лежат в соседних файлах этой папки; сборщик отчёта — report.ts.
 */
export type ScaleKey = "safety" | "respons" | "underst" | "disclos" | "support" | "mutual" | "repair" | "satisf";
export type Level = "low" | "mid" | "high";
export type EvidenceKind = "emp" | "theory" | "clinical";

/** Ссылка на источник из sources.ts */
export type SourceId = string;

export type Evidence = { kind: EvidenceKind; text: string; refs: SourceId[] };

export type Recommendation = {
  /** Короткое название действия */
  title: string;
  /** Какое поведение изменить и как именно */
  action: string;
  /** Почему это важно */
  why: string;
  /** Как оценить результат */
  measure: string;
};

export type LevelText = {
  title: string;
  /** Абзацы интерпретации */
  text: string[];
  recommendations: Recommendation[];
};

export type ScaleInfo = {
  key: ScaleKey;
  title: string;
  short: string;
  /** Что измеряет шкала — одно-два предложения */
  measures: string;
  /** Чем шкала отличается от соседних — чтобы не путать */
  distinct: string;
  evidence: Evidence[];
  /** Возможные механизмы трудностей (для зон внимания) */
  mechanisms: string[];
  /** Поведенческие показатели для отслеживания изменений */
  tracking: string[];
  levels: Record<Level, LevelText>;
};

export type OverallBand = {
  id: string;
  from: number;
  to: number;
  title: string;
  text: string[];
  recommendations: Recommendation[];
};

export type ScaleScores = Record<ScaleKey, number>; // суммы 5..25

export type Combo = {
  id: string;
  title: string;
  /** Условие на нормированные индексы 0..100 */
  when: (p: Record<ScaleKey, number>, overall: number) => boolean;
  /** Чем выше, тем раньше показывается сочетание */
  weight: number;
  /** Ключевые шкалы сочетания — для подсветки на графике */
  scales: ScaleKey[];
  text: string[];
  recommendations: Recommendation[];
};

export type Exercise = {
  id: string;
  scale: ScaleKey;
  name: string;
  goal: string;
  rationale: string;
  indications: string;
  minutes: number;
  format: "solo" | "pair";
  prep: string;
  steps: string[];
  phrases: string[];
  reflection: string[];
  expected: string;
  limits: string;
};

export type ProgramStep = {
  task: string;
  exercise: string;
  steps: string[];
  minutes: number;
  reflectSolo: string;
  reflectJoint: string;
  indicator: string;
  /** Альтернатива, если партнёр не готов участвовать */
  soloAlt: string;
};

export type Source = {
  id: SourceId;
  cite: string;
  url?: string;
  note?: string;
};
