import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGetArticle } from "@/server/services/admin";
import { listTags } from "@/server/services/content";
import { saveArticleAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { Area, Check, Field, MediaList, PublishPanel, SeoPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { formLookups } from "../../_data";

export const metadata = { title: "Материал" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const a = isNew ? null : await adminGetArticle(actor, id);
  if (!isNew && !a) notFound();
  const [{ topicOptions, images }, tags] = await Promise.all([formLookups(), listTags()]);
  const sources = (a?.sources ?? []).map((s) => [s.title, s.url ?? "", s.note ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n");
  return (
    <>
      <h1>{isNew ? "Новый материал" : a!.title}</h1>
      <AdminForm action={saveArticleAction} initialMessage={(await searchParams).created ? "Материал создан" : undefined}>
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <MediaList id="images" items={images} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={a?.title} slug={a?.slug} prefix="/library/" />
            <Area label="Краткое описание (лид)" name="excerpt" defaultValue={a?.excerpt} rows={3} hint="1–2 предложения: показывается в карточках и в начале статьи" />
            <MarkdownField name="body" label="Текст" defaultValue={a?.body} rows={24} />
            <Area label="Источники" name="sources" defaultValue={sources} rows={5} hint="По одному в строке: Название | https://ссылка | примечание. Указывайте только реальные, проверенные источники." />
          </div>
          <aside>
            <PublishPanel status={a?.status} isDemo={a?.isDemo} viewUrl={a ? (a.status === "published" ? `/library/${a.slug}` : `/admin/preview/article/${a.id}`) : null}
              extra={<><Check name="featured" label="В «Выбор редакции» на главной" defaultChecked={a?.featured} /><Check name="sensitive" label="Чувствительная тема" defaultChecked={a?.sensitive} hint="Покажет мягкую рекомендацию обратиться за помощью" /></>} />
            <div className="panel">
              <h2>Параметры</h2>
              <Select label="Формат" name="kind" defaultValue={a?.kind ?? "article"} options={[["article", "Статья"], ["term", "Объяснение термина"], ["collection", "Подборка"]]} />
              <Select label="Тема" name="topicId" defaultValue={a?.topicId} options={topicOptions} />
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label" style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.4rem" }}>Теги</legend>
                <div className="cluster">{tags.map((t) => <label key={t.id} className="check small"><input type="checkbox" name="tagIds" value={t.id} defaultChecked={a?.tagIds.includes(t.id)} /> {t.title}</label>)}</div>
              </fieldset>
              <Field label="Обложка" name="coverImage" defaultValue={a?.coverImage} list="images" hint="Адрес из раздела «Медиафайлы»" />
              <Field label="Описание обложки (alt)" name="coverAlt" defaultValue={a?.coverAlt} />
            </div>
            <div className="panel">
              <h2>Редакция</h2>
              <Field label="Автор" name="author" defaultValue={a?.author} />
              <Field label="Дата обновления материала" name="contentUpdatedAt" type="date" defaultValue={a?.contentUpdatedAt?.toISOString().slice(0, 10)} />
              <Select label="Редакторская проверка" name="reviewStatus" defaultValue={a?.reviewStatus ?? "not_reviewed"} options={[["not_reviewed", "Не проверено"], ["in_review", "На проверке"], ["reviewed", "Проверено"]]} />
              <Field label="Кто проверил" name="reviewedBy" defaultValue={a?.reviewedBy} />
            </div>
            <SeoPanel seoTitle={a?.seoTitle} seoDescription={a?.seoDescription} ogImage={a?.ogImage} mediaListId="images" />
          </aside>
        </div>
      </AdminForm>
      {a && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="article" id={a.id} /></div>}
    </>
  );
}
