import Link from "next/link";
import { requireAdmin } from "@/server/auth/current";
import { adminDashboard } from "@/server/services/admin";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Сводка" };

export default async function Dashboard() {
  const d = await adminDashboard(await requireAdmin());
  const stats: [string, string, { all: number; pub: number }][] = [
    ["Статьи", "/admin/articles", d.articles], ["Тесты", "/admin/tests", d.tests], ["Практики", "/admin/practices", d.practices],
    ["Программы", "/admin/programs", d.programs], ["Книги", "/admin/books", d.books], ["Гайды", "/admin/guides", d.products],
  ];
  return (
    <>
      <h1>Сводка</h1>
      <div className="stat-grid">
        {stats.map(([l, h, s]) => (
          <Link key={h} href={h} className="panel" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="stat__n">{s.pub}</span><span className="small">{l}: опубликовано из {s.all}</span>
          </Link>
        ))}
        <div className="panel"><span className="stat__n">{(d.mediaBytes / 1024 / 1024).toFixed(1)}</span><span className="small">МБ файлов в базе</span></div>
      </div>
      <div className="grid grid--2" style={{ marginTop: "2rem" }}>
        <section className="panel">
          <h2>Как устроен сайт</h2>
          <ul className="small" style={{ margin: 0 }}>
            <li>Читатели не регистрируются. Их избранное, результаты и ответы хранятся только в их браузерах — вы их не видите, и в базе их нет.</li>
            <li>После сохранения материала сайт обновляется сразу; в остальных случаях кэш страниц обновляется раз в 5 минут.</li>
            <li>Демонстрационные материалы помечены — замените их своими или снимите с публикации до запуска.</li>
            <li>Бесплатный тариф базы ограничен по объёму (см. README): следите за размером файлов.</li>
          </ul>
        </section>
        <section className="panel">
          <h2>Последние действия</h2>
          <ul className="list-plain small">
            {d.log.map((l, i) => <li key={i}><span>{l.actor ?? "—"}: {l.action} · {l.entity}</span><span className="caption">{formatDate(l.createdAt)}</span></li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
