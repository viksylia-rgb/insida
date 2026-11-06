import Link from "next/link";
import type { Metadata } from "next";
import { listProducts } from "@/server/services/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { DemoBadge } from "@/components/Notices";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Гайды и рабочие тетради", description: "Бесплатные материалы и каталог будущих рабочих тетрадей INSIDA.", alternates: { canonical: "/guides" } };
export const revalidate = 300;

export default async function Guides() {
  const [free, paid] = await Promise.all([listProducts("free"), listProducts("paid")]);
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Гайды" }]} />
        <p className="eyebrow">Гайды и рабочие тетради</p>
        <h1>Материалы, с которыми <em className="display-italic">можно работать</em></h1>
        <p className="lead">Бесплатные гайды можно скачать сразу. Платные рабочие тетради — готовые информационные продукты для самостоятельного изучения.</p>
      </header>
      <section className="container" aria-labelledby="free-h" style={{ paddingBottom: "4rem" }}>
        <h2 id="free-h">Бесплатно</h2>
        {free.length ? <div className="grid grid--3">{free.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <div className="empty">Бесплатные гайды скоро появятся.</div>}
      </section>
      <section className="section section--surface" aria-labelledby="paid-h">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">Каталог</p><h2 id="paid-h">Рабочие тетради</h2></div></div>
          <p className="notice" style={{ marginBottom: "2rem", maxWidth: "75ch" }}>
            На самом сайте оплата не принимается. Если у материала есть кнопка «Купить», покупка проходит на внешней площадке у продавца;
            сведения о продавце — на странице <Link href="/legal/seller">«Сведения о продавце»</Link>. Материалы со статусом «Скоро» пока не продаются.
          </p>
          {paid.length ? <div className="grid grid--3">{paid.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <div className="empty">Каталог готовится.</div>}
        </div>
      </section>
    </>
  );
}

type Product = Awaited<ReturnType<typeof listProducts>>[number];
function ProductCard({ p }: { p: Product }) {
  return (
    <article className="card card--media">
      <Visual src={p.coverImage} seed={p.slug} ratio="4 / 3" label={p.coverImage ? false : "Обложка · заменить"} />
      <div className="card__body">
        <div className="card__meta"><span>{p.format}</span>{p.access === "paid" && <span>· {formatPrice(p.priceKopecks)}</span>}</div>
        <h3 className="card__title"><Link href={`/guides/${p.slug}`}>{p.title}</Link></h3>
        <p className="card__excerpt">{p.excerpt}</p>
        <div className="card__foot">
          {p.isDemo ? <DemoBadge /> : <span />}
          {p.access === "paid" && p.productStatus === "coming_soon" && <span className="badge badge--soon">Скоро</span>}
          {p.access === "free" && <span className="badge badge--ok">Бесплатно</span>}
        </div>
      </div>
    </article>
  );
}
