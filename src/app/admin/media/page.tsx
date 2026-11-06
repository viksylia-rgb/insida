import { requireAdmin } from "@/server/auth/current";
import { listMedia } from "@/server/services/admin";
import { uploadMediaAction, deleteMediaAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { mediaUrl } from "../_data";

export const metadata = { title: "Медиафайлы" };

export default async function Page() {
  const files = await listMedia(await requireAdmin());
  const total = files.reduce((s, f) => s + f.sizeBytes, 0);
  return (
    <>
      <h1>Медиафайлы</h1>
      <div className="panel" style={{ maxWidth: 640 }}>
        <h2>Загрузить</h2>
        <p className="caption" style={{ margin: 0 }}>JPG, PNG, WebP, AVIF — до 4 МБ; PDF — до 5 МБ. Файлы хранятся в базе данных: на бесплатном тарифе базы место ограничено, сжимайте изображения (например, до 1600 px по ширине). Используйте только изображения, на которые у вас есть права.</p>
        <AdminForm action={uploadMediaAction} className="form">
          <div className="field"><label htmlFor="file">Файл</label><input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" className="input" required /></div>
          <Field label="Описание изображения (alt)" name="alt" hint="Для незрячих читателей: что изображено" />
          <button className="btn btn--primary btn--sm" type="submit" style={{ width: "fit-content" }}>Загрузить</button>
        </AdminForm>
      </div>
      <p className="caption" style={{ marginTop: "2rem" }}>Всего файлов: {files.length}, {(total / 1024 / 1024).toFixed(1)} МБ. Скопируйте адрес файла и вставьте в поле «Обложка» или в текст: <code>![описание](/media/…)</code></p>
      <div className="media-grid">
        {files.map((f) => (
          <div key={f.id} className="media-item">
            {f.mimeType.startsWith("image/") ? <img src={mediaUrl(f)} alt={f.alt ?? ""} loading="lazy" /> : <span className="pdf">PDF</span>}
            <div>
              <strong>{f.originalName}</strong>
              <code>{mediaUrl(f)}</code>
              <span>{(f.sizeBytes / 1024).toFixed(0)} КБ</span>
              <form action={deleteMediaAction}><input type="hidden" name="id" value={f.id} /><ConfirmButton>Удалить</ConfirmButton></form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
