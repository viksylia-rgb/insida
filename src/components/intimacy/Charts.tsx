/**
 * Инфографика отчёта «Эмоциональная близость». Чистый SVG/HTML без библиотек,
 * цвета — из токенов (--viz-*), поэтому графики работают в светлой и тёмной теме.
 */
import type { CSSProperties } from "react";

/** Кольцо с общим индексом. */
export function Ring({ percent, caption }: { percent: number; caption: string }) {
  const r = 84;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <svg className="ir-ring" viewBox="0 0 200 200" role="img" aria-label={`${caption}: ${p}%`}>
      <circle cx="100" cy="100" r={r} fill="none" stroke="var(--viz-track)" strokeWidth="18" />
      <circle cx="100" cy="100" r={r} fill="none" stroke="var(--viz-1)" strokeWidth="18" strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`} transform="rotate(-90 100 100)" />
      <text x="100" y="104" textAnchor="middle" className="ir-ring__n">{p}<tspan className="ir-ring__pct">%</tspan></text>
      <text x="100" y="132" textAnchor="middle" className="ir-ring__cap">{caption}</text>
    </svg>
  );
}

/** Пять условных диапазонов общего результата в виде «пилюль» с маркером. */
export function BandScale({ percent, bands }: { percent: number; bands: { from: number; to: number; short: string }[] }) {
  const colors = ["var(--viz-low)", "var(--viz-2)", "var(--viz-3)", "color-mix(in srgb, var(--viz-1) 60%, var(--viz-3))", "var(--viz-1)"];
  return (
    <div className="ir-bands" role="img" aria-label={`Положение результата ${percent}% среди пяти условных диапазонов`}>
      <div className="ir-bands__row">
        {bands.map((b, i) => {
          const active = percent >= b.from && percent <= b.to;
          return (
            <div key={b.from} className={`ir-bands__pill${active ? " is-active" : ""}`} style={{ flexGrow: b.to - b.from + 1, background: colors[i] } as CSSProperties}>
              {active && <span className="ir-bands__marker" style={{ left: `${((percent - b.from) / (b.to - b.from + 1)) * 100}%` }} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
      <div className="ir-bands__row ir-bands__labels" aria-hidden="true">
        {bands.map((b) => (
          <span key={b.from} style={{ flexGrow: b.to - b.from + 1 }} className={percent >= b.from && percent <= b.to ? "is-active" : ""}>
            <b>{b.from}–{b.to}</b>{b.short}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Радар восьми шкал. */
export function Radar({ items }: { items: { key: string; label: string; percent: number; mark?: "strength" | "focus" }[] }) {
  const cx = 200, cy = 190, R = 130;
  const n = items.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = items.map((it, i) => pt(i, Math.max(it.percent, 2) / 100).join(",")).join(" ");
  return (
    <svg className="ir-radar" viewBox="-80 0 560 380" role="img" aria-label={"Профиль по восьми шкалам: " + items.map((i) => `${i.label} ${i.percent}%`).join(", ")}>
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon key={g} points={items.map((_, i) => pt(i, g).join(",")).join(" ")} fill={g === 1 ? "var(--viz-track)" : "none"} stroke="var(--line-strong)" strokeWidth="1" opacity={g === 1 ? 0.9 : 0.7} />
      ))}
      {items.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-strong)" strokeWidth="1" opacity="0.7" />; })}
      <polygon points={poly} fill="var(--viz-1)" fillOpacity="0.28" stroke="var(--viz-1)" strokeWidth="2.5" strokeLinejoin="round" />
      {items.map((it, i) => {
        const [x, y] = pt(i, Math.max(it.percent, 2) / 100);
        const fill = it.mark === "focus" ? "var(--viz-low)" : it.mark === "strength" ? "var(--viz-4)" : "var(--viz-1)";
        return <circle key={it.key} cx={x} cy={y} r={it.mark ? 7 : 5} fill={fill} stroke="var(--surface)" strokeWidth="2" />;
      })}
      {items.map((it, i) => {
        const [x, y] = pt(i, 1.2);
        const anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={it.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="ir-radar__label">
            {it.label}<tspan className="ir-radar__val" dx="5">{it.percent}%</tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** Горизонтальные «пилюли» по шкалам с зонами уровней. */
export function ScaleBars({ items }: { items: { key: string; label: string; percent: number; sum: number; level: "low" | "mid" | "high"; mark?: "strength" | "focus" }[] }) {
  return (
    <ul className="ir-bars" aria-label="Индексы восьми шкал">
      {items.map((it) => (
        <li key={it.key} className="ir-bars__row">
          <span className="ir-bars__label">
            {it.label}
            {it.mark === "strength" && <span className="ir-tag ir-tag--strength">сильная сторона</span>}
            {it.mark === "focus" && <span className="ir-tag ir-tag--focus">зона внимания</span>}
          </span>
          <span className="ir-bars__track" aria-hidden="true">
            <span className="ir-bars__zone" style={{ left: "37.5%" }} />
            <span className="ir-bars__zone" style={{ left: "72.5%" }} />
            <span className={`ir-bars__fill ir-bars__fill--${it.level}`} style={{ width: `${Math.max(it.percent, 4)}%` }} />
          </span>
          <span className="ir-bars__val"><b>{it.percent}%</b><small>{it.sum} из 25</small></span>
        </li>
      ))}
    </ul>
  );
}

/** Календарь программы: 14 плиток, цвет — шкала, подпись — этап. */
export function ProgramStrip({ days, a, b }: { days: { day: number; scale: string; stage: string }[]; a: { key: string; label: string }; b: { key: string; label: string } }) {
  return (
    <div className="ir-strip">
      <div className="ir-strip__legend" aria-hidden="true">
        <span><i className="ir-dot ir-dot--a" />{a.label}</span>
        <span><i className="ir-dot ir-dot--b" />{b.label}</span>
      </div>
      <ol className="ir-strip__grid" aria-label="Расписание 14 дней">
        {days.map((d) => (
          <li key={d.day} className={`ir-strip__day ${d.scale === a.key ? "is-a" : "is-b"}`}>
            <a href={`#day-${d.day}`}><b>{d.day}</b><small>{d.stage}</small></a>
          </li>
        ))}
      </ol>
      <div className="ir-strip__stages" aria-hidden="true">
        <span style={{ flexGrow: 4 }}>наблюдение</span>
        <span style={{ flexGrow: 2 }}>осознание</span>
        <span style={{ flexGrow: 6 }}>навыки</span>
        <span style={{ flexGrow: 2 }}>закрепление</span>
      </div>
    </div>
  );
}

/** Восемь шкал опросника как палитра «плашек» — для страницы теста. */
export function ScaleSwatches({ items }: { items: { key: string; title: string; text: string }[] }) {
  const tones = ["is-pink", "is-olive", "is-cream", "is-beige", "is-dark"];
  return (
    <ul className="ir-swatches">
      {items.map((it, i) => (
        <li key={it.key} className={`ir-swatch ${tones[i % tones.length]}`}>
          <span className="ir-swatch__n">{String(i + 1).padStart(2, "0")}</span>
          <span className="ir-swatch__body"><b>{it.title}</b><small>{it.text}</small></span>
        </li>
      ))}
    </ul>
  );
}
