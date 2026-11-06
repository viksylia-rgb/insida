import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { saveBookAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { TitleSlug } from "@/components/admin/SlugField";
import { Area, Check, Field, MediaList, PublishPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { formLookups } from "../../_data";
import type { books } from "@/server/schema";

export const metadata = { title: "Книга" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const b = isNew ? null : ((await adminGet(actor, "book", id)) as typeof books.$inferSelect | null);
  if (!isNew && !b) notFound();
  const { topicOptions, images } = await formLookups();
  return (
    <>
      <h1>{isNew ? "Новая книга" : b!.title}</h1>
      <p className="notice" style={{ maxWidth: "80ch" }}>Пишите собственную аннотацию. Не копируйте тексты книг и издательские аннотации; обложку используйте только при наличии прав или замените нейтральным изображением.</p>
      <AdminForm action={saveBookAction} initialMessage={(await searchParams).created ? "Книга добавлена" : undefined}>
        <input type="hidden" name="id" value={b?.id ?? ""} />
        <MediaList id="images" items={images} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={b?.title} slug={b?.slug} prefix="/books#" titleLabel="Название книги" />
            <Field label="Авторы" name="authors" defaultValue={b?.authors} required />
            <div className="row-2"><Field label="Год издания" name="year" type="number" defaultValue={b?.year} /><Field label="Издательство" name="publisher" defaultValue={b?.publisher} /></div>
            <div className="row-2"><Field label="ISBN" name="isbn" defaultValue={b?.isbn} /><Field label="Ссылка на библиографические сведения" name="bibliographyUrl" defaultValue={b?.bibliographyUrl} hint="Например, страница в каталоге РГБ или у издательства" /></div>
            <Area label="Наша аннотация" name="annotation" defaultValue={b?.annotation} rows={5} />
            <Area label="Зачем читать" name="whyRead" defaultValue={b?.whyRead} rows={3} />
          </div>
          <aside>
            <PublishPanel status={b?.status} isDemo={b?.isDemo} extra={<Check name="featured" label="Показывать на главной" defaultChecked={b?.featured} />} />
            <div className="panel"><Select label="Тема" name="topicId" defaultValue={b?.topicId} options={topicOptions} /><Field label="Обложка" name="coverImage" defaultValue={b?.coverImage} list="images" /></div>
          </aside>
        </div>
      </AdminForm>
      {b && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="book" id={b.id} /></div>}
    </>
  );
}
