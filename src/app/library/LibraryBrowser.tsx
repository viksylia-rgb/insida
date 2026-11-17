"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ArticleCard } from "@/lib/content";
import { ArticleCardView } from "@/components/Cards";
import { search } from "@/lib/search";

type Item = ArticleCard & { text: string };
const KINDS = [["", "Все форматы"], ["article", "Статьи"], ["term", "Термины"], ["collection", "Подборки"]] as const;
const PER_PAGE = 12;

/** Фильтры и поиск по библиотеке работают в браузере; состояние хранится в адресе страницы. */
export function LibraryBrowser({ items, topics, tags }: { items: Item[]; topics: { slug: string; title: string }[]; tags: string[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const kind = sp.get("kind") ?? "";
  const topic = sp.get("topic") ?? "";
  const tag = sp.get("tag") ?? "";
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [draft, setDraft] = useState(q);

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries({ page: "", ...patch })) v ? p.set(k, v) : p.delete(k);
    const s = p.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  };

  const filtered = useMemo(() => {
    let list = items.filter((a) => (!kind || a.kind === kind) && (!topic || a.topic === topic) && (!tag || a.tags.includes(tag)));
    if (q.trim()) {
      const hits = search(list.map((a) => ({ type: "article", url: a.slug, title: a.title, excerpt: a.excerpt, text: a.text, tags: a.tags })), q, 500);
      const order = new Map(hits.map((h, i) => [h.url, i]));
      list = list.filter((a) => order.has(a.slug)).sort((x, y) => order.get(x.slug)! - order.get(y.slug)!);
    }
    return list;
  }, [items, kind, topic, tag, q]);

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="filters">
        <form className="search-box" role="search" onSubmit={(e) => { e.preventDefault(); router.replace(href({ q: draft.trim() })); }}>
          <label htmlFor="lib-q" className="sr-only">Поиск по библиотеке</label>
          <input id="lib-q" className="input" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Например: тревога, границы, выгорание" />
          <button className="btn btn--primary" type="submit">Найти</button>
        </form>
        <div className="filters__row" role="group" aria-label="Формат">
          <span className="filters__label">Формат</span>
          {KINDS.map(([v, l]) => <Link key={v} href={href({ kind: v })} className="chip" aria-current={kind === v ? "true" : undefined} scroll={false}>{l}</Link>)}
        </div>
        <div className="filters__row" role="group" aria-label="Тема">
          <span className="filters__label">Тема</span>
          <Link href={href({ topic: "" })} className="chip" aria-current={!topic ? "true" : undefined} scroll={false}>Все темы</Link>
          {topics.map((t) => <Link key={t.slug} href={href({ topic: t.slug })} className="chip" aria-current={topic === t.slug ? "true" : undefined} scroll={false}>{t.title}</Link>)}
        </div>
        {tags.length > 0 && (
          <div className="filters__row" role="group" aria-label="Теги">
            <span className="filters__label">Теги</span>
            {tags.map((t) => <Link key={t} href={href({ tag: tag === t ? "" : t })} className="chip" aria-current={tag === t ? "true" : undefined} scroll={false}>#{t}</Link>)}
          </div>
        )}
      </div>
      <p className="caption" aria-live="polite">Найдено материалов: {filtered.length}{q ? ` по запросу «${q}»` : ""}</p>
      {shown.length ? (
        <div className="grid grid--3" style={{ marginTop: "1rem" }}>{shown.map((a) => <ArticleCardView key={a.slug} a={a} />)}</div>
      ) : (
        <div className="empty">Ничего не нашлось. Попробуйте другое слово или <Link href="/library">сбросьте фильтры</Link>.</div>
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Страницы">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => <Link key={p} href={href({ page: String(p) })} className="chip" aria-current={p === page ? "true" : undefined}>{p}</Link>)}
        </nav>
      )}
    </>
  );
}
