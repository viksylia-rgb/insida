/**
 * Инфографика для страниц сайта в стиле утверждённой палитры:
 * крупные скруглённые «плашки», светлые тона, оливковый — только акцентом.
 */
import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "pink" | "cream" | "beige" | "olive" | "blush";
const TONES: Tone[] = ["pink", "olive", "cream", "beige", "blush"];

/** Цифры-плашки, как образцы цветов в палитре: крупная плашка с числом и подпись рядом. */
export function PaletteStats({ items, label }: { items: { value: number | string; label: string; sub?: string; href?: string; tone?: Tone }[]; label: string }) {
  return (
    <ul className="pstats" aria-label={label}>
      {items.map((it, i) => {
        const tone = it.tone ?? TONES[i % TONES.length];
        const body = (
          <>
            <span className={`pstats__swatch tone-${tone}`}><b>{it.value}</b></span>
            <span className="pstats__text"><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span>
          </>
        );
        return <li key={it.label} className="pstats__item">{it.href ? <Link href={it.href}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

/** Карта тем: каждая тема — строка с составной «пилюлей» из статей, тестов и практик. */
export function TopicMap({ items }: { items: { slug: string; title: string; text?: string; counts: { label: string; value: number; tone: Tone }[] }[] }) {
  const max = Math.max(1, ...items.map((t) => t.counts.reduce((a, c) => a + c.value, 0)));
  const legend = items[0]?.counts ?? [];
  return (
    <div className="tmap">
      <div className="tmap__legend" aria-hidden="true">
        {legend.map((c) => <span key={c.label}><i className={`tmap__dot tone-${c.tone}`} />{c.label}</span>)}
      </div>
      <ol className="tmap__list">
        {items.map((t, i) => {
          const total = t.counts.reduce((a, c) => a + c.value, 0);
          return (
            <li key={t.slug} className="tmap__row">
              <span className="tmap__n">{String(i + 1).padStart(2, "0")}</span>
              <div className="tmap__head">
                <h3><Link href={`/topics/${t.slug}`}>{t.title}</Link></h3>
                {t.text && <p>{t.text}</p>}
              </div>
              <div className="tmap__bar" role="img" aria-label={`${t.title}: ` + t.counts.map((c) => `${c.label.toLowerCase()} — ${c.value}`).join(", ")}>
                <span className="tmap__track" style={{ width: `${Math.max((total / max) * 100, 12)}%` }}>
                  {t.counts.filter((c) => c.value > 0).map((c) => (
                    <span key={c.label} className={`tmap__seg tone-${c.tone}`} style={{ flexGrow: c.value }}>{c.value}</span>
                  ))}
                  {total === 0 && <span className="tmap__seg tone-cream" style={{ flexGrow: 1 }}>скоро</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Схема из шагов: скруглённые плашки, соединённые пунктиром. */
export function StepsFlow({ steps, label }: { steps: { title: string; text: ReactNode; tone?: Tone }[]; label: string }) {
  return (
    <ol className="sflow" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.title} className={`sflow__step tone-${s.tone ?? TONES[i % TONES.length]}`}>
          <span className="sflow__n">{i + 1}</span>
          <b>{s.title}</b>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Пропорции форматов: одна длинная пилюля, разделённая на доли. */
export function ShareBar({ items, label }: { items: { label: string; value: number; tone: Tone; href?: string }[]; label: string }) {
  const total = Math.max(1, items.reduce((a, b) => a + b.value, 0));
  return (
    <div className="sbar">
      <div className="sbar__pill" role="img" aria-label={label + ": " + items.map((i) => `${i.label} — ${i.value}`).join(", ")}>
        {items.filter((i) => i.value > 0).map((i) => (
          <span key={i.label} className={`sbar__seg tone-${i.tone}`} style={{ flexGrow: i.value }}>{Math.round((i.value / total) * 100)}%</span>
        ))}
      </div>
      <ul className="sbar__legend">
        {items.map((i) => (
          <li key={i.label}><i className={`tmap__dot tone-${i.tone}`} />{i.href ? <Link href={i.href}>{i.label}</Link> : i.label} <b>{i.value}</b></li>
        ))}
      </ul>
    </div>
  );
}
