"use client";
import { useState } from "react";

type Opt = { label: string; scores: Record<string, number>; jumpToPosition?: number | null };
type Q = { type: "single" | "multiple" | "scale"; text: string; hint?: string | null; options: Opt[] };
type Band = { scaleKey: string; minScore: number; maxScore: number; title: string; description: string; recommendations: string; links: string[] };
type Scale = { key: string; title: string };
export type TestStructure = { scales: Scale[]; questions: Q[]; bands: Band[] };

const LIKERT = ["Почти никогда", "Редко", "Иногда", "Часто", "Почти всегда"];

/** Визуальный редактор вопросов, вариантов, баллов и правил результатов. Результат уходит в форму как JSON. */
export function TestEditor({ initial }: { initial: TestStructure }) {
  const [s, setS] = useState<TestStructure>(initial);
  const upd = (fn: (d: TestStructure) => void) => setS((prev) => { const next = structuredClone(prev); fn(next); return next; });
  const keys = s.scales.map((x) => x.key);

  return (
    <div className="stack" style={{ display: "grid", gap: "1.5rem" }}>
      <input type="hidden" name="structure" value={JSON.stringify(s)} />

      <section className="panel">
        <h2>Шкалы</h2>
        <p className="caption" style={{ margin: 0 }}>По каждой шкале суммируются баллы. Ключ — латиницей (например, <code>self</code>), название — для читателя.</p>
        {s.scales.map((sc, i) => (
          <div key={i} className="opt-row" style={{ gridTemplateColumns: "140px 1fr auto" }}>
            <input className="input" aria-label="Ключ шкалы" value={sc.key} onChange={(e) => upd((d) => { const old = d.scales[i].key; const nk = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""); d.scales[i].key = nk; d.questions.forEach((q) => q.options.forEach((o) => { if (old in o.scores) { o.scores[nk] = o.scores[old]; delete o.scores[old]; } })); d.bands.forEach((b) => { if (b.scaleKey === old) b.scaleKey = nk; }); })} />
            <input className="input" aria-label="Название шкалы" value={sc.title} onChange={(e) => upd((d) => { d.scales[i].title = e.target.value; })} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.scales.splice(i, 1); })} disabled={s.scales.length <= 1}>Удалить</button>
          </div>
        ))}
        <button type="button" className="btn btn--secondary btn--sm" style={{ width: "fit-content" }} onClick={() => upd((d) => { d.scales.push({ key: `scale${d.scales.length + 1}`, title: "Новая шкала" }); })}>+ Шкала</button>
      </section>

      <section className="panel">
        <h2>Вопросы ({s.questions.length})</h2>
        {s.questions.map((q, qi) => (
          <div key={qi} className="q-block">
            <div className="q-block__head">
              <strong>Вопрос {qi + 1}</strong>
              <div className="cluster">
                <button type="button" className="btn btn--ghost btn--sm" disabled={qi === 0} onClick={() => upd((d) => { [d.questions[qi - 1], d.questions[qi]] = [d.questions[qi], d.questions[qi - 1]]; })} aria-label="Выше">↑</button>
                <button type="button" className="btn btn--ghost btn--sm" disabled={qi === s.questions.length - 1} onClick={() => upd((d) => { [d.questions[qi + 1], d.questions[qi]] = [d.questions[qi], d.questions[qi + 1]]; })} aria-label="Ниже">↓</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.questions.splice(qi, 1); })}>Удалить</button>
              </div>
            </div>
            <textarea className="textarea" style={{ minHeight: 70 }} aria-label="Текст вопроса" value={q.text} onChange={(e) => upd((d) => { d.questions[qi].text = e.target.value; })} />
            <div className="row-2">
              <select className="select" aria-label="Тип вопроса" value={q.type} onChange={(e) => upd((d) => { d.questions[qi].type = e.target.value as Q["type"]; })}>
                <option value="scale">Шкала (один ответ)</option>
                <option value="single">Один вариант</option>
                <option value="multiple">Несколько вариантов</option>
              </select>
              <input className="input" placeholder="Подсказка (необязательно)" value={q.hint ?? ""} onChange={(e) => upd((d) => { d.questions[qi].hint = e.target.value; })} />
            </div>
            <p className="caption" style={{ margin: 0 }}>Варианты: текст · баллы по шкалам ({keys.join(", ")}) · переход к вопросу № (необязательно, для ветвления)</p>
            {q.options.map((o, oi) => (
              <div key={oi} className="opt-row">
                <input className="input" aria-label={`Вариант ${oi + 1}`} value={o.label} onChange={(e) => upd((d) => { d.questions[qi].options[oi].label = e.target.value; })} />
                <div className="score-inputs">
                  {keys.map((k) => (
                    <input key={k} className="input" type="number" title={`Баллы: ${k}`} aria-label={`Баллы по шкале ${k}`} value={o.scores[k] ?? 0} onChange={(e) => upd((d) => { d.questions[qi].options[oi].scores[k] = Number(e.target.value) || 0; })} />
                  ))}
                </div>
                <input className="input" type="number" style={{ width: 80 }} placeholder="→ №" title="Перейти к вопросу №" value={o.jumpToPosition ?? ""} onChange={(e) => upd((d) => { d.questions[qi].options[oi].jumpToPosition = e.target.value ? Number(e.target.value) : null; })} />
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.questions[qi].options.splice(oi, 1); })} disabled={q.options.length <= 2} aria-label="Удалить вариант">×</button>
              </div>
            ))}
            <div className="cluster">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.questions[qi].options.push({ label: "", scores: {} }); })}>+ Вариант</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.questions[qi].options = LIKERT.map((label, i) => ({ label, scores: { [keys[0]]: i } })); })}>Заполнить шкалой «почти никогда … почти всегда» (0–4)</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn--secondary btn--sm" style={{ width: "fit-content" }} onClick={() => upd((d) => { d.questions.push({ type: "scale", text: "", options: LIKERT.map((label, i) => ({ label, scores: { [keys[0]]: i } })) }); })}>+ Вопрос</button>
      </section>

      <section className="panel">
        <h2>Правила результатов</h2>
        <p className="caption" style={{ margin: 0 }}>Для каждой шкалы задайте диапазоны баллов без пропусков и пересечений. Формулируйте бережно: без диагнозов и ярлыков.</p>
        {s.bands.map((b, bi) => (
          <div key={bi} className="q-block">
            <div className="opt-row" style={{ gridTemplateColumns: "1fr 90px 90px auto" }}>
              <select className="select" aria-label="Шкала" value={b.scaleKey} onChange={(e) => upd((d) => { d.bands[bi].scaleKey = e.target.value; })}>{s.scales.map((sc) => <option key={sc.key} value={sc.key}>{sc.title}</option>)}</select>
              <input className="input" type="number" aria-label="От" title="От (включительно)" value={b.minScore} onChange={(e) => upd((d) => { d.bands[bi].minScore = Number(e.target.value); })} />
              <input className="input" type="number" aria-label="До" title="До (включительно)" value={b.maxScore} onChange={(e) => upd((d) => { d.bands[bi].maxScore = Number(e.target.value); })} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => upd((d) => { d.bands.splice(bi, 1); })}>Удалить</button>
            </div>
            <input className="input" placeholder="Заголовок результата" value={b.title} onChange={(e) => upd((d) => { d.bands[bi].title = e.target.value; })} />
            <textarea className="textarea" style={{ minHeight: 90 }} placeholder="Описание (что это может означать)" value={b.description} onChange={(e) => upd((d) => { d.bands[bi].description = e.target.value; })} />
            <textarea className="textarea" style={{ minHeight: 70 }} placeholder="Что можно попробовать" value={b.recommendations} onChange={(e) => upd((d) => { d.bands[bi].recommendations = e.target.value; })} />
            <input className="input" placeholder="Ссылки через запятую: library/slug, practices/slug" value={b.links.join(", ")} onChange={(e) => upd((d) => { d.bands[bi].links = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); })} />
          </div>
        ))}
        <button type="button" className="btn btn--secondary btn--sm" style={{ width: "fit-content" }} onClick={() => upd((d) => { d.bands.push({ scaleKey: keys[0], minScore: 0, maxScore: 0, title: "", description: "", recommendations: "", links: [] }); })}>+ Правило</button>
      </section>
    </div>
  );
}
