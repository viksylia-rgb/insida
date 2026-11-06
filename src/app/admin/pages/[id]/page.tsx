import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { savePageAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { Check, Field, SeoPanel } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import type { pages } from "@/server/schema";

export const metadata = { title: "Страница" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const p = isNew ? null : ((await adminGet(actor, "page", id)) as typeof pages.$inferSelect | null);
  if (!isNew && !p) notFound();
  return (
    <>
      <h1>{isNew ? "Новая страница" : p!.title}</h1>
      <AdminForm action={savePageAction} initialMessage={(await searchParams).created ? "Страница создана" : undefined}>
        <input type="hidden" name="id" value={p?.id ?? ""} />
        <div className="form-grid">
          <div className="form">
            <Field label="Заголовок" name="title" defaultValue={p?.title} required />
            <Field label="Адрес" name="slug" defaultValue={p?.slug} hint="Документы — legal/privacy, legal/terms и т.д.; страница «Об INSIDA» — about; «Контакты» — contacts" required />
            <MarkdownField name="body" label="Текст" defaultValue={p?.body} rows={26} />
          </div>
          <aside>
            <div className="panel">
              <h2>Публикация</h2>
              <input type="hidden" name="status" value={p?.status ?? "draft"} />
              <Check name="needsLegalReview" label="Шаблон: требует проверки юристом" defaultChecked={p?.needsLegalReview ?? true} hint="На странице будет предупреждение" />
              <div className="toolbar">
                <button type="submit" name="intent" value="save" className="btn btn--secondary btn--sm">Сохранить</button>
                {p?.status === "published" ? <button type="submit" name="intent" value="draft" className="btn btn--ghost btn--sm">Снять</button> : <button type="submit" name="intent" value="publish" className="btn btn--primary btn--sm">Опубликовать</button>}
              </div>
            </div>
            <SeoPanel seoTitle={p?.seoTitle} seoDescription={p?.seoDescription} />
          </aside>
        </div>
      </AdminForm>
      {p && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="page" id={p.id} /></div>}
    </>
  );
}
