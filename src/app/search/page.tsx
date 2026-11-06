import Link from "next/link";
import type { Metadata } from "next";
import { listTopics, searchAll } from "@/server/services/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Поиск", robots: { index: false }, alternates: { canonical: "/search" } };

const TYPE = { article: "Материал", test: "Тест", practice: "Практика", program: "Программа", book: "Книга" } as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [hits, topics] = await Promise.all([q ? searchAll(q) : Promise.resolve([]), listTopics()]);
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Поиск" }]} />
        <h1>Поиск</h1>
        <form className="search-box" action="/search" role="search" style={{ marginTop: "1.5rem" }}>
          <label htmlFor="q" className="sr-only">Что ищем?</label>
          <input id="q" className="input" type="search" name="q" defaultValue={q} placeholder="Слово или фраза" autoFocus />
          <button className="btn btn--primary" type="submit">Найти</button>
        </form>
        <p className="caption" style={{ marginTop: "0.75rem" }}>Поиск понимает разные формы слов: «тревога» найдёт и «тревожность», и «тревоги».</p>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {q && <p className="caption" aria-live="polite">Результатов: {hits.length}</p>}
        {q && hits.length === 0 && (
          <div className="empty">
            <p>По запросу «{q}» ничего не нашлось.</p>
            <div className="cluster" style={{ justifyContent: "center" }}>{topics.slice(0, 6).map((t) => <Link key={t.id} href={`/topics/${t.slug}`} className="chip">{t.title}</Link>)}</div>
          </div>
        )}
        <ul className="list-plain">
          {hits.map((h) => (
            <li key={h.type + h.slug} style={{ display: "block" }}>
              <p className="caption" style={{ margin: 0 }}>{TYPE[h.type]}</p>
              <h2 style={{ fontSize: "1.6rem", margin: "0.2rem 0" }}><Link href={h.url} style={{ color: "var(--text)" }}>{h.title}</Link></h2>
              {h.excerpt && <p className="muted small" style={{ margin: 0 }}>{h.excerpt}</p>}
            </li>
          ))}
        </ul>
        {!q && (
          <div><p className="eyebrow">Популярные темы</p><div className="cluster">{topics.map((t) => <Link key={t.id} href={`/topics/${t.slug}`} className="chip">{t.title}</Link>)}</div></div>
        )}
      </section>
    </>
  );
}
