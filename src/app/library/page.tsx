import type { Metadata } from "next";
import { Suspense } from "react";
import { content, toCard } from "@/lib/content";
import { markdownToPlain } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LibraryBrowser } from "./LibraryBrowser";
import { ShareBar, StepsFlow } from "@/components/Infographics";

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
        <div className="infogrid">
          <div className="infobox">
            <p className="infobox__title">Что есть в библиотеке</p>
            <ShareBar label="Доли форматов" items={[
              { label: "Статьи", value: c.articles.filter((a) => a.kind === "article").length, tone: "pink", href: "/library?kind=article" },
              { label: "Термины", value: c.articles.filter((a) => a.kind === "term").length, tone: "beige", href: "/library?kind=term" },
              { label: "Подборки", value: c.articles.filter((a) => a.kind === "collection").length, tone: "olive", href: "/library?kind=collection" },
            ]} />
          </div>
          <div className="infobox">
            <p className="infobox__title">Как устроен каждый материал</p>
            <StepsFlow label="Из чего состоит материал" steps={[
              { title: "Источники", text: "Книги и исследования, на которые опирается текст", tone: "pink" },
              { title: "Дата", text: "Когда материал обновлялся", tone: "cream" },
              { title: "Проверка", text: "Отметка о редакторской проверке", tone: "olive" },
            ]} />
          </div>
        </div>
        <Suspense fallback={<p className="muted">Загружаю материалы…</p>}>
          <LibraryBrowser items={items} topics={c.topics.map((t) => ({ slug: t.slug, title: t.title }))} tags={tags} />
        </Suspense>
      </section>
    </>
  );
}
