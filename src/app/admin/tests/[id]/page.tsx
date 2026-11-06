import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { loadTestStructure } from "@/server/services/content";
import { saveTestAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { TestEditor, type TestStructure } from "@/components/admin/TestEditor";
import { Area, Field, MediaList, PublishPanel, SeoPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { formLookups } from "../../_data";
import type { tests } from "@/server/schema";

export const metadata = { title: "Тест" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const t = isNew ? null : ((await adminGet(actor, "test", id)) as typeof tests.$inferSelect | null);
  if (!isNew && !t) notFound();
  const { topicOptions, images } = await formLookups();
  let structure: TestStructure = {
    scales: [{ key: "main", title: "Основная шкала" }],
    questions: [{ type: "scale", text: "", options: ["Почти никогда", "Редко", "Иногда", "Часто", "Почти всегда"].map((label, i) => ({ label, scores: { main: i } })) }],
    bands: [{ scaleKey: "main", minScore: 0, maxScore: 2, title: "", description: "", recommendations: "", links: [] }, { scaleKey: "main", minScore: 3, maxScore: 4, title: "", description: "", recommendations: "", links: [] }],
  };
  if (t) {
    const st = await loadTestStructure(t.id);
    structure = {
      scales: t.scales,
      questions: st.questions.map((q) => ({ type: q.type, text: q.text, hint: q.hint, options: q.options.map((o) => ({ label: o.label, scores: o.scores, jumpToPosition: o.jumpToPosition })) })),
      bands: st.bands.map((b) => ({ scaleKey: b.scaleKey, minScore: b.minScore, maxScore: b.maxScore, title: b.title, description: b.description, recommendations: b.recommendations, links: b.links })),
    };
  }
  const sources = (t?.sources ?? []).map((s) => [s.title, s.url ?? ""].join(" | ").replace(/ \| $/, "")).join("\n");
  return (
    <>
      <h1>{isNew ? "Новый тест" : t!.title}</h1>
      <p className="notice notice--warn" style={{ maxWidth: "80ch" }}>Не выдавайте опросник за диагностику. Если используете опубликованную клиническую шкалу, сначала проверьте лицензию, точные формулировки и правила интерпретации.</p>
      <AdminForm action={saveTestAction} initialMessage={(await searchParams).created ? "Тест создан" : undefined}>
        <input type="hidden" name="id" value={t?.id ?? ""} />
        <MediaList id="images" items={images} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={t?.title} slug={t?.slug} prefix="/tests/" />
            <Area label="Краткое описание" name="excerpt" defaultValue={t?.excerpt} rows={2} />
            <MarkdownField name="intro" label="Вступление" defaultValue={t?.intro} rows={8} />
            <TestEditor initial={structure} />
            <MarkdownField name="methodNote" label="Как устроен опросник (методическая заметка)" defaultValue={t?.methodNote} rows={6} />
            <Area label="Источники" name="sources" defaultValue={sources} rows={3} hint="Название | https://ссылка — по одному в строке" />
          </div>
          <aside>
            <PublishPanel status={t?.status} isDemo={t?.isDemo} viewUrl={t ? (t.status === "published" ? `/tests/${t.slug}` : `/admin/preview/test/${t.id}`) : null} />
            <div className="panel">
              <h2>Параметры</h2>
              <Select label="Тема" name="topicId" defaultValue={t?.topicId} options={topicOptions} />
              <Field label="Длительность, минут" name="durationMinutes" type="number" defaultValue={t?.durationMinutes ?? 5} />
              <Field label="Обложка" name="coverImage" defaultValue={t?.coverImage} list="images" />
            </div>
            <SeoPanel seoTitle={t?.seoTitle} seoDescription={t?.seoDescription} ogImage={t?.ogImage} mediaListId="images" />
          </aside>
        </div>
      </AdminForm>
      {t && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="test" id={t.id} /></div>}
    </>
  );
}
