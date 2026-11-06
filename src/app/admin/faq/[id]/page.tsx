import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet } from "@/server/services/admin";
import { saveFaqAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { Field, Select } from "@/components/admin/Fields";
import { DeleteForm } from "@/components/admin/DangerButtons";
import type { faqItems } from "@/server/schema";

export const metadata = { title: "Вопрос" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const f = isNew ? null : ((await adminGet(actor, "faq", id)) as typeof faqItems.$inferSelect | null);
  if (!isNew && !f) notFound();
  return (
    <>
      <h1>{isNew ? "Новый вопрос" : "Вопрос"}</h1>
      <AdminForm action={saveFaqAction} initialMessage={(await searchParams).created ? "Вопрос добавлен" : undefined} className="form" >
        <input type="hidden" name="id" value={f?.id ?? ""} />
        <div style={{ maxWidth: 820, display: "grid", gap: "1.5rem" }}>
          <Field label="Вопрос" name="question" defaultValue={f?.question} required />
          <MarkdownField name="answer" label="Ответ" defaultValue={f?.answer} rows={8} />
          <div className="row-2"><Field label="Порядок" name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} /><Select label="Статус" name="status" defaultValue={f?.status ?? "published"} options={[["published", "Опубликован"], ["draft", "Черновик"]]} /></div>
          <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Сохранить</button>
        </div>
      </AdminForm>
      {f && <div style={{ maxWidth: 320, marginTop: "2rem" }}><DeleteForm entity="faq" id={f.id} /></div>}
    </>
  );
}
