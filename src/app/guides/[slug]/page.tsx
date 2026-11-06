import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { formatPrice } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { DemoBadge, Disclaimer } from "@/components/Notices";
import { FavoriteButton } from "@/components/FavoriteButton";

type P = { params: Promise<{ slug: string }> };
export const revalidate = 300;
/** Пустой список: страницы создаются при первом запросе и затем кэшируются (ISR). */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.excerpt, alternates: { canonical: `/guides/${p.slug}` } } : { title: "Материал не найден" };
}

export default async function ProductPage({ params }: P) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const canBuy = p.access === "paid" && p.productStatus === "available" && p.externalBuyUrl;
  return (
    <section className="container section">
      <Breadcrumbs items={[{ href: "/guides", label: "Гайды" }, { label: p.title }]} />
      <div className="about-band" style={{ alignItems: "start" }}>
        <Visual src={p.coverImage} seed={p.slug} ratio="4 / 5" priority label={p.coverImage ? false : "Обложка · заменить"} />
        <div>
          <div className="cluster" style={{ marginBottom: "1rem" }}>
            <span className="badge">{p.format}</span>
            {p.access === "paid" && p.productStatus === "coming_soon" && <span className="badge badge--soon">Скоро</span>}
            <DemoBadge show={p.isDemo} />
          </div>
          <h1 style={{ fontSize: "var(--fs-h2)" }}>{p.title}</h1>
          <p className="lead">{p.excerpt}</p>
          {p.author && <p className="small muted">Автор: {p.author}</p>}
          {p.access === "paid" && <p className="price">{formatPrice(p.priceKopecks)}</p>}
          {p.contents.length > 0 && (<><p className="eyebrow" style={{ marginTop: "1.5rem" }}>Состав</p><ul className="product-contents">{p.contents.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
          <div className="cluster" style={{ marginTop: "2rem" }}>
            {p.access === "free" && p.fileUrl && <a className="btn btn--primary" href={p.fileUrl} download>Скачать бесплатно</a>}
            {canBuy && <a className="btn btn--primary" href={p.externalBuyUrl!} target="_blank" rel="noopener noreferrer">Купить у продавца ↗</a>}
            <FavoriteButton type="product" id={p.id} title={p.title} url={`/guides/${p.slug}`} />
          </div>
          {canBuy && <p className="caption" style={{ marginTop: "0.75rem" }}>Покупка проходит на внешней площадке. Продавец и условия — на странице <Link href="/legal/seller">«Сведения о продавце»</Link>.</p>}
          {p.access === "paid" && p.productStatus === "coming_soon" && <p className="caption" style={{ marginTop: "0.75rem" }}>Материал готовится к выпуску и пока не продаётся.</p>}
        </div>
      </div>
      {p.description && <div className="prose" style={{ marginTop: "3rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.description) }} />}
      <div style={{ marginTop: "2rem" }}><Disclaimer /></div>
    </section>
  );
}
