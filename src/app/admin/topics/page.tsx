import { requireAdmin } from "@/server/auth/current";
import { listTags, listTopics } from "@/server/services/content";
import { saveTopicAction, deleteTopicAction, saveTagAction, deleteTagAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata = { title: "Темы и теги" };

export default async function Page() {
  await requireAdmin();
  const [topics, tags] = await Promise.all([listTopics(), listTags()]);
  return (
    <>
      <h1>Темы и теги</h1>
      <p className="muted">Темы — крупные разделы (показываются на главной в блоке «Что тебя сейчас волнует?»). Теги — уточняющие метки статей.</p>
      <h2 style={{ marginTop: "2rem" }}>Темы</h2>
      <div style={{ display: "grid", gap: "1rem" }}>
        {[...topics, null].map((t) => (
          <div key={t?.id ?? "new"} className="panel">
            {!t && <h3>Новая тема</h3>}
            <AdminForm action={saveTopicAction} className="form">
              <input type="hidden" name="id" value={t?.id ?? ""} />
              <div className="row-2"><Field label="Название" name="title" defaultValue={t?.title} /><Field label="Адрес (латиницей)" name="slug" defaultValue={t?.slug} hint={`/topics/${t?.slug ?? "…"}`} /></div>
              <div className="row-2"><Field label="Формулировка «Что волнует»" name="concern" defaultValue={t?.concern} hint="Например: «Сложно в отношениях»" /><Field label="Порядок" name="sortOrder" type="number" defaultValue={t?.sortOrder ?? topics.length + 1} /></div>
              <Field label="Описание" name="description" defaultValue={t?.description} />
              <button className="btn btn--secondary btn--sm" type="submit" style={{ width: "fit-content" }}>{t ? "Сохранить" : "Добавить тему"}</button>
            </AdminForm>
            {t && <form action={deleteTopicAction}><input type="hidden" name="id" value={t.id} /><ConfirmButton>Удалить тему</ConfirmButton></form>}
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: "3rem" }}>Теги</h2>
      <div className="grid grid--3">
        {[...tags, null].map((t) => (
          <div key={t?.id ?? "new"} className="panel">
            <AdminForm action={saveTagAction} className="form">
              <input type="hidden" name="id" value={t?.id ?? ""} />
              <Field label="Тег" name="title" defaultValue={t?.title} />
              <Field label="Адрес" name="slug" defaultValue={t?.slug} />
              <button className="btn btn--secondary btn--sm" type="submit" style={{ width: "fit-content" }}>{t ? "Сохранить" : "Добавить тег"}</button>
            </AdminForm>
            {t && <form action={deleteTagAction}><input type="hidden" name="id" value={t.id} /><ConfirmButton>Удалить</ConfirmButton></form>}
          </div>
        ))}
      </div>
    </>
  );
}
