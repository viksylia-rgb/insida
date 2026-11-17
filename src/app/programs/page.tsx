import type { Metadata } from "next";
import { content } from "@/lib/content";
import { SimpleCard } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Программы самостоятельного изучения", description: "Темы, разложенные по модулям, урокам и заданиям, с сохранением прогресса на вашем устройстве.", alternates: { canonical: "/programs/" } };

export default function Programs() {
  const items = content().programs;
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Программы" }]} />
        <p className="eyebrow">Программы</p>
        <h1>Изучать тему <em className="display-italic">шаг за шагом</em></h1>
        <p className="lead">Уроки, упражнения и задания для самостоятельного изучения. Прогресс сохраняется у вас в браузере — можно продолжить с того места, где остановились.</p>
        <p className="notice" style={{ marginTop: "1.5rem", maxWidth: "70ch" }}>Программы — информационные материалы для самостоятельной работы. Они не являются образовательной программой, не предполагают аттестации и не дают документов об образовании или квалификации.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        {items.length ? (
          <div className="grid grid--2">
            {items.map((p) => <SimpleCard key={p.slug} href={`/programs/${p.slug}`} title={p.title} excerpt={p.excerpt} meta={[p.topicTitle ?? "Программа", `${p.lessons.length} ${plural(p.lessons.length, ["урок", "урока", "уроков"])}`]} isDemo={p.demo} seed={p.slug} cover={p.cover} cta="Открыть" />)}
          </div>
        ) : <div className="empty">Программы появятся позже.</div>}
      </section>
    </>
  );
}
