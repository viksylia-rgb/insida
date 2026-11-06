import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/current";
import { logoutAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: { default: "Админ-панель", template: "%s · Админ-панель INSIDA" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: [string, [string, string][]][] = [
  ["Обзор", [["/admin", "Сводка"]]],
  ["Контент", [["/admin/articles", "Статьи и термины"], ["/admin/tests", "Тесты"], ["/admin/practices", "Практики"], ["/admin/programs", "Программы"], ["/admin/books", "Книги"], ["/admin/guides", "Гайды и продукты"]]],
  ["Структура", [["/admin/topics", "Темы и теги"], ["/admin/pages", "Страницы и документы"], ["/admin/faq", "FAQ"], ["/admin/media", "Медиафайлы"]]],
  ["Сайт", [["/admin/settings", "Настройки сайта"], ["/admin/team", "Команда и безопасность"]]],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="admin">
      <nav className="admin__side" aria-label="Разделы админ-панели">
        {NAV.map(([group, items]) => (
          <div key={group}>
            <h2>{group}</h2>
            {items.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
        <h2>{user.pseudonym}</h2>
        <Link href="/" target="_blank">Открыть сайт ↗</Link>
        <form action={logoutAction}><button className="btn btn--ghost btn--sm" type="submit" style={{ marginTop: "0.5rem" }}>Выйти</button></form>
      </nav>
      <div className="admin__main">{children}</div>
    </div>
  );
}
