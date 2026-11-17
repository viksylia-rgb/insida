import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { LessonDone } from "./LessonDone";

type P = { params: Promise<{ slug: string; lesson: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().programs.flatMap((p) => p.lessons.map((l) => ({ slug: p.slug, lesson: l.slug })));
}

function find(slug: string, lesson: string) {
  const p = content().programs.find((x) => x.slug === slug);
  const l = p?.lessons.find((x) => x.slug === lesson);
  return p && l ? { p, l } : null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, lesson } = await params;
  const r = find(slug, lesson);
  return r ? { title: `${r.l.title} · ${r.p.title}`, alternates: { canonical: `/programs/${slug}/${lesson}/` } } : { title: "Урок не найден" };
}

export default async function LessonPage({ params }: P) {
  const { slug, lesson } = await params;
  const r = find(slug, lesson);
  if (!r) notFound();
  const { p, l } = r;
  const practice = l.practice ? content().practices.find((x) => x.slug === l.practice) : undefined;
  const idx = p.lessons.findIndex((x) => x.slug === l.slug);
  const prev = p.lessons[idx - 1];
  const next = p.lessons[idx + 1];
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/programs", label: "Программы" }, { href: `/programs/${p.slug}`, label: p.title }, { label: l.title }]} />
        <p className="eyebrow">Урок {idx + 1} из {p.lessons.length} · {minutes(l.duration)}</p>
        <h1>{l.title}</h1>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(l.body) }} />
        {l.assignment && (
          <div className="form-card" style={{ marginTop: "2.5rem" }}>
            <p className="eyebrow">Задание</p>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(l.assignment) }} />
            {practice && <Link className="link-arrow" href={`/practices/${practice.slug}`}>Практика: {practice.title}</Link>}
          </div>
        )}
        <div className="toolbar" style={{ marginTop: "2.5rem", justifyContent: "space-between" }}>
          <LessonDone program={{ slug: p.slug, title: p.title, total: p.lessons.length }} lessonId={l.slug} />
          <div className="cluster">
            {prev && <Link className="btn btn--ghost" href={`/programs/${p.slug}/${prev.slug}`}>← {prev.title}</Link>}
            {next ? <Link className="btn btn--secondary" href={`/programs/${p.slug}/${next.slug}`}>Следующий урок →</Link> : <Link className="btn btn--secondary" href={`/programs/${p.slug}`}>К программе</Link>}
          </div>
        </div>
        <div style={{ marginTop: "3rem" }}><Disclaimer /></div>
      </section>
    </>
  );
}
