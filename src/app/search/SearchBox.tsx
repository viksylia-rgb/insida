"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { search, type SearchDoc } from "@/lib/search";

const TYPE: Record<string, string> = { article: "Материал", test: "Тест", practice: "Практика", program: "Программа", book: "Книга", guide: "Гайд" };

export function SearchBox({ docs, topics }: { docs: SearchDoc[]; topics: { slug: string; title: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = sp.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const hits = useMemo(() => (q ? search(docs, q) : []), [docs, q]);
  return (
    <>
      <form className="search-box" role="search" onSubmit={(e) => { e.preventDefault(); router.replace(`${pathname}?q=${encodeURIComponent(draft.trim())}`); }}>
        <label htmlFor="q" className="sr-only">Что ищем?</label>
        <input id="q" className="input" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Слово или фраза" autoFocus />
        <button className="btn btn--primary" type="submit">Найти</button>
      </form>
      <p className="caption" style={{ marginTop: "0.75rem" }}>Поиск понимает разные формы слов: «тревога» найдёт и «тревожность», и «тревоги».</p>
      {q && <p className="caption" aria-live="polite">Результатов: {hits.length}</p>}
      {q && hits.length === 0 && (
        <div className="empty">
          <p>По запросу «{q}» ничего не нашлось.</p>
          <div className="cluster" style={{ justifyContent: "center" }}>{topics.slice(0, 6).map((t) => <Link key={t.slug} href={`/topics/${t.slug}`} className="chip">{t.title}</Link>)}</div>
        </div>
      )}
      <ul className="list-plain">
        {hits.map((h) => (
          <li key={h.url} style={{ display: "block" }}>
            <p className="caption" style={{ margin: 0 }}>{TYPE[h.type] ?? "Материал"}</p>
            <h2 style={{ fontSize: "1.6rem", margin: "0.2rem 0" }}><Link href={h.url} style={{ color: "var(--text)" }}>{h.title}</Link></h2>
            {h.excerpt && <p className="muted small" style={{ margin: 0 }}>{h.excerpt}</p>}
          </li>
        ))}
      </ul>
      {!q && <div style={{ marginTop: "2rem" }}><p className="eyebrow">Популярные темы</p><div className="cluster">{topics.map((t) => <Link key={t.slug} href={`/topics/${t.slug}`} className="chip">{t.title}</Link>)}</div></div>}
    </>
  );
}
