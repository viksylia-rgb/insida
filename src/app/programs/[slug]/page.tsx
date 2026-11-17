import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { minutes, plural } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LessonMark, ProgramActions } from "./ProgramProgress";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = content().programs.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/programs/${p.slug}/` } } : { title: "Программа не найдена" };
}

export default async function ProgramPage({ params }: P) {
  const { slug } = await params;
  const p = content().programs.find((x) => x.slug === slug);
  if (!p) notFound();
  const total = p.lessons.length;
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ href: "/programs", label: "Программы" }, { label: p.title }]} />
        <div className="cluster" style={{ marginBottom: "1rem" }}><span className="badge">{total} {plural(total, ["урок", "урока", "уроков"])}</span><DemoBadge show={p.demo} /></div>
        <h1>{p.title}</h1>
        {p.excerpt && <p className="lead">{p.excerpt}</p>}
        <ProgramActions programSlug={p.slug} lessons={p.lessons.map((l) => ({ id: l.slug, slug: l.slug, title: l.title }))} />
        <FavoriteButton type="program" id={p.slug} title={p.title} url={`/programs/${p.slug}`} />
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.description && <div className="prose" style={{ marginBottom: "3rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description) }} />}
        {p.modules.map((m, mi) => (
          <div key={mi} className="module">
            <div>
              <p className="caption" style={{ margin: 0 }}>Модуль {mi + 1}</p>
              <h2 style={{ fontSize: "1.75rem" }}>{m.title}</h2>
              {m.description && <p className="muted small">{m.description}</p>}
            </div>
            <ol className="lesson-list">
              {m.lessons.map((l) => (
                <li key={l.slug}>
                  <Link className="lesson-link" href={`/programs/${p.slug}/${l.slug}`}>
                    <LessonMark programSlug={p.slug} lessonId={l.slug} />
                    <span>{l.title}</span>
                    <span className="lesson-link__time">{minutes(l.duration)}</span>
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
