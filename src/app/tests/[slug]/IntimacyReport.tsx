"use client";
/**
 * Расширенный отчёт опросника «Эмоциональная близость в романтических отношениях».
 * Загружается отдельным фрагментом кода только после завершения теста.
 */
import { useMemo, useState } from "react";
import { buildReport, GLOSSARY, OVERALL, SOURCES, LEVEL_LABEL, type Report } from "@/lib/intimacy/report";
import type { EvidenceKind, Exercise, Recommendation } from "@/lib/intimacy/types";
import { Ring, BandScale, Radar, ScaleBars, ProgramStrip } from "@/components/intimacy/Charts";
import { CrisisNote } from "@/components/Notices";

const KIND: Record<EvidenceKind, { label: string; title: string }> = {
  emp: { label: "Исследования", title: "Эмпирически подтверждённая закономерность" },
  theory: { label: "Теория", title: "Теоретическое объяснение" },
  clinical: { label: "Клиника", title: "Клиническая модель или гипотеза" },
};
const BAND_SHORT = ["выраженный дефицит", "сниженная", "умеренная", "высокая", "очень высокая"];
const sourceIndex = new Map(SOURCES.map((s, i) => [s.id, i + 1]));

const SECTIONS = [
  ["ir-total", "Общий показатель"],
  ["ir-overall", "Интерпретация"],
  ["ir-scales", "Восемь шкал"],
  ["ir-combos", "Сочетание показателей"],
  ["ir-strengths", "Сильные стороны"],
  ["ir-focus", "Зоны внимания"],
  ["ir-mech", "Механизмы"],
  ["ir-recs", "Рекомендации"],
  ["ir-ex", "Упражнения"],
  ["ir-program", "Программа на 14 дней"],
  ["ir-track", "Отслеживание"],
  ["ir-sources", "Источники"],
] as const;

