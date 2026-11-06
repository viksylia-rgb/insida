import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSettings, getTestFull, resolveLinkTitles } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TestRunner } from "./TestRunner";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const t = await getTestFull((await params).slug);
  return t ? { title: t.seoTitle ?? t.title, description: t.seoDescription ?? t.excerpt, alternates: { canonical: `/tests/${t.slug}` } } : { title: "Тест не найден" };
}

export default async function TestPage({ params }: P) {
  const { slug } = await params;
  const t = await getTestFull(slug);
  if (!t) notFound();
  const [settings, linkTitles] = await Promise.all([getSettings(), resolveLinkTitles(t.bands.flatMap((b) => b.links))]);
  // Подсчёт выполняется в браузере: ответы никуда не отправляются.
  const questions = t.questions.map((q) => ({
    id: q.id, position: q.position, type: q.type, text: q.text, hint: q.hint,
    options: q.options.map((o) => ({ id: o.id, label: o.label, jumpToPosition: o.jumpToPosition, scores: o.scores })),
  }));
  const bands = t.bands.map((b) => ({ scaleKey: b.scaleKey, minScore: b.minScore, maxScore: b.maxScore, title: b.title, description: b.description, recommendations: b.recommendations, links: b.links }));
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/tests", label: "Тесты" }, { label: t.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">Тест · {minutes(t.durationMinutes)}</span><DemoBadge show={t.isDemo} /></div>
        <h1>{t.title}</h1>
        {t.excerpt && <p className="lead">{t.excerpt}</p>}
        <FavoriteButton type="test" id={t.id} title={t.title} url={`/tests/${t.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {t.intro && <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(t.intro) }} />}
        <div style={{ margin: "2rem 0" }}><Disclaimer kind="test" /></div>
        <TestRunner test={{ id: t.id, slug: t.slug, title: t.title }} questions={questions} scales={t.scales} bands={bands} linkTitles={linkTitles} crisisText={settings.crisisText} />
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
