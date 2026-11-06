import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Навигационная цепочка">
      <Link href="/">Главная</Link>
      {items.map((it, i) => (
        <Fragment key={i}>
          <span aria-hidden="true">/</span>
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