export default function IntimacyReport({ scores, crisisText }: { scores: Record<string, number>; crisisText: string }) {
  const [safety, setSafety] = useState<"unknown" | "no" | "yes">("unknown");
  const r: Report = useMemo(() => buildReport(scores, { safetyConcern: safety === "yes" }), [scores, safety]);
  const mark = (k: string) => (r.strengths.some((s) => s.key === k) ? "strength" : r.focus.some((s) => s.key === k) ? "focus" : undefined);
  const [fa, fb] = r.focus;

  return (
    <div className="ir">
      <nav className="ir-toc no-print" aria-label="Разделы отчёта">
        {SECTIONS.map(([id, t], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, "0")}</span>{t}</a>)}
      </nav>

      {/* Безопасность — до всего остального */}
      <section className="ir-safety no-print" aria-labelledby="ir-safety-h">
        <h3 id="ir-safety-h">Прежде чем читать дальше</h3>
        <p>Бывает ли, что вы боитесь реакции партнёра, сталкиваетесь с угрозами, унижением, контролем, принуждением или физическим насилием? Ответ не сохраняется и нужен только для того, чтобы отчёт не предлагал вам неподходящих совместных упражнений.</p>
        <div className="cluster" role="group" aria-label="Ответ о безопасности">
          <button className={`btn btn--sm ${safety === "no" ? "btn--primary" : "btn--secondary"}`} aria-pressed={safety === "no"} onClick={() => setSafety("no")}>Нет, такого нет</button>
          <button className={`btn btn--sm ${safety === "yes" ? "btn--primary" : "btn--secondary"}`} aria-pressed={safety === "yes"} onClick={() => setSafety("yes")}>Да, бывает / не уверен(а)</button>
        </div>
        {safety === "yes" && (
          <div className="notice notice--crisis" style={{ marginTop: "1rem" }} role="status">
            <strong>Ваша безопасность важнее упражнений.</strong> Совместные практики раскрытия в такой ситуации не стоит использовать как основное решение. Отчёт теперь предлагает только индивидуальные задания. Пожалуйста, обратитесь к психологу или в профильную службу помощи; при угрозе жизни и здоровью звоните 112. Не обсуждайте этот отчёт с партнёром, если это может быть небезопасно, и подумайте, где хранить результат.
          </div>
        )}
        {safety !== "yes" && r.safetyAlert && (
          <p className="notice" style={{ marginTop: "1rem" }}>Показатель эмоциональной безопасности в вашем профиле очень низкий. Это не означает наличия насилия: опросник не может этого определить. Но если вам бывает страшно рядом с партнёром, выберите ответ «Да» выше — отчёт перестроится.</p>
        )}
      </section>

      {/* 1. Общий показатель */}
      <section id="ir-total" className="ir-sec ir-total" aria-labelledby="ir-total-h">
        <SecHead n={1} id="ir-total-h">Общий показатель эмоциональной близости</SecHead>
        <div className="ir-total__grid">
          <Ring percent={r.percent} caption="общий индекс" />
          <div>
            <p className="ir-total__title">{r.band.title}</p>
            <dl className="ir-kv">
              <div><dt>Сумма баллов</dt><dd>{r.total} из 200</dd></div>
              <div><dt>Индекс</dt><dd>{r.percent}% <small>(S − 40) / 160 × 100</small></dd></div>
              <div><dt>Диапазон</dt><dd>{r.band.from}–{r.band.to}%</dd></div>
            </dl>
            <BandScale percent={r.percent} bands={OVERALL.map((b, i) => ({ from: b.from, to: b.to, short: BAND_SHORT[i] }))} />
          </div>
        </div>
        <p className="caption">Диапазоны условные и авторские: для этого опросника ещё нет норм, поэтому они не являются диагностическими порогами. Результат отражает ваше восприятие за последние четыре недели.</p>
      </section>

      {/* 2. Интерпретация общего результата */}
      <section id="ir-overall" className="ir-sec" aria-labelledby="ir-overall-h">
        <SecHead n={2} id="ir-overall-h">Что означает ваш общий результат</SecHead>
        <div className="prose">{r.band.text.map((t, i) => <p key={i}>{t}</p>)}</div>
        <details className="ir-glossary">
          <summary>Ключевые понятия отчёта</summary>
          <dl>{GLOSSARY.map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.def}</dd></div>)}</dl>
        </details>
      </section>

      {/* 3. Шкалы */}
      <section id="ir-scales" className="ir-sec" aria-labelledby="ir-scales-h">
        <SecHead n={3} id="ir-scales-h">Результаты по восьми шкалам</SecHead>
        <div className="ir-scales__charts">
          <div className="ir-card ir-card--soft"><Radar items={r.scales.map((s) => ({ key: s.key, label: s.short, percent: s.percent, mark: mark(s.key) }))} /></div>
          <div className="ir-card">
            <ScaleBars items={r.scales.map((s) => ({ key: s.key, label: s.short, percent: s.percent, sum: s.sum, level: s.level, mark: mark(s.key) }))} />
            <div className="ir-legend" aria-hidden="true"><span><i className="ir-dot ir-dot--low" />низкие 0–35%</span><span><i className="ir-dot ir-dot--mid" />средние 40–70%</span><span><i className="ir-dot ir-dot--high" />высокие 75–100%</span></div>
          </div>
        </div>
        <p className="caption">Индекс шкалы: (Sₖ − 5) / 20 × 100. Одно утверждение сдвигает шкалу на 5%, поэтому разница в 5–10 пунктов между шкалами не слишком информативна.</p>
        <div className="ir-scale-list">
          {r.scales.map((s) => {
            const lt = s.info.levels[s.level];
            return (
              <details key={s.key} className={`ir-scale ir-scale--${s.level}`} open={mark(s.key) === "focus"}>
                <summary>
                  <span className="ir-scale__pct">{s.percent}%</span>
                  <span className="ir-scale__name">{s.title}<small>{LEVEL_LABEL[s.level]} · {lt.title}</small></span>
                </summary>
                <div className="ir-scale__body">
                  <p className="ir-scale__measures"><b>Что измеряет.</b> {s.info.measures}</p>
                  <div className="prose">{lt.text.map((t, i) => <p key={i}>{t}</p>)}</div>
                  <p className="ir-distinct"><b>Не путать с соседними шкалами.</b> {s.info.distinct}</p>
                  <Evidence items={s.info.evidence} />
                  <h4>Что можно сделать</h4>
                  <RecList items={lt.recommendations} />
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 4. Сочетания */}
      <section id="ir-combos" className="ir-sec" aria-labelledby="ir-combos-h">
        <SecHead n={4} id="ir-combos-h">Индивидуальный анализ сочетания показателей</SecHead>
        {r.discrepancies.length > 0 && (
          <div className="ir-card ir-card--soft">
            <h4 style={{ marginTop: 0 }}>Значимые расхождения между шкалами</h4>
            <ul className="ir-gaps">
              {r.discrepancies.map((d) => {
                const hi = r.scales.find((s) => s.key === d.high)!;
                const lo = r.scales.find((s) => s.key === d.low)!;
                return (
                  <li key={d.high + d.low}>
                    <div className="ir-gap" aria-hidden="true">
                      <span className="ir-gap__pill is-hi" style={{ width: `${Math.max(hi.percent, 6)}%` }}>{hi.short} {hi.percent}%</span>
                      <span className="ir-gap__pill is-lo" style={{ width: `${Math.max(lo.percent, 6)}%` }}>{lo.short} {lo.percent}%</span>
                    </div>
                    <p>{d.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {r.combos.length > 0 ? r.combos.map((c) => (
          <article key={c.id} className="ir-combo">
            <h3>{c.title}</h3>
            <div className="prose">{c.text.map((t, i) => <p key={i}>{t}</p>)}</div>
            <RecList items={c.recommendations} />
          </article>
        )) : (
          <p className="prose">В вашем профиле нет выраженных характерных сочетаний: шкалы не образуют ни одной из описанных конфигураций, а различия между ними умеренные. Это значит, что профиль лучше читать по отдельным шкалам и через две области с наименьшими значениями.</p>
        )}
        {r.contradictions.length > 0 && (
          <p className="notice"><strong>Возможные противоречия профиля:</strong> {r.contradictions.map((c) => c.title.toLowerCase()).join("; ")}. Противоречие не означает ошибку в ответах — чаще оно указывает на процесс, который стоит рассмотреть внимательнее.</p>
        )}
      </section>

      {/* 5–6. Сильные стороны и зоны внимания */}
      <section id="ir-strengths" className="ir-sec" aria-labelledby="ir-strengths-h">
        <SecHead n={5} id="ir-strengths-h">Две сильные стороны эмоционального взаимодействия</SecHead>
        <div className="ir-duo">
          {r.strengths.map((s) => (
            <div key={s.key} className="ir-pillcard ir-pillcard--olive">
              <span className="ir-pillcard__n">{s.percent}%</span>
              <div><b>{s.title}</b><p>{s.info.levels[s.level].title}. {s.level === "high" ? "Это ресурс, на который можно опираться при работе над более слабыми областями." : "Это ваши относительно более сильные стороны; даже не будучи высокими, они дают точку опоры."}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section id="ir-focus" className="ir-sec" aria-labelledby="ir-focus-h">
        <SecHead n={6} id="ir-focus-h">Две области, требующие первоочередного внимания</SecHead>
        {r.allHigh && <p className="caption">Все шкалы в вашем профиле высокие. Ниже — области с относительно меньшими значениями: речь не о проблемах, а о том, где близость может стать ещё устойчивее.</p>}
        <div className="ir-duo">
          {r.focus.map((s) => (
            <div key={s.key} className="ir-pillcard ir-pillcard--pink">
              <span className="ir-pillcard__n">{s.percent}%</span>
              <div><b>{s.title}</b><p>{s.info.levels[s.level].title}. {s.info.measures}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Механизмы */}
      <section id="ir-mech" className="ir-sec" aria-labelledby="ir-mech-h">
        <SecHead n={7} id="ir-mech-h">Возможные психологические механизмы трудностей</SecHead>
        <p className="caption">Это гипотезы для размышления, а не установленные причины. Узнайте, какие из них похожи на вашу ситуацию, а какие — нет.</p>
        <div className="ir-duo">
          {r.mechanisms.map((m) => (
            <div key={m.scale.key} className="ir-card">
              <h4 style={{ marginTop: 0 }}>{m.scale.title}</h4>
              <ul>{m.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Рекомендации */}
      <section id="ir-recs" className="ir-sec" aria-labelledby="ir-recs-h">
        <SecHead n={8} id="ir-recs-h">Пять персональных рекомендаций</SecHead>
        <ol className="ir-recs">
          {r.recommendations.map((rec, i) => (
            <li key={i} className="ir-rec">
              <span className="ir-rec__n">{i + 1}</span>
              <div>
                <p className="ir-rec__src">{rec.source}</p>
                <h4>{rec.title}</h4>
                <dl>
                  <div><dt>Что делать</dt><dd>{rec.action}</dd></div>
                  <div><dt>Почему это важно</dt><dd>{rec.why}</dd></div>
                  <div><dt>Как понять, что получается</dt><dd>{rec.measure}</dd></div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 9. Упражнения */}
      <section id="ir-ex" className="ir-sec" aria-labelledby="ir-ex-h">
        <SecHead n={9} id="ir-ex-h">Три наиболее подходящих упражнения</SecHead>
        <p className="caption">Упражнения авторские: они опираются на принципы перечисленных подходов, но их эффективность отдельно не исследовалась.{r.safetyMode && " С учётом вашего ответа о безопасности выбраны только индивидуальные задания."}</p>
        {r.exercises.map((e, i) => <ExerciseCard key={e.id} e={e} n={i + 1} />)}
      </section>

      {/* 10. Программа */}
      <section id="ir-program" className="ir-sec" aria-labelledby="ir-program-h">
        <SecHead n={10} id="ir-program-h">Индивидуальная программа на 14 дней</SecHead>
        <p>Программа построена на двух областях с наименьшими значениями — «{fa.title}» и «{fb.title}» — и чередует их день за днём. Сначала вы наблюдаете и осознаёте, затем пробуете новые способы взаимодействия и закрепляете то, что сработало. Программа не гарантирует улучшения отношений за две недели: её задача — дать опыт и информацию для дальнейших шагов.</p>
        <ProgramStrip days={r.program} a={{ key: fa.key, label: fa.title }} b={{ key: fb.key, label: fb.title }} />
        {r.safetyMode && <p className="notice">В режиме безопасности выполняйте вместо совместных шагов указанные индивидуальные альтернативы.</p>}
        <div className="ir-days">
          {r.program.map((d) => (
            <details key={d.day} id={`day-${d.day}`} className={`ir-day ${d.scale === fa.key ? "is-a" : "is-b"}`}>
              <summary><span className="ir-day__n">День {d.day}</span><span className="ir-day__t">{d.task}<small>{d.stage} · {d.scaleTitle} · {d.minutes} мин</small></span></summary>
              <div className="ir-day__body">
                <p><b>Упражнение:</b> {d.exercise}</p>
                <ol>{d.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                <dl className="ir-kv ir-kv--stack">
                  <div><dt>Вопрос для себя</dt><dd>{d.reflectSolo}</dd></div>
                  <div><dt>Вопрос для разговора вдвоём</dt><dd>{r.safetyMode ? "Пропустите, если разговор может быть небезопасным." : d.reflectJoint}</dd></div>
                  <div><dt>Что отмечать</dt><dd>{d.indicator}</dd></div>
                  <div><dt>Если партнёр не готов участвовать</dt><dd>{d.soloAlt}</dd></div>
                </dl>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 11. Отслеживание */}
      <section id="ir-track" className="ir-sec" aria-labelledby="ir-track-h">
        <SecHead n={11} id="ir-track-h">Как отслеживать изменения</SecHead>
        <ul className="ir-checklist">{r.tracking.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <div style={{ marginTop: "1.5rem" }}><CrisisNote text={crisisText} /></div>
      </section>

      {/* 12. Источники */}
      <section id="ir-sources" className="ir-sec" aria-labelledby="ir-sources-h">
        <SecHead n={12} id="ir-sources-h">Научные источники</SecHead>
        <p className="caption">Отчёт различает три вида опоры: <Kind k="emp" /> — закономерности, подтверждённые в эмпирических исследованиях; <Kind k="theory" /> — теоретические объяснения; <Kind k="clinical" /> — клинические модели и гипотезы, которые используются в практике, но не являются доказанными фактами для конкретного человека.</p>
        <ol className="ir-sources">
          {SOURCES.map((s) => <li key={s.id} id={`src-${s.id}`}>{s.cite} {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.url.replace("https://", "")}</a>}</li>)}
        </ol>
        <p className="caption">Опросник авторский и не стандартизирован. Для научно обоснованной интерпретации нужна психометрическая проверка: факторная структура, внутренняя согласованность, конвергентная и дискриминантная валидность (см. Clark & Watson, 1995).</p>
      </section>

      <div className="cluster no-print" style={{ marginTop: "2rem" }}>
        <button className="btn btn--secondary" onClick={() => window.print()}>Сохранить отчёт в PDF</button>
      </div>
    </div>
  );
}

function SecHead({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return <h2 id={id} className="ir-h"><span className="ir-h__n">{String(n).padStart(2, "0")}</span>{children}</h2>;
}

function Kind({ k }: { k: EvidenceKind }) {
  return <span className={`ir-kind ir-kind--${k}`} title={KIND[k].title}>{KIND[k].label}</span>;
}

function Evidence({ items }: { items: Report["scales"][number]["info"]["evidence"] }) {
  return (
    <div className="ir-evidence">
      <p className="caption" style={{ margin: 0 }}>Научная опора</p>
      <ul>
        {items.map((e, i) => (
          <li key={i}><Kind k={e.kind} /> {e.text} {e.refs.map((id) => <a key={id} href={`#src-${id}`} className="ir-ref">[{sourceIndex.get(id)}]</a>)}</li>
        ))}
      </ul>
    </div>
  );
}

function RecList({ items }: { items: Recommendation[] }) {
  return (
    <ul className="ir-mini-recs">
      {items.map((r, i) => (
        <li key={i}>
          <b>{r.title}.</b> {r.action}
          <span className="ir-mini-recs__meta"><i>Почему:</i> {r.why} <i>Как оценить:</i> {r.measure}</span>
        </li>
      ))}
    </ul>
  );
}

function ExerciseCard({ e, n }: { e: Exercise; n: number }) {
  return (
    <article className="ir-ex">
      <header className="ir-ex__head">
        <span className="ir-ex__n">{n}</span>
        <div>
          <h3>{e.name}</h3>
          <div className="cluster"><span className="badge">{e.minutes} мин</span><span className="badge">{e.format === "pair" ? "вдвоём" : "индивидуально"}</span></div>
        </div>
      </header>
      <dl className="ir-kv ir-kv--stack">
        <div><dt>Психологическая цель</dt><dd>{e.goal}</dd></div>
        <div><dt>Теоретическое обоснование</dt><dd>{e.rationale}</dd></div>
        <div><dt>Кому подходит</dt><dd>{e.indications}</dd></div>
        <div><dt>Подготовка</dt><dd>{e.prep}</dd></div>
      </dl>
      <h4>Пошаговая инструкция</h4>
      <ol className="ir-steps">{e.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <h4>Примеры реплик</h4>
      <ul className="ir-quotes">{e.phrases.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <h4>Вопросы для рефлексии</h4>
      <ul>{e.reflection.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <dl className="ir-kv ir-kv--stack">
        <div><dt>Ожидаемые изменения</dt><dd>{e.expected}</dd></div>
        <div className="ir-limits"><dt>Ограничения</dt><dd>{e.limits}</dd></div>
      </dl>
    </article>
  );
}
