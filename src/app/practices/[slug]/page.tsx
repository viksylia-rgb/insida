import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { KIND_LABELS, minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CrisisNote, DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PracticeForm } from "./PracticeForm";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().practices.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = content().practices.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/practices/${p.slug}/` } } : { title: "Практика не найдена" };
}

export default async function PracticePage({ params }: P) {
  const { slug } = await params;
  const c = content();
  const p = c.practices.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/practices", label: "Практики" }, { label: p.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">{KIND_LABELS[p.kind]} · {minutes(p.duration)}</span><DemoBadge show={p.demo} /></div>
        <h1>{p.title}</h1>
        {p.excerpt && <p className="lead">{p.excerpt}</p>}
        <FavoriteButton type="practice" id={p.slug} title={p.title} url={`/practices/${p.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.sensitive && <div style={{ marginBottom: "2rem" }}><CrisisNote text={c.settings.crisisText} /></div>}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        {p.fields.length > 0 && <PracticeForm practice={{ id: p.slug, slug: p.slug, title: p.title }} fields={p.fields} />}
        <div style={{ marginTop: "2.5rem" }}><Disclaimer /></div>
      </section>
    </>
  );
}
