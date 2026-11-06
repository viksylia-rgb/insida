"use client";
import Link from "next/link";
import { useLocalData } from "@/components/useLocalData";

type L = { id: string; slug: string; title: string };

/** Прогресс программы хранится только в браузере читателя. */
export function ProgramActions({ programSlug, lessons }: { programSlug: string; lessons: L[] }) {
  const { data, ready } = useLocalData();
  const done = new Set(ready ? data.lessonProgress[programSlug]?.done ?? [] : []);
  const count = lessons.filter((l) => done.has(l.id)).length;
  const total = lessons.length;
  const nextLesson = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const pct = total ? Math.round((count / total) * 100) : 0;
  if (!total) return null;
  return (
    <div style={{ margin: "1.5rem 0" }}>
      {count > 0 && (
        <>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс программы"><span style={{ width: `${pct}%` }} /></div>
          <p className="caption">Пройдено {count} из {total} · прогресс хранится на этом устройстве</p>
        </>
      )}
      <Link className="btn btn--primary" href={`/programs/${programSlug}/${nextLesson.slug}`}>
        {count === 0 ? "Начать" : count === total ? "Повторить" : "Продолжить"}
      </Link>
    </div>
  );
}

export function LessonMark({ programSlug, lessonId }: { programSlug: string; lessonId: string }) {
  const { data, ready } = useLocalData();
  const done = ready && (data.lessonProgress[programSlug]?.done ?? []).includes(lessonId);
  return (
    <span className={`lesson-link__mark ${done ? "is-done" : ""}`} aria-hidden={!done}>
      {done ? <>✓<span className="sr-only"> пройден</span></> : ""}
    </span>
  );
}
