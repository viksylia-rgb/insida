import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content, toCard } from "@/lib/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleCardView, SimpleCard } from "@/components/Cards";
import { KIND_LABELS, minutes } from "@/lib/format";
import { Disclaimer } from "@/components/Notices";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const t = content().topics.find((x) => x.slug === slug);
  return t ? { title: t.title, description: t.description, alternates: { canonical: `/topics/${t.slug}/` } } : { title: "Тема не найдена" };
}

export default async function TopicPage({ params }: P) {
  const { slug } = await params;
  const c = content();
  const t = c.topics.find((x) => x.slug === slug);
  if (!t) notFound();
  const arts = c.articles.filter((a) => a.topic === slug).map(toCard);
  const tests = c.tests.filter((x) => x.topic === slug);
  const practices = c.practices.filter((x) => x.topic === slug);
  const books = c.books.filter((x) => x.topic === slug);
  const empty = !arts.length && !tests.length && !practices.length && !books.length;
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
        {arts.length > 0 && <section aria-labelledby="ta"><h2 id="ta">Материалы</h2><div className="grid grid--3">{arts.map((a) => <ArticleCardView key={a.slug} a={a} />)}</div></section>}
        {(tests.length > 0 || practices.length > 0) && (
          <section aria-labelledby="tp"><h2 id="tp">Тесты и практики</h2>
            <div className="grid grid--3">
              {tests.map((x) => <SimpleCard key={x.slug} href={`/tests/${x.slug}`} title={x.title} excerpt={x.excerpt} meta={["Тест", minutes(x.duration)]} isDemo={x.demo} cta="Пройти" />)}
              {practices.map((x) => <SimpleCard key={x.slug} href={`/practices/${x.slug}`} title={x.title} excerpt={x.excerpt} meta={[KIND_LABELS[x.kind], minutes(x.duration)]} isDemo={x.demo} cta="Начать" />)}
            </div>
          </section>
        )}
        {books.length > 0 && <section aria-labelledby="tb"><h2 id="tb">Книги</h2><div className="grid grid--3">{books.map((b) => <SimpleCard key={b.slug} href={`/books#${b.slug}`} title={b.title} excerpt={b.authors} isDemo={b.demo} />)}</div></section>}
        <Disclaimer />
      </div>
    </>
  );
}
