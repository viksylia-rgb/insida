import type { Metadata } from "next";
import { listFaq } from "@/server/services/content";
import { renderMarkdown, markdownToPlain } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Вопросы и ответы", alternates: { canonical: "/faq" } };
export const revalidate = 300;

export default async function Faq() {
  const items = await listFaq();
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: markdownToPlain(i.answer) } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Вопросы и ответы" }]} />
        <h1>Вопросы и ответы</h1>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {items.map((i) => (
          <details key={i.id} className="faq">
            <summary>{i.question}</summary>
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(i.answer) }} />
          </details>
        ))}
      </section>
    </>
  );
}
