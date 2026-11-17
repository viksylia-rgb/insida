import type { Metadata } from "next";
import { content } from "@/lib/content";
import { SimpleCard } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { KIND_LABELS, minutes } from "@/lib/format";

export const metadata: Metadata = { title: "Практики", description: "Упражнения, дневники и рефлексивные задания для самостоятельной работы.", alternates: { canonical: "/practices/" } };
const GROUPS = [["exercise", "Упражнения"], ["journal", "Дневники"], ["reflection", "Рефлексия"]] as const;

export default function Practices() {
  const items = content().practices;
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Практики" }]} />
        <p className="eyebrow">Практики</p>
        <h1>Немного времени — <em className="display-italic">для себя</em></h1>
        <p className="lead">Короткие упражнения и вопросы для размышления. Ответы сохраняются только у вас в браузере: их можно скачать, распечатать или удалить.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem", display: "grid", gap: "3.5rem" }}>
        {!items.length && <div className="empty">Практики скоро появятся.</div>}
        {GROUPS.map(([k, label]) => {
          const list = items.filter((p) => p.kind === k);
          return list.length ? (
            <div key={k}>
              <h2 style={{ fontSize: "var(--fs-h3)" }}>{label}</h2>
              <div className="grid grid--3">{list.map((p) => <SimpleCard key={p.slug} href={`/practices/${p.slug}`} title={p.title} excerpt={p.excerpt} meta={[KIND_LABELS[p.kind], p.topicTitle ?? "", minutes(p.duration)]} isDemo={p.demo} seed={p.slug} cover={p.cover} cta="Начать" />)}</div>
            </div>
          ) : null;
        })}
        <Disclaimer />
      </section>
    </>
  );
}
