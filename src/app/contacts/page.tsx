import type { Metadata } from "next";
import { getPage, getSettings } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Контакты", alternates: { canonical: "/contacts" } };
export const revalidate = 300;

export default async function Contacts() {
  const [s, page] = await Promise.all([getSettings(), getPage("contacts")]);
  return (
    <>
      <header className="page-head container container--narrow">
        <Breadcrumbs items={[{ label: "Контакты" }]} />
        <h1>Контакты</h1>
        <p className="lead">На сайте нет форм обратной связи — мы не собираем ваши данные. Написать можно напрямую:</p>
      </header>
      <section className="container container--narrow" style={{ paddingBottom: "5rem" }}>
        <ul className="list-plain">
          {s.socialLinks.map((l) => <li key={l.url}><span>{l.title}</span><a href={l.url} target="_blank" rel="noopener noreferrer">{l.url.replace(/^https:\/\//, "")}</a></li>)}
          {s.contactEmail && <li><span>E-mail</span><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></li>}
        </ul>
        {page && <div className="prose" style={{ marginTop: "2rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />}
        <p className="notice" style={{ marginTop: "2rem" }}>INSIDA не оказывает психологическую или медицинскую помощь онлайн. Если вам нужна срочная помощь, звоните 112.</p>
      </section>
    </>
  );
}
