import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content, getPage } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalTemplateNote } from "@/components/Notices";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().pages.filter((p) => p.slug.startsWith("legal-")).map((p) => ({ slug: p.slug.slice(6) }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = getPage(`legal-${slug}`);
  return p ? { title: p.title, alternates: { canonical: `/legal/${slug}/` } } : { title: "Документ не найден" };
}

export default async function LegalPage({ params }: P) {
  const { slug } = await params;
  const p = getPage(`legal-${slug}`);
  if (!p) notFound();
  const seller = slug === "seller" ? content().settings.sellerInfo : null;
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Документы" }, { label: p.title }]} />
        <h1 style={{ fontSize: "var(--fs-h2)" }}>{p.title}</h1>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.legalTemplate && <div style={{ marginBottom: "2rem" }}><LegalTemplateNote /></div>}
        {seller !== null && (seller ? <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(seller) }} /> : <p className="notice notice--warn">Реквизиты продавца ещё не заполнены (редактор сайта → «Настройки сайта» → «Сведения о продавце»). До заполнения продажи не ведутся.</p>)}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      </section>
    </>
  );
}
