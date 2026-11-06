"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Основное меню">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}>{n.label}</Link>
      ))}
    </nav>
  );
}
