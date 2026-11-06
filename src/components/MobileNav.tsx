"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconClose, IconMenu } from "./Icons";
import { NAV } from "./nav";

export function MobileNav({ accountHref, accountLabel }: { accountHref: string; accountLabel: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" className="icon-btn menu-toggle" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Закрыть меню" : "Открыть меню"} onClick={() => setOpen(!open)}>
        {open ? <IconClose /> : <IconMenu />}
      </button>
      <nav id="mobile-nav" className="mobile-nav" data-open={open} aria-label="Мобильное меню" hidden={!open}>
        {NAV.map((n) => (<Link key={n.href} href={n.href}>{n.label}</Link>))}
        <Link href="/search">Поиск</Link>
        <Link href={accountHref}>{accountLabel}</Link>
      </nav>
    </>
  );
}
