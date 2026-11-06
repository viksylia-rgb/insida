import type { Metadata } from "next";
import { getPage, getSettings } from "@/server/services/content";
import { renderMarkdown } from "@/lib/markdown";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Visual } from "@/components/Visual";
import { Disclaimer } from "@/components/Notices";

export const metadata: Metadata = { title: "Об INSIDA", description: "Миссия проекта, основатель и принципы работы редакции INSIDA.", alternates: { canonical: "/about" } };
export const revalidate = 300;

export default async function About() {
  const [s, page] = await Promise.all([getSettings(), getPage("about")]);
  const needsName = s.founderName.startsWith("[");
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Об INSIDA" }]} />
        <p className="eyebrow">Об INSIDA</p>
        <h1>{page?.title ?? "Психология без громких обещаний"}</h1>
      </header>
      <section className="container section--tight">
        <div className="about-band" style={{ alignItems: "start" }}>
          <div>
            <Visual src={s.founderPhoto} alt={s.founderPhotoAlt} seed="founder-portrait" ratio="4 / 5" priority label={s.founderPhoto ? false : "Место для фото — загрузите в админ-панели"} />
          </div>
          <div>
            <p className="eyebrow">{s.founderRole}</p>
            <h2>{s.founderName}</h2>
            {needsName && <p className="notice notice--warn">Имя, история и фото основателя заполняются в админ-панели → «Настройки сайта». Мы не публикуем вымышленную биографию.</p>}
            {s.founderStory ? <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.founderStory) }} /> : <p className="muted">История основателя появится здесь.</p>}
            <div className="editorial-box" style={{ marginTop: "2rem" }}>
              <h3 className="eyebrow" style={{ margin: 0 }}>Образование</h3>
              <p style={{ margin: 0 }}>{s.education}</p>
            </div>
            {s.socialLinks.length > 0 && <div className="cluster" style={{ marginTop: "1.5rem" }}>{s.socialLinks.map((l) => <a key={l.url} className="chip" href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>)}</div>}
          </div>
        </div>
      </section>
      <section className="section container container--narrow">
        {s.mission && <><p className="eyebrow">Миссия</p><div className="prose" style={{ marginBottom: "3rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(s.mission) }} /></>}
        {page && <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />}
        <div style={{ marginTop: "3rem" }}><Disclaimer /></div>
      </section>
    </>
  );
}
