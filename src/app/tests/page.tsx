import Link from "next/link";
import type { Metadata } from "next";
import { listTests, listTopics } from "@/server/services/content";
import { SimpleCard } from "@/components/Cards";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Disclaimer } from "@/components/Notices";
import { minutes } from "@/lib/format";

export const metadata: Metadata = { title: "Тесты для саморефлексии", description: "Опросники для самонаблюдения: без диагнозов и ярлыков, с бережными интерпретациями и рекомендациями.", alternates: { canonical: "/tests" } };

export default async function Tests({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const [tests, topics] = await Promise.all([listTests({ topic }), listTopics()]);
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Тесты" }]} />
        <p className="eyebrow">Тесты</p>
        <h1>Вопросы, которые <em className="display-italic">помогают заметить</em></h1>
        <p className="lead">Это не диагностика, а повод внимательнее посмотреть на свои реакции. Результаты можно сохранить в личном кабинете — только если вы этого захотите.</p>
      </header>
      <section className="container" style={{ paddingBottom: "5rem" }}>
        <div className="filters__row" style={{ marginBottom: "2rem" }}>
          <span className="filters__label">Тема</span>
          <Link href="/tests" className="chip" aria-current={!topic ? "true" : undefined}>Все</Link>
          {topics.map((t) => <Link key={t.id} href={`/tests?topic=${t.slug}`} className="chip" aria-current={topic === t.slug ? "true" : undefined}>{t.title}</Link>)}
        </div>
        {tests.length ? (
          <div className="grid grid--3">
            {tests.map((t) => (
              <SimpleCard key={t.id} href={`/tests/${t.slug}`} title={t.title} excerpt={t.excerpt} meta={[t.topicTitle ?? "Тест", `${t.questionCount} вопросов`, minutes(t.durationMinutes)]} isDemo={t.isDemo} seed={t.slug} cover={t.coverImage} cta="Пройти" />
            ))}
          </div>
        ) : <div className="empty">Тестов по этой теме пока нет.</div>}
        <div style={{ marginTop: "3rem" }}><Disclaimer kind="test" /></div>
      </section>
    </>
  );
}
