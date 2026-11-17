import type { Metadata } from "next";
import { Suspense } from "react";
import { content, toCard } from "@/lib/content";
import { markdownToPlain } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LibraryBrowser } from "./LibraryBrowser";

export const metadata: Metadata = {
  title: "Библиотека",
  description: "Статьи о психологии простым языком, объяснения терминов и тематические подборки с источниками.",
  alternates: { canonical: "/library/" },
};

export default function Library() {
  const c = content();
  const items = c.articles.map((a) => ({ ...toCard(a), text: markdownToPlain(a.body).slice(0, 3000) }));
  const tags = [...new Set(c.articles.flatMap((a) => a.tags))].sort((a, b) => a.localeCompare(b, "ru"));
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Библиотека" }]} />
        <p className="eyebrow">Библиотека</p>
        <h1>Знания, которые <em className="display-italic">помогают понимать</em></h1>
        <p className="lead">Статьи, объяснения терминов и подборки. Каждый материал — с источниками, датой обновления и отметкой о редакторской проверке.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        <Suspense fallback={<p className="muted">Загружаю материалы…</p>}>
          <LibraryBrowser items={items} topics={c.topics.map((t) => ({ slug: t.slug, title: t.title }))} tags={tags} />
        </Suspense>
      </section>
    </>
  );
}
