import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content, linkTitles } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TestRunner } from "./TestRunner";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().tests.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const t = content().tests.find((x) => x.slug === slug);
  return t ? { title: t.title, description: t.excerpt, alternates: { canonical: `/tests/${t.slug}/` } } : { title: "Тест не найден" };
}

export default async function TestPage({ params }: P) {
  const { slug } = await params;
  const c = content();
  const t = c.tests.find((x) => x.slug === slug);
  if (!t) notFound();
  const hints = Object.fromEntries(t.questions.map((q, i) => [`q${i + 1}`, q.hint ?? null]));
  const questions = t.engine.questions.map((q) => ({ ...q, hint: hints[q.id] }));
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/tests", label: "Тесты" }, { label: t.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">Тест · {minutes(t.duration)}</span><DemoBadge show={t.demo} /></div>
        <h1>{t.title}</h1>
        {t.excerpt && <p className="lead">{t.excerpt}</p>}
        <FavoriteButton type="test" id={t.slug} title={t.title} url={`/tests/${t.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {t.intro && <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(t.intro) }} />}
        <div style={{ margin: "2rem 0" }}><Disclaimer kind="test" /></div>
        <TestRunner test={{ id: t.slug, slug: t.slug, title: t.title }} questions={questions} scales={t.engine.scales} bands={t.engine.bands} linkTitles={linkTitles(t.results.flatMap((r) => r.links))} crisisText={c.settings.crisisText} />
        {(t.methodNote || t.sources.length > 0) && (
          <details className="faq" style={{ marginTop: "3rem" }}>
            <summary>Как устроен этот опросник</summary>
            <div className="prose small">
              {t.methodNote && <div dangerouslySetInnerHTML={{ __html: renderMarkdown(t.methodNote) }} />}
              {t.sources.length > 0 && <ol>{t.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a> : s.title}</li>)}</ol>}
            </div>
          </details>
        )}
      </section>
    </>
  );
}
