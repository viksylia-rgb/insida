import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth/current";
import { adminProgramStructure, adminSimpleList } from "@/server/services/admin";
import { saveLessonAction, deleteLessonAction } from "@/server/actions/admin";
import { getDb } from "@/server/db";
import { lessons } from "@/server/schema";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { Field, Select } from "@/components/admin/Fields";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Урок" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ module?: string; created?: string }> }) {
  const actor = await requireAdmin();
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const modules = await adminProgramStructure(actor, id);
  if (!modules.length) notFound();
  const isNew = lessonId === "new";
  const [l] = isNew ? [null] : await getDb().select().from(lessons).where(eq(lessons.id, lessonId));
  if (!isNew && !l) notFound();
  const practices = await adminSimpleList(actor, "practice");
  const moduleId = l?.moduleId ?? sp.module ?? modules[0].id;
  const mod = modules.find((m) => m.id === moduleId);
  return (
    <>
      <p className="caption"><Link href={`/admin/programs/${id}`}>← К программе</Link></p>
      <h1>{isNew ? "Новый урок" : l!.title}</h1>
      <AdminForm action={saveLessonAction} initialMessage={sp.created ? "Урок создан" : undefined}>
        <input type="hidden" name="id" value={l?.id ?? ""} /><input type="hidden" name="programId" value={id} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={l?.title} slug={l?.slug} prefix="…/" />
            <MarkdownField name="body" label="Текст урока" defaultValue={l?.body} rows={18} />
            <MarkdownField name="assignment" label="Задание" defaultValue={l?.assignment} rows={6} />
          </div>
          <aside>
            <div className="panel">
              <Select label="Модуль" name="moduleId" defaultValue={moduleId} options={modules.map((m) => [m.id, m.title])} />
              <Field label="Порядок" name="position" type="number" defaultValue={l?.position ?? (mod?.lessons.length ?? 0) + 1} />
              <Field label="Длительность, минут" name="durationMinutes" type="number" defaultValue={l?.durationMinutes ?? 10} />
              <Select label="Связанная практика" name="practiceId" defaultValue={l?.practiceId} options={[["", "— нет —"], ...practices.map((p) => [p.id, p.title] as [string, string])]} />
              <button className="btn btn--primary btn--sm" type="submit">Сохранить урок</button>
            </div>
          </aside>
        </div>
      </AdminForm>
      {l && <form action={deleteLessonAction} style={{ marginTop: "2rem" }}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="programId" value={id} /><ConfirmButton>Удалить урок</ConfirmButton></form>}
    </>
  );
}
