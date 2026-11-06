import Link from "next/link";
import type { Metadata } from "next";
import { listBooks, listTopics } from "@/server/services/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { DemoBadge } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";

export const metadata: Metadata = { title: "Книжная полка", description: "Авторские подборки психологической литературы с собственными аннотациями.", alternates: { canonical: "/books" } };
export const revalidate = 300;

export default async function Books() {
  const [rows, topics] = await Promise.all([listBooks(), listTopics()]);
  const groups = topics.map((t) => ({ t, books: rows.filter((r) => r.topicSlug === t.slug) })).filter((g) => g.books.length);
  const other = rows.filter((r) => !r.topicSlug);
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Книжная полка" }]} />
        <p className="eyebrow">Книжная полка</p>
        <h1>Что почитать, <em className="display-italic">чтобы понять глубже</em></h1>
        <p className="lead">Подборки по темам с нашими аннотациями. Мы не публикуем тексты книг — только собственные заметки и библиографические сведения.</p>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {[...groups.map((g) => ({ title: g.t.title, books: g.books })), ...(other.length ? [{ title: "Разное", books: other }] : [])].map((g) => (
          <div key={g.title} style={{ marginBottom: "3rem" }}>
            <h2>{g.title}</h2>
            {g.books.map(({ book: b }) => (
              <article key={b.id} id={b.slug} className="book">
                <Visual src={b.coverImage} seed={b.slug} label={false} glyph={b.title.charAt(0)} />
                <div>
                  <p className="caption" style={{ margin: 0 }}>{b.authors}{b.year ? `, ${b.year}` : ""}{b.publisher ? ` · ${b.publisher}` : ""}</p>
                  <h3>{b.title}</h3>
                  {b.annotation && <p>{b.annotation}</p>}
                  {b.whyRead && <p className="muted small"><strong>Зачем читать:</strong> {b.whyRead}</p>}
                  <div className="cluster">
                    {b.bibliographyUrl && <a className="link-arrow small" href={b.bibliographyUrl} target="_blank" rel="noopener noreferrer nofollow">Библиографические сведения</a>}
                    {b.isbn && <span className="caption">ISBN {b.isbn}</span>}
                    <DemoBadge show={b.isDemo} />
                    <FavoriteButton type="book" id={b.id} title={b.title} url={`/books#${b.slug}`} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}
        {!rows.length && <div className="empty">Полка пока пуста. <Link href="/library">Загляните в библиотеку</Link>.</div>}
      </section>
    </>
  );
}
