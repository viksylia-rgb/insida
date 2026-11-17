import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content, relatedArticles, toCard } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, KIND_LABELS, minutes } from "@/lib/format";
import { SITE_URL, asset } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { CrisisNote, DemoBadge, Disclaimer } from "@/components/Notices";
import { ArticleCardView } from "@/components/Cards";
import { FavoriteButton } from "@/components/FavoriteButton";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const a = content().articles.find((x) => x.slug === slug);
  if (!a) return { title: "Материал не найден" };
  return {
    title: a.seoTitle ?? a.title,
    description: a.seoDescription ?? a.excerpt,
    alternates: { canonical: `/library/${a.slug}/` },
    openGraph: { type: "article", title: a.seoTitle ?? a.title, description: a.seoDescription ?? a.excerpt, images: a.cover ? asset(a.cover) : undefined, publishedTime: a.date?.toISOString(), modifiedTime: a.updated?.toISOString() },
  };
}

const REVIEW = { not_reviewed: "Не проверено", in_review: "На проверке", reviewed: "Проверено редактором" } as const;

export default async function ArticlePage({ params }: P) {
  const { slug } = await params;
  const a = content().articles.find((x) => x.slug === slug);
  if (!a) notFound();
  const { settings } = content();
  const related = relatedArticles(a).map(toCard);
  const updated = a.updated ?? a.date;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": a.kind === "term" ? "DefinedTerm" : "Article",
    headline: a.title,
    name: a.title,
    description: a.excerpt,
    datePublished: a.date?.toISOString(),
    dateModified: updated?.toISOString(),
    author: a.author ? { "@type": "Person", name: a.author } : undefined,
    publisher: { "@type": "Organization", name: "INSIDA" },
    inLanguage: "ru",
    mainEntityOfPage: `${SITE_URL}/library/${a.slug}/`,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="container article-head">
        <Breadcrumbs items={[{ href: "/library", label: "Библиотека" }, ...(a.topic ? [{ href: `/topics/${a.topic}`, label: a.topicTitle ?? a.topic }] : []), { label: a.title }]} />
        <div className="cluster"><span className="badge">{KIND_LABELS[a.kind]}</span><DemoBadge show={a.demo} /></div>
        <h1>{a.title}</h1>
        {a.excerpt && <p className="lead" style={{ maxWidth: "60ch" }}>{a.excerpt}</p>}
        <div className="article-meta">
          {a.author && <span>Автор: {a.author}</span>}
          {updated && <span>Обновлено: {formatDate(updated)}</span>}
          <span>{minutes(a.readingMinutes)} чтения</span>
          <FavoriteButton type="article" id={a.slug} title={a.title} url={`/library/${a.slug}`} />
        </div>
      </header>
      {a.kind !== "term" && (
        <div className="container" style={{ marginTop: "2rem" }}>
          <Visual src={a.cover} alt={a.coverAlt ?? ""} seed={a.slug} ratio="21 / 9" priority sizes="100vw" label={a.cover ? false : undefined} />
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
                <ol>{a.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}</a> : s.title}{s.note ? ` — ${s.note}` : ""}</li>)}</ol>
              </section>
            )}
            <div style={{ marginTop: "2.5rem" }}><Disclaimer /></div>
          </div>
          <aside className="article-aside">
            <div className="editorial-box">
              <h2>О материале</h2>
              <dl>
                <dt>Автор</dt><dd>{a.author ?? "Редакция INSIDA"}</dd>
                {updated && <><dt>Обновлено</dt><dd>{formatDate(updated)}</dd></>}
                <dt>Проверка</dt><dd>{REVIEW[a.review]}{a.reviewedBy ? `, ${a.reviewedBy}` : ""}</dd>
                <dt>Источников</dt><dd>{a.sources.length || "не указаны"}</dd>
              </dl>
            </div>
            {a.tags.length > 0 && (
              <div><h2>Теги</h2><div className="cluster">{a.tags.map((t) => <Link key={t} className="chip" href={`/library?tag=${encodeURIComponent(t)}`}>#{t}</Link>)}</div></div>
            )}
          </aside>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section section--surface" aria-labelledby="rel-h">
          <div className="container">
            <div className="section-head"><h2 id="rel-h">Читать дальше</h2></div>
            <div className="grid grid--3">{related.map((r) => <ArticleCardView key={r.slug} a={r} />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}
