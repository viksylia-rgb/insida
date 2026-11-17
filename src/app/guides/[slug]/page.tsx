import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatPrice } from "@/lib/format";
import { asset } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return content().guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const g = content().guides.find((x) => x.slug === slug);
  return g ? { title: g.title, description: g.excerpt, alternates: { canonical: `/guides/${g.slug}/` } } : { title: "Материал не найден" };
}

export default async function GuidePage({ params }: P) {
  const { slug } = await params;
  const p = content().guides.find((x) => x.slug === slug);
  if (!p) notFound();
  const canBuy = p.access === "paid" && p.status === "available" && p.buyUrl;
  return (
    <section className="container section">
      <Breadcrumbs items={[{ href: "/guides", label: "Гайды" }, { label: p.title }]} />
      <div className="about-band" style={{ alignItems: "start" }}>
        <Visual src={p.cover} seed={p.slug} ratio="4 / 5" priority label={p.cover ? false : "Обложка · заменить"} />
        <div>
          <div className="cluster" style={{ marginBottom: "1rem" }}>
            <span className="badge">{p.format}</span>
            {p.access === "paid" && p.status === "coming_soon" && <span className="badge badge--soon">Скоро</span>}
            <DemoBadge show={p.demo} />
          </div>
          <h1 style={{ fontSize: "var(--fs-h2)" }}>{p.title}</h1>
          <p className="lead">{p.excerpt}</p>
          {p.author && <p className="small muted">Автор: {p.author}</p>}
          {p.access === "paid" && <p className="price">{formatPrice(p.price == null ? null : p.price * 100)}</p>}
          {p.contents.length > 0 && (<><p className="eyebrow" style={{ marginTop: "1.5rem" }}>Состав</p><ul className="product-contents">{p.contents.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
          <div className="cluster" style={{ marginTop: "2rem" }}>
            {p.access === "free" && p.file && <a className="btn btn--primary" href={asset(p.file)} download>Скачать бесплатно</a>}
            {canBuy && <a className="btn btn--primary" href={p.buyUrl!} target="_blank" rel="noopener noreferrer">Купить у продавца ↗</a>}
            <FavoriteButton type="product" id={p.slug} title={p.title} url={`/guides/${p.slug}`} />
          </div>
          {canBuy && <p className="caption" style={{ marginTop: "0.75rem" }}>Покупка проходит на внешней площадке. Продавец и условия — на странице <Link href="/legal/seller">«Сведения о продавце»</Link>.</p>}
          {p.access === "paid" && p.status === "coming_soon" && <p className="caption" style={{ marginTop: "0.75rem" }}>Материал готовится к выпуску и пока не продаётся.</p>}
        </div>
      </div>
      {p.body && <div className="prose" style={{ marginTop: "3rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />}
      <div style={{ marginTop: "2rem" }}><Disclaimer /></div>
    </section>
  );
}
