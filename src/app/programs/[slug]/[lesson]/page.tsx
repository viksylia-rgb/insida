import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLesson, getProgramFull } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { LessonDone } from "./LessonDone";

type P = { params: Promise<{ slug: string; lesson: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, lesson } = await params;
  const p = await getProgramFull(slug);
  const l = p ? await getLesson(p.id, lesson) : null;
  return l && p ? { title: `${l.title} · ${p.title}`, alternates: { canonical: `/programs/${slug}/${lesson}` } } : { title: "Урок не найден" };
}

export default async function LessonPage({ params }: P) {
  const { slug, lesson } = await params;
  const p = await getProgramFull(slug);
  if (!p) notFound();
  const l = await getLesson(p.id, lesson);
  if (!l) notFound();
  const idx = p.flatLessons.findIndex((x) => x.id === l.id);
  const prev = p.flatLessons[idx - 1];
  const next = p.flatLessons[idx + 1];
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/programs", label: "Программы" }, { href: `/programs/${p.slug}`, label: p.title }, { label: l.title }]} />
        <p className="eyebrow">Урок {idx + 1} из {p.flatLessons.length} · {minutes(l.durationMinutes)}</p>
        <h1>{l.title}</h1>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(l.body) }} />
        {l.assignment && (
          <div className="form-card" style={{ marginTop: "2.5rem" }}>
            <p className="eyebrow">Задание</p>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(l.assignment) }} />
            {l.practiceSlug && <Link className="link-arrow" href={`/practices/${l.practiceSlug}`}>Практика: {l.practiceTitle}</Link>}
          </div>
        )}
        <div className="toolbar" style={{ marginTop: "2.5rem", justifyContent: "space-between" }}>
          <LessonDone program={{ slug: p.slug, title: p.title, total: p.flatLessons.length }} lessonId={l.id} />
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
