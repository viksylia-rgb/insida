import Link from "next/link";
import type { Metadata } from "next";
import { listPractices } from "@/server/services/content";
import { SimpleCard } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { KIND_LABELS, minutes } from "@/lib/format";

export const metadata: Metadata = { title: "Практики", description: "Упражнения, дневники и рефлексивные задания для самостоятельной работы.", alternates: { canonical: "/practices" } };
const KINDS = [["", "Все"], ["exercise", "Упражнения"], ["journal", "Дневники"], ["reflection", "Рефлексия"]] as const;

export default async function Practices({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const k = (["exercise", "journal", "reflection"] as const).find((x) => x === kind);
  const items = await listPractices({ kind: k });
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Практики" }]} />
        <p className="eyebrow">Практики</p>
        <h1>Немного времени — <em className="display-italic">для себя</em></h1>
        <p className="lead">Короткие упражнения и вопросы для размышления. Ответы можно сохранить в личном кабинете, скачать или распечатать — или просто не сохранять.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        <div className="filters__row" style={{ marginBottom: "2rem" }}>
          <span className="filters__label">Формат</span>
          {KINDS.map(([v, l]) => <Link key={v} href={v ? `/practices?kind=${v}` : "/practices"} className="chip" aria-current={(kind ?? "") === v ? "true" : undefined}>{l}</Link>)}
        </div>
        {items.length ? (
          <div className="grid grid--3">
            {items.map((p) => <SimpleCard key={p.id} href={`/practices/${p.slug}`} title={p.title} excerpt={p.excerpt} meta={[KIND_LABELS[p.kind], p.topicTitle ?? "", minutes(p.durationMinutes)]} isDemo={p.isDemo} seed={p.slug} cover={p.coverImage} cta="Начать" />)}
          </div>
        ) : <div className="empty">Практик этого формата пока нет.</div>}
        <div style={{ marginTop: "3rem" }}><Disclaimer /></div>
      </section>
    </>
  );
}
