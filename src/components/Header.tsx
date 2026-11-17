import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { IconSearch, IconUser } from "./Icons";

/** Шапка одинакова для всех: на сайте нет аккаунтов. */
export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <Link href="/" className="logo" aria-label="INSIDA — на главную">INSIDA<small>пространство для понимания себя</small></Link>
        <NavLinks />
        <div className="header-actions">
          <Link href="/search" className="icon-btn hide-xs" aria-label="Поиск по сайту"><IconSearch /></Link>
          <ThemeToggle />
          <Link href="/account" className="btn btn--secondary btn--sm hide-xs" title="Избранное, результаты и ответы — хранятся только на этом устройстве"><IconUser /> Мои записи</Link>
          <MobileNav accountHref="/account" accountLabel="Мои записи" />
        </div>
      </div>
    </header>
  );
}
