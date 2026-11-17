import Link from "next/link";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { DemoBadge } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";

export const metadata: Metadata = { title: "Книжная полка", description: "Авторские подборки психологической литературы с собственными аннотациями.", alternates: { canonical: "/books/" } };

export default function Books() {
  const c = content();
  const groups = [
    ...c.topics.map((t) => ({ title: t.title, books: c.books.filter((b) => b.topic === t.slug) })),
    { title: "Разное", books: c.books.filter((b) => !b.topic || !c.topics.some((t) => t.slug === b.topic)) },
  ].filter((g) => g.books.length);
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Книжная полка" }]} />
        <p className="eyebrow">Книжная полка</p>
        <h1>Что почитать, <em className="display-italic">чтобы понять глубже</em></h1>
        <p className="lead">Подборки по темам с нашими аннотациями. Мы не публикуем тексты книг — только собственные заметки и библиографические сведения.</p>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: "3rem" }}>
            <h2>{g.title}</h2>
            {g.books.map((b) => (
              <article key={b.slug} id={b.slug} className="book">
                <Visual src={b.cover} seed={b.slug} label={false} glyph={b.title.charAt(0)} />
                <div>
                  <p className="caption" style={{ margin: 0 }}>{b.authors}{b.year ? `, ${b.year}` : ""}{b.publisher ? ` · ${b.publisher}` : ""}</p>
                  <h3>{b.title}</h3>
                  {b.annotation && <p>{b.annotation}</p>}
                  {b.whyRead && <p className="muted small"><strong>Зачем читать:</strong> {b.whyRead}</p>}
                  <div className="cluster">
                    {b.link && <a className="link-arrow small" href={b.link} target="_blank" rel="noopener noreferrer nofollow">Библиографические сведения</a>}
                    {b.isbn && <span className="caption">ISBN {b.isbn}</span>}
                    <DemoBadge show={b.demo} />
                    <FavoriteButton type="book" id={b.slug} title={b.title} url={`/books#${b.slug}`} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}
        {!c.books.length && <div className="empty">Полка пока пуста. <Link href="/library">Загляните в библиотеку</Link>.</div>}
      </section>
    </>
  );
}
