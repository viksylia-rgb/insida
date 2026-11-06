"use client";
import { setLessonDone } from "@/lib/local-store";
import { useLocalData } from "@/components/useLocalData";

export function LessonDone({ program, lessonId }: { program: { slug: string; title: string; total: number }; lessonId: string }) {
  const { data, update, ready } = useLocalData();
  const done = ready && (data.lessonProgress[program.slug]?.done ?? []).includes(lessonId);
  return (
    <button className={done ? "btn btn--secondary" : "btn btn--primary"} aria-pressed={done} disabled={!ready} title="Отметка хранится только на этом устройстве"
      onClick={() => update((d) => setLessonDone(d, program, lessonId, !done))}>
      {done ? "✓ Урок пройден" : "Отметить как пройденный"}
    </button>
  );
}
