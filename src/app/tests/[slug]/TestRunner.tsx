"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { nextQuestion, scoreTest, ScoringError, sortQuestions, type EngineBand, type EngineQuestion, type EngineScale, type ScaleResult } from "@/lib/scoring";
import { addTestResult } from "@/lib/local-store";
import { useLocalData } from "@/components/useLocalData";
import { CrisisNote } from "@/components/Notices";

type Q = EngineQuestion & { hint?: string | null };
const LINK_LABEL: Record<string, string> = { library: "Материал", practices: "Практика", tests: "Тест", programs: "Программа", guides: "Гайд" };

export function TestRunner({ test, questions, scales, bands, linkTitles, crisisText }: {
  test: { id: string; slug: string; title: string }; questions: Q[]; scales: EngineScale[]; bands: EngineBand[]; linkTitles: Record<string, string>; crisisText: string;
}) {
  const sorted = useMemo(() => sortQuestions(questions) as Q[], [questions]);
  const { update } = useLocalData();
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<string[]>([sorted[0]?.id]); // путь с учётом ветвлений
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<ScaleResult[] | null>(null);
  const [saved, setSaved] = useState<"no" | "yes" | "failed">("no");
  const [save, setSave] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const current = sorted.find((q) => q.id === history[history.length - 1]);
  const chosen = current ? answers[current.id] ?? [] : [];
  const next = current ? nextQuestion(sorted, current, chosen) : null;
  // Оценка общего числа вопросов с учётом ветвления: пройденные + оставшиеся после следующего.
  const remaining = current ? sorted.filter((q) => q.position > current.position && (!next || q.position >= next.position)).length : 0;
  const answeredCount = history.length - 1 + (chosen.length ? 1 : 0);
  const progress = Math.round((answeredCount / Math.max(history.length + remaining, 1)) * 100);

  const focusQuestion = () => requestAnimationFrame(() => headingRef.current?.focus());

  function choose(optionId: string) {
    if (!current) return;
    setAnswers((a) => {
      if (current.type === "multiple") {
        const cur = a[current.id] ?? [];
        return { ...a, [current.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
      }
      return { ...a, [current.id]: [optionId] };
    });
  }

  function goNext() {
    if (!current || !chosen.length) return;
    if (next) { setHistory((h) => [...h, next.id]); focusQuestion(); return; }
    finish();
  }
  function goBack() { if (history.length > 1) { setHistory((h) => h.slice(0, -1)); focusQuestion(); } }

  function finish() {
    setError(null);
    const pathAnswers = Object.fromEntries(history.map((id) => [id, answers[id] ?? []]));
    try {
      const r = scoreTest({ questions: sorted, scales, bands, answers: pathAnswers });
      setResult(r);
      if (save) setSaved(update((d) => addTestResult(d, { testSlug: test.slug, testTitle: test.title, result: r })) ? "yes" : "failed");
      requestAnimationFrame(() => document.getElementById("test-result")?.focus());
    } catch (e) {
      setError(e instanceof ScoringError ? e.message : "Не удалось посчитать результат");
    }
  }

  function restart() { setAnswers({}); setHistory([sorted[0].id]); setResult(null); setSaved("no"); setStarted(true); }

  if (!sorted.length) return <div className="empty">В тесте пока нет вопросов.</div>;

  if (result) {
    const high = result.some((r) => r.percent >= 75);
    return (
      <section id="test-result" tabIndex={-1} aria-labelledby="res-h" className="quiz">
        <p className="eyebrow">Ваш результат</p>
        <h2 id="res-h">Что показывают ваши ответы</h2>
        <p className="muted">Это описание тенденций по вашим ответам сейчас, а не оценка личности и не диагноз. Если что-то отозвалось — это повод для размышления или разговора со специалистом.</p>
        {result.map((r) => (
          <div key={r.key} className="result-scale">
            <p className="caption" style={{ margin: 0 }}>{r.title}</p>
            <h3>{r.band?.title ?? "Результат"}</h3>
            <div className="meter" role="img" aria-label={`${r.title}: ${r.percent}% от максимально возможного по этой шкале`}><span style={{ width: `${Math.max(r.percent, 3)}%` }} /></div>
            <div className="meter-legend"><span>меньше выражено</span><span>{r.score} из {r.max}</span><span>больше выражено</span></div>
            {r.band && (
              <div className="prose" style={{ marginTop: "1.25rem" }}>
                <p>{r.band.description}</p>
                {r.band.recommendations && <><p><strong>Что можно попробовать</strong></p><p>{r.band.recommendations}</p></>}
                {r.band.links.length > 0 && (
                  <ul>{r.band.links.filter((l) => linkTitles[l]).map((l) => <li key={l}>{LINK_LABEL[l.split("/")[0]] ?? "Материал"}: <Link href={`/${l}`}>{linkTitles[l]}</Link></li>)}</ul>
                )}
              </div>
            )}
          </div>
        ))}
        {high && <div style={{ margin: "1.5rem 0" }}><CrisisNote text={crisisText} /></div>}
        <p className="small" role="status">
          {saved === "yes" ? <>Результат сохранён только на этом устройстве — в разделе <Link href="/account">«Мои записи»</Link>. Его можно удалить в любой момент.</>
            : saved === "failed" ? "Браузер не разрешил сохранение (например, в приватном режиме). Результат виден только сейчас."
            : "Результат нигде не сохранён."}
        </p>
        <div className="cluster" style={{ marginTop: "1.5rem" }}>
          <button className="btn btn--secondary" onClick={restart}>Пройти ещё раз</button>
          <Link className="btn btn--ghost" href="/tests">Другие тесты</Link>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <div className="form-card quiz">
        <p style={{ marginTop: 0 }}>Вопросов: {sorted.length}. Отвечайте так, как бывает обычно, а не как «правильно». Можно вернуться к предыдущему вопросу. Ответы не отправляются на сервер — результат считается прямо в вашем браузере.</p>
        <label className="check" style={{ margin: "1rem 0" }}>
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
          <span>Сохранить результат на этом устройстве, чтобы вернуться к нему позже</span>
        </label>
        <button className="btn btn--primary" onClick={() => { setStarted(true); focusQuestion(); }}>Начать</button>
      </div>
    );
  }

  return (
    <section className="quiz" aria-label="Прохождение теста">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Прогресс"><span style={{ width: `${progress}%` }} /></div>
      <div className="quiz__count"><span>Вопрос {history.length}</span><span>{progress}%</span></div>
      {current && (
        <fieldset className="quiz__options" key={current.id}>
          <legend><h2 className="quiz__question" ref={headingRef} tabIndex={-1}>{current.text}</h2></legend>
          {current.hint && <p className="caption" style={{ marginTop: "-1.5rem" }}>{current.hint}</p>}
          {current.type === "multiple" && <p className="caption">Можно выбрать несколько вариантов.</p>}
          {current.options.map((o) => (
            <label key={o.id} className="option">
              <input type={current.type === "multiple" ? "checkbox" : "radio"} name={`q-${current.id}`} checked={chosen.includes(o.id)} onChange={() => choose(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="quiz__nav">
        <button className="btn btn--ghost" onClick={goBack} disabled={history.length <= 1}>← Назад</button>
        <button className="btn btn--primary" onClick={goNext} disabled={!chosen.length}>{next ? "Дальше" : "Узнать результат"}</button>
      </div>
    </section>
  );
}
