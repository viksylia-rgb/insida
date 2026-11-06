import Link from "next/link";
import type { Metadata } from "next";
import { listArticles, listTags, listTopics } from "@/server/services/content";
import { ArticleCardView } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Библиотека",
  description: "Статьи о психологии простым языком, объяснения терминов и тематические подборки с источниками.",
  alternates: { canonical: "/library" },
};

type SP = { q?: string; topic?: string; tag?: string; kind?: string; page?: string };
const KINDS = [
  { v: "", l: "Все форматы" },
  { v: "article", l: "Статьи" },
  { v: "term", l: "Термины" },
  { v: "collection", l: "Подборки" },
];
const PER_PAGE = 12;

function qs(base: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return `/library${s ? `?${s}` : ""}`;
}

export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const kind = (["article", "term", "collection"] as const).find((k) => k === sp.kind);
  const [topics, tags, { items, total }] = await Promise.all([
    listTopics(),
    listTags(),
    listArticles({ q: sp.q, topic: sp.topic, tag: sp.tag, kind, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const base: SP = { q: sp.q, topic: sp.topic, tag: sp.tag, kind: sp.kind };
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Библиотека" }]} />
        <p className="eyebrow">Библиотека</p>
        <h1>Знания, которые <em className="display-italic">помогают понимать</em></h1>
        <p className="lead">Статьи, объяснения терминов и подборки. Каждый материал — с источниками, датой обновления и отметкой о редакторской проверке.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        <div className="filters">
          <form className="search-box" action="/library" role="search">
            {sp.topic && <input type="hidden" name="topic" value={sp.topic} />}
            {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
            <label htmlFor="lib-q" className="sr-only">Поиск по библиотеке</label>
            <input id="lib-q" className="input" type="search" name="q" defaultValue={sp.q} placeholder="Например: тревога, границы, выгорание" />
            <button className="btn btn--primary" type="submit">Найти</button>
          </form>
          <div className="filters__row" role="group" aria-label="Формат">
            <span className="filters__label">Формат</span>
            {KINDS.map((k) => (
              <Link key={k.v} href={qs(base, { kind: k.v, page: "" })} className="chip" aria-current={(sp.kind ?? "") === k.v ? "true" : undefined}>{k.l}</Link>
            ))}
          </div>
          <div className="filters__row" role="group" aria-label="Тема">
            <span className="filters__label">Тема</span>
            <Link href={qs(base, { topic: "", page: "" })} className="chip" aria-current={!sp.topic ? "true" : undefined}>Все темы</Link>
            {topics.map((t) => (
              <Link key={t.id} href={qs(base, { topic: t.slug, page: "" })} className="chip" aria-current={sp.topic === t.slug ? "true" : undefined}>{t.title}</Link>
            ))}
          </div>
          {tags.length > 0 && (
            <div className="filters__row" role="group" aria-label="Теги">
              <span className="filters__label">Теги</span>
              {tags.map((t) => (
                <Link key={t.id} href={qs(base, { tag: sp.tag === t.slug ? "" : t.slug, page: "" })} className="chip" aria-current={sp.tag === t.slug ? "true" : undefined}>#{t.title}</Link>
              ))}
            </div>
          )}
        </div>
        <p className="caption" aria-live="polite">Найдено материалов: {total}{sp.q ? ` по запросу «${sp.q}»` : ""}</p>
        {items.length ? (
          <div className="grid grid--3" style={{ marginTop: "1rem" }}>
            {items.map((a) => <ArticleCardView key={a.id} a={a} />)}
          </div>
        ) : (
          <div className="empty">Ничего не нашлось. Попробуйте другое слово или <Link href="/library">сбросьте фильтры</Link>.</div>
        )}
        {pages > 1 && (
          <nav className="pagination" aria-label="Страницы">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={qs(base, { page: String(p) })} className="chip" aria-current={p === page ? "true" : undefined}>{p}</Link>
            ))}
          </nav>
        )}
      </section>
    </>
  );
}
