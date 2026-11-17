import type { Metadata } from "next";
import { Suspense } from "react";
import { content, searchDocuments } from "@/lib/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchBox } from "./SearchBox";

export const metadata: Metadata = { title: "Поиск", robots: { index: false }, alternates: { canonical: "/search/" } };

export default function SearchPage() {
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Поиск" }]} />
        <h1>Поиск</h1>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        <Suspense fallback={<p className="muted">Загружаю поиск…</p>}>
          <SearchBox docs={searchDocuments()} topics={content().topics.map((t) => ({ slug: t.slug, title: t.title }))} />
        </Suspense>
      </section>
    </>
  );
}
