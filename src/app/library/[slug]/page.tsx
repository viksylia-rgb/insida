import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticle, getSettings, relatedArticles } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, KIND_LABELS, minutes } from "@/lib/format";
import { config } from "@/lib/config";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { CrisisNote, DemoBadge, Disclaimer } from "@/components/Notices";
import { ArticleCardView } from "@/components/Cards";
import { FavoriteButton } from "@/components/FavoriteButton";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "Материал не найден" };
  return {
    title: a.seoTitle ?? a.title,
    description: a.seoDescription ?? a.excerpt,
    alternates: { canonical: `/library/${a.slug}` },
    openGraph: { type: "article", title: a.seoTitle ?? a.title, description: a.seoDescription ?? a.excerpt, images: a.ogImage ?? a.coverImage ?? undefined, publishedTime: a.publishedAt?.toISOString(), modifiedTime: a.updatedAt.toISOString() },
  };
}

const REVIEW = { not_reviewed: "Не проверено", in_review: "На проверке", reviewed: "Проверено редактором" } as const;

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const [settings, related] = await Promise.all([getSettings(), relatedArticles(a.id, a.topicId, a.tags.map((t) => t.id))]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": a.kind === "term" ? "DefinedTerm" : "Article",
    headline: a.title,
    name: a.title,
    description: a.excerpt,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: (a.contentUpdatedAt ?? a.updatedAt).toISOString(),
    author: a.author ? { "@type": "Person", name: a.author } : undefined,
    publisher: { "@type": "Organization", name: "INSIDA" },
    inLanguage: "ru",
    mainEntityOfPage: `${config.siteUrl}/library/${a.slug}`,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="container article-head">
        <Breadcrumbs items={[{ href: "/library", label: "Библиотека" }, ...(a.topic ? [{ href: `/topics/${a.topic.slug}`, label: a.topic.title }] : []), { label: a.title }]} />
        <div className="cluster"><span className="badge">{KIND_LABELS[a.kind]}</span><DemoBadge show={a.isDemo} /></div>
        <h1>{a.title}</h1>
        {a.excerpt && <p className="lead" style={{ maxWidth: "60ch" }}>{a.excerpt}</p>}
        <div className="article-meta">
          {a.author && <span>Автор: {a.author}</span>}
          <span>Обновлено: {formatDate(a.contentUpdatedAt ?? a.updatedAt)}</span>
          <span>{minutes(a.readingMinutes)} чтения</span>
          <FavoriteButton type="article" id={a.id} title={a.title} url={`/library/${a.slug}`} />
        </div>
      </header>
      {a.kind !== "term" && (
        <div className="container" style={{ marginTop: "2rem" }}>
          <Visual src={a.coverImage} alt={a.coverAlt ?? ""} seed={a.slug} ratio="21 / 9" priority sizes="100vw" label={a.coverImage ? false : undefined} />
        </div>
      )}
      <div className="container section--tight">
        <div className="article-layout">
          <div>
            {a.sensitive && <div style={{ marginBottom: "2rem" }}><CrisisNote text={settings.crisisText} /></div>}
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
            {a.sources.length > 0 && (
              <section className="sources" aria-labelledby="src-h" style={{ marginTop: "3rem" }}>
                <h2 id="src-h" className="eyebrow">Источники</h2>
                <ol>
                  {a.sources.map((s, i) => (
                    <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a> : s.title}{s.note ? ` — ${s.note}` : ""}</li>
                  ))}
                </ol>
              </section>
            )}
            <div style={{ marginTop: "2.5rem" }}><Disclaimer /></div>
          </div>
          <aside className="article-aside">
            <div className="editorial-box">
              <h2>О материале</h2>
              <dl>
                <dt>Автор</dt><dd>{a.author ?? "Редакция INSIDA"}</dd>
                <dt>Обновлено</dt><dd>{formatDate(a.contentUpdatedAt ?? a.updatedAt)}</dd>
                <dt>Проверка</dt><dd>{REVIEW[a.reviewStatus]}{a.reviewedBy ? `, ${a.reviewedBy}` : ""}{a.reviewedAt ? `, ${formatDate(a.reviewedAt)}` : ""}</dd>
                <dt>Источников</dt><dd>{a.sources.length || "не указаны"}</dd>
              </dl>
            </div>
            {a.tags.length > 0 && (
              <div>
                <h2>Теги</h2>
                <div className="cluster">{a.tags.map((t) => <Link key={t.id} className="chip" href={`/library?tag=${t.slug}`}>#{t.title}</Link>)}</div>
              </div>
            )}
          </aside>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section section--surface" aria-labelledby="rel-h">
          <div className="container">
            <div className="section-head"><h2 id="rel-h">Читать дальше</h2></div>
            <div className="grid grid--3">{related.map((r) => <ArticleCardView key={r.id} a={r} />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}
