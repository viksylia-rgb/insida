import Link from "next/link";
import type { ArticleCard } from "@/server/services/content";
import { Visual } from "./Visual";
import { DemoBadge } from "./Notices";
import { KIND_LABELS, minutes } from "@/lib/format";

export function ArticleCardView({ a, withImage = true, priority }: { a: ArticleCard; withImage?: boolean; priority?: boolean }) {
  return (
    <article className={`card ${withImage ? "card--media" : ""}`}>
      {withImage && <Visual src={a.coverImage} alt={a.coverAlt ?? ""} seed={a.slug} priority={priority} label={a.coverImage ? false : undefined} />}
      <div className="card__body">
        <div className="card__meta">
          <span>{KIND_LABELS[a.kind]}</span>
          {a.topicTitle && <span>· {a.topicTitle}</span>}
          <span>· {minutes(a.readingMinutes)}</span>
        </div>
        <h3 className="card__title"><Link href={`/library/${a.slug}`}>{a.title}</Link></h3>
        {a.excerpt && <p className="card__excerpt">{a.excerpt}</p>}
        {a.isDemo && <div className="card__foot"><DemoBadge /></div>}
      </div>
    </article>
  );
}

export function SimpleCard({ href, title, excerpt, meta, isDemo, cover, seed, cta }: {
  href: string; title: string; excerpt?: string | null; meta?: string[]; isDemo?: boolean; cover?: string | null; seed?: string; cta?: string;
}) {
  return (
    <article className={`card ${seed ? "card--media" : ""}`}>
      {seed && <Visual src={cover} seed={seed} ratio="16 / 10" label={cover ? false : undefined} />}
      <div className="card__body">
        {meta && meta.length > 0 && <div className="card__meta">{meta.filter(Boolean).map((m, i) => <span key={i}>{i ? "· " : ""}{m}</span>)}</div>}
        <h3 className="card__title"><Link href={href}>{title}</Link></h3>
        {excerpt && <p className="card__excerpt">{excerpt}</p>}
        <div className="card__foot">{isDemo ? <DemoBadge /> : <span />}{cta && <span className="link-arrow" aria-hidden="true">{cta}</span>}</div>
      </div>
    </article>
  );
}
