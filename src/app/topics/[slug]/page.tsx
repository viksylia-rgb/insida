import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopic, topicContent } from "@/server/services/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleCardView, SimpleCard } from "@/components/Cards";
import { KIND_LABELS, minutes } from "@/lib/format";
import { Disclaimer } from "@/components/Notices";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const t = await getTopic((await params).slug);
  return t ? { title: t.title, description: t.description ?? undefined, alternates: { canonical: `/topics/${t.slug}` } } : { title: "Тема не найдена" };
}

export default async function TopicPage({ params }: P) {
  const t = await getTopic((await params).slug);
  if (!t) notFound();
  const c = await topicContent(t.id);
  const empty = !c.articles.length && !c.tests.length && !c.practices.length && !c.books.length;
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ href: "/library", label: "Темы" }, { label: t.title }]} />
        <p className="eyebrow">Тема</p>
        <h1>{t.title}</h1>
        {t.description && <p className="lead">{t.description}</p>}
      </header>
      <div className="container" style={{ paddingBottom: "5rem", display: "grid", gap: "4rem" }}>
        {empty && <div className="empty">По этой теме материалов пока нет.</div>}
        {c.articles.length > 0 && (
          <section aria-labelledby="ta"><h2 id="ta">Материалы</h2><div className="grid grid--3">{c.articles.map((a) => <ArticleCardView key={a.id} a={a} />)}</div></section>
        )}
        {(c.tests.length > 0 || c.practices.length > 0) && (
          <section aria-labelledby="tp"><h2 id="tp">Тесты и практики</h2>
            <div className="grid grid--3">
              {c.tests.map((x) => <SimpleCard key={x.slug} href={`/tests/${x.slug}`} title={x.title} excerpt={x.excerpt} meta={["Тест", minutes(x.durationMinutes)]} isDemo={x.isDemo} cta="Пройти" />)}
              {c.practices.map((x) => <SimpleCard key={x.slug} href={`/practices/${x.slug}`} title={x.title} excerpt={x.excerpt} meta={[KIND_LABELS[x.kind], minutes(x.durationMinutes)]} isDemo={x.isDemo} cta="Начать" />)}
            </div>
          </section>
        )}
        {c.books.length > 0 && (
          <section aria-labelledby="tb"><h2 id="tb">Книги</h2>
            <div className="grid grid--3">{c.books.map((b) => <SimpleCard key={b.id} href={`/books#${b.slug}`} title={b.title} excerpt={b.authors} isDemo={b.isDemo} />)}</div>
          </section>
        )}
        <Disclaimer />
      </div>
    </>
  );
}
