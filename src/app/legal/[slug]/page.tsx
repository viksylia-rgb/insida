import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPage, getSettings } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalTemplateNote } from "@/components/Notices";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPage(`legal/${(await params).slug}`);
  return p ? { title: p.title, alternates: { canonical: `/legal/${(await params).slug}` } } : { title: "Документ не найден" };
}

export default async function LegalPage({ params }: P) {
  const { slug } = await params;
  const p = await getPage(`legal/${slug}`);
  if (!p) notFound();
  const s = slug === "seller" ? await getSettings() : null;
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Документы" }, { label: p.title }]} />
        <h1 style={{ fontSize: "var(--fs-h2)" }}>{p.title}</h1>
        <p className="caption">Редакция от {formatDate(p.updatedAt)}</p>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        {p.needsLegalReview && <div style={{ marginBottom: "2rem" }}><LegalTemplateNote /></div>}
        {s && (s.sellerInfo ? <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.sellerInfo) }} /> : <p className="notice notice--warn">Реквизиты продавца ещё не заполнены (админ-панель → «Настройки сайта»). До заполнения продажи не ведутся.</p>)}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      </section>
    </>
  );
}
