import Link from "next/link";
import type { Metadata } from "next";
import { content } from "@/lib/content";
import { SimpleCard } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { minutes, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Тесты для саморефлексии", description: "Опросники для самонаблюдения: без диагнозов и ярлыков, с бережными интерпретациями и рекомендациями.", alternates: { canonical: "/tests/" } };

export default function Tests() {
  const c = content();
  const used = c.topics.filter((t) => c.tests.some((x) => x.topic === t.slug));
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Тесты" }]} />
        <p className="eyebrow">Тесты</p>
        <h1>Вопросы, которые <em className="display-italic">помогают заметить</em></h1>
        <p className="lead">Это не диагностика, а повод внимательнее посмотреть на свои реакции. Ответы не отправляются на сервер, результат можно сохранить только у себя на устройстве.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        {used.length > 0 && (
          <div className="filters__row" style={{ marginBottom: "2rem" }}>
            <span className="filters__label">Темы</span>
            {used.map((t) => <Link key={t.slug} href={`/topics/${t.slug}`} className="chip">{t.title}</Link>)}
          </div>
        )}
        {c.tests.length ? (
          <div className="grid grid--3">
            {c.tests.map((t) => <SimpleCard key={t.slug} href={`/tests/${t.slug}`} title={t.title} excerpt={t.excerpt} meta={[t.topicTitle ?? "Тест", `${t.questions.length} ${plural(t.questions.length, ["вопрос", "вопроса", "вопросов"])}`, minutes(t.duration)]} isDemo={t.demo} seed={t.slug} cover={t.cover} cta="Пройти" />)}
          </div>
        ) : <div className="empty">Тесты скоро появятся.</div>}
        <div style={{ marginTop: "3rem" }}><Disclaimer kind="test" /></div>
      </section>
    </>
  );
}
