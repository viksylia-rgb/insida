import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgramFull } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes, plural } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LessonMark, ProgramActions } from "./ProgramProgress";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProgramFull((await params).slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.excerpt, alternates: { canonical: `/programs/${p.slug}` } } : { title: "Программа не найдена" };
}

export default async function ProgramPage({ params }: P) {
  const p = await getProgramFull((await params).slug);
  if (!p) notFound();
  const total = p.flatLessons.length;
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/programs", label: "Программы" }, { label: p.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">{total} {plural(total, ["урок", "урока", "уроков"])}</span><DemoBadge show={p.isDemo} /></div>
        <h1>{p.title}</h1>
        {p.excerpt && <p className="lead">{p.excerpt}</p>}
        <ProgramActions programSlug={p.slug} lessons={p.flatLessons.map((l) => ({ id: l.id, slug: l.slug, title: l.title }))} />
        <FavoriteButton type="program" id={p.id} title={p.title} url={`/programs/${p.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.description && <div className="prose" style={{ marginBottom: "3rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description) }} />}
        {p.modules.map((m) => (
          <div key={m.id} className="module">
            <div>
              <p className="caption" style={{ margin: 0 }}>Модуль {m.position}</p>
              <h2 style={{ fontSize: "1.75rem" }}>{m.title}</h2>
              {m.description && <p className="muted small">{m.description}</p>}
            </div>
            <ol className="lesson-list">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link className="lesson-link" href={`/programs/${p.slug}/${l.slug}`}>
                    <LessonMark programSlug={p.slug} lessonId={l.id} />
                    <span>{l.title}</span>
                    <span className="lesson-link__time">{minutes(l.durationMinutes)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <Disclaimer />
      </section>
    </>
  );
}
