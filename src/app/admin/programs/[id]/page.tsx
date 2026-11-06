import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet, adminProgramStructure } from "@/server/services/admin";
import { saveModuleAction, saveProgramAction, deleteModuleAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { TitleSlug } from "@/components/admin/SlugField";
import { Area, Field, MediaList, PublishPanel, SeoPanel, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formLookups } from "../../_data";
import type { programs } from "@/server/schema";

export const metadata = { title: "Программа" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const p = isNew ? null : ((await adminGet(actor, "program", id)) as typeof programs.$inferSelect | null);
  if (!isNew && !p) notFound();
  const [{ topicOptions, images }, modules] = await Promise.all([formLookups(), p ? adminProgramStructure(actor, p.id) : Promise.resolve([])]);
  return (
    <>
      <h1>{isNew ? "Новая программа" : p!.title}</h1>
      <AdminForm action={saveProgramAction} initialMessage={(await searchParams).created ? "Программа создана — теперь добавьте модули и уроки ниже" : undefined}>
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <MediaList id="images" items={images} />
        <div className="form-grid">
          <div className="form">
            <TitleSlug title={p?.title} slug={p?.slug} prefix="/programs/" />
            <Area label="Краткое описание" name="excerpt" defaultValue={p?.excerpt} rows={2} />
            <MarkdownField name="description" label="Описание программы" defaultValue={p?.description} rows={10} />
          </div>
          <aside>
            <PublishPanel status={p?.status} isDemo={p?.isDemo} viewUrl={p ? (p.status === "published" ? `/programs/${p.slug}` : `/admin/preview/program/${p.id}`) : null} />
            <div className="panel">
              <Select label="Тема" name="topicId" defaultValue={p?.topicId} options={topicOptions} />
              <Field label="Обложка" name="coverImage" defaultValue={p?.coverImage} list="images" />
            </div>
            <SeoPanel seoTitle={p?.seoTitle} seoDescription={p?.seoDescription} ogImage={p?.ogImage} mediaListId="images" />
          </aside>
        </div>
      </AdminForm>
      {p && (
        <section style={{ marginTop: "3rem", display: "grid", gap: "1.5rem" }}>
          <h2>Модули и уроки</h2>
          {modules.map((m) => (
            <div key={m.id} className="panel">
              <AdminForm action={saveModuleAction} className="form">
                <input type="hidden" name="id" value={m.id} /><input type="hidden" name="programId" value={p.id} />
                <div className="row-2"><Field label="Название модуля" name="title" defaultValue={m.title} /><Field label="Порядок" name="position" type="number" defaultValue={m.position} /></div>
                <Area label="Описание" name="description" defaultValue={m.description} rows={2} />
                <button className="btn btn--secondary btn--sm" type="submit" style={{ width: "fit-content" }}>Сохранить модуль</button>
              </AdminForm>
              <ol className="lesson-list">
                {m.lessons.map((l) => <li key={l.id}><Link className="lesson-link" href={`/admin/programs/${p.id}/lessons/${l.id}`}><span className="lesson-link__mark">{l.position}</span>{l.title}<span className="lesson-link__time">/{l.slug}</span></Link></li>)}
              </ol>
              <div className="cluster">
                <Link className="btn btn--ghost btn--sm" href={`/admin/programs/${p.id}/lessons/new?module=${m.id}`}>+ Урок</Link>
                <form action={deleteModuleAction}><input type="hidden" name="id" value={m.id} /><ConfirmButton>Удалить модуль с уроками</ConfirmButton></form>
              </div>
            </div>
          ))}
          <div className="panel">
            <h3>Новый модуль</h3>
            <AdminForm action={saveModuleAction} className="form">
              <input type="hidden" name="programId" value={p.id} />
              <div className="row-2"><Field label="Название" name="title" /><Field label="Порядок" name="position" type="number" defaultValue={modules.length + 1} /></div>
              <button className="btn btn--primary btn--sm" type="submit" style={{ width: "fit-content" }}>Добавить модуль</button>
            </AdminForm>
          </div>
          <div style={{ maxWidth: 320 }}><DeleteForm entity="program" id={p.id} /></div>
        </section>
      )}
    </>
  );
}
