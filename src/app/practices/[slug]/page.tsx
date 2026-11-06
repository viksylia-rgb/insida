import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPractice, getSettings } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { KIND_LABELS, minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CrisisNote, DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PracticeForm } from "./PracticeForm";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPractice((await params).slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.excerpt, alternates: { canonical: `/practices/${p.slug}` } } : { title: "Практика не найдена" };
}

export default async function PracticePage({ params }: P) {
  const p = await getPractice((await params).slug);
  if (!p) notFound();
  const settings = await getSettings();
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/practices", label: "Практики" }, { label: p.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">{KIND_LABELS[p.kind]} · {minutes(p.durationMinutes)}</span><DemoBadge show={p.isDemo} /></div>
        <h1>{p.title}</h1>
        {p.excerpt && <p className="lead">{p.excerpt}</p>}
        <FavoriteButton type="practice" id={p.id} title={p.title} url={`/practices/${p.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.sensitive && <div style={{ marginBottom: "2rem" }}><CrisisNote text={settings.crisisText} /></div>}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        {p.fields.length > 0 && <PracticeForm practice={{ id: p.id, slug: p.slug, title: p.title }} fields={p.fields} />}
        <div style={{ marginTop: "2.5rem" }}><Disclaimer /></div>
      </section>
    </>
  );
}
