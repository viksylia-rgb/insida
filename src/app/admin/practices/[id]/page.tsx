import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { savePracticeAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { FieldsEditor } from "@/components/admin/FieldsEditor";
import { Area, Check, Field, MediaList, PublishPanel, SeoPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { formLookups } from "../../_data";
import type { practices } from "@/server/schema";

export const metadata = { title: "Практика" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const p = isNew ? null : ((await adminGet(actor, "practice", id)) as typeof practices.$inferSelect | null);
  if (!isNew && !p) notFound();
  const { topicOptions, images } = await formLookups();
  return (
    <>
      <h1>{isNew ? "Новая практика" : p!.title}</h1>
      <AdminForm action={savePracticeAction} initialMessage={(await searchParams).created ? "Практика создана" : undefined}>
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <MediaList id="images" items={images} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={p?.title} slug={p?.slug} prefix="/practices/" />
            <Area label="Краткое описание" name="excerpt" defaultValue={p?.excerpt} rows={2} />
            <MarkdownField name="body" label="Инструкция" defaultValue={p?.body} rows={14} />
            <FieldsEditor initial={p?.fields ?? [{ id: "q1", label: "", type: "textarea" }]} />
          </div>
          <aside>
            <PublishPanel status={p?.status} isDemo={p?.isDemo} viewUrl={p ? (p.status === "published" ? `/practices/${p.slug}` : `/admin/preview/practice/${p.id}`) : null}
              extra={<Check name="sensitive" label="Чувствительная тема" defaultChecked={p?.sensitive} />} />
            <div className="panel">
              <h2>Параметры</h2>
              <Select label="Формат" name="kind" defaultValue={p?.kind ?? "exercise"} options={[["exercise", "Упражнение"], ["journal", "Дневник"], ["reflection", "Рефлексивное задание"]]} />
              <Select label="Тема" name="topicId" defaultValue={p?.topicId} options={topicOptions} />
              <Field label="Длительность, минут" name="durationMinutes" type="number" defaultValue={p?.durationMinutes ?? 10} />
              <Field label="Обложка" name="coverImage" defaultValue={p?.coverImage} list="images" />
            </div>
            <SeoPanel seoTitle={p?.seoTitle} seoDescription={p?.seoDescription} ogImage={p?.ogImage} mediaListId="images" />
          </aside>
        </div>
      </AdminForm>
      {p && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="practice" id={p.id} /></div>}
    </>
  );
}
