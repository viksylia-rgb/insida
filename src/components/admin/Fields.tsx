import type { ReactNode } from "react";

export function Field({ label, name, defaultValue, hint, type = "text", required, list, placeholder }: { label: string; name: string; defaultValue?: string | number | null; hint?: ReactNode; type?: string; required?: boolean; list?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input" defaultValue={defaultValue ?? ""} required={required} list={list} placeholder={placeholder} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Area({ label, name, defaultValue, hint, rows = 4 }: { label: string; name: string; defaultValue?: string | null; hint?: ReactNode; rows?: number }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} className="textarea" rows={rows} defaultValue={defaultValue ?? ""} style={{ minHeight: rows * 28 }} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Select({ label, name, defaultValue, options, hint }: { label: string; name: string; defaultValue?: string | null; options: [string, string][]; hint?: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} className="select" defaultValue={defaultValue ?? ""}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>{label}{hint && <><br /><span className="caption">{hint}</span></>}</span>
    </label>
  );
}

/** Подсказки адресов загруженных файлов для полей изображений. */
export function MediaList({ id, items }: { id: string; items: { url: string; name: string }[] }) {
  return <datalist id={id}>{items.map((m) => <option key={m.url} value={m.url}>{m.name}</option>)}</datalist>;
}

/** Боковая панель публикации: статус, кнопки, демо-пометка. */
export function PublishPanel({ status, isDemo, viewUrl, extra }: { status?: string; isDemo?: boolean; viewUrl?: string | null; extra?: ReactNode }) {
  return (
    <div className="panel">
      <h2>Публикация</h2>
      <p className="small" style={{ margin: 0 }}>Статус: {status === "published" ? <span className="badge badge--ok">Опубликовано</span> : <span className="badge badge--draft">Черновик</span>}</p>
      <input type="hidden" name="status" value={status ?? "draft"} />
      <Check name="isDemo" label="Демонстрационный материал" defaultChecked={isDemo ?? false} hint="На сайте появится пометка «Демонстрационный материал»" />
      {extra}
      <div className="toolbar">
        <button type="submit" name="intent" value="save" className="btn btn--secondary btn--sm">Сохранить</button>
        {status === "published"
          ? <button type="submit" name="intent" value="draft" className="btn btn--ghost btn--sm">Снять с публикации</button>
          : <button type="submit" name="intent" value="publish" className="btn btn--primary btn--sm">Опубликовать</button>}
      </div>
      {viewUrl && <a href={viewUrl} target="_blank" className="small" rel="noreferrer">{status === "published" ? "Открыть на сайте ↗" : "Предпросмотр черновика ↗"}</a>}
    </div>
  );
}

export function SeoPanel({ seoTitle, seoDescription, ogImage, mediaListId }: { seoTitle?: string | null; seoDescription?: string | null; ogImage?: string | null; mediaListId?: string }) {
  return (
    <details className="panel">
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>SEO и соцсети</summary>
      <Field label="SEO-заголовок" name="seoTitle" defaultValue={seoTitle} hint="Если пусто — используется заголовок" />
      <Area label="SEO-описание" name="seoDescription" defaultValue={seoDescription} rows={3} hint="До 160 символов" />
      <Field label="Картинка для соцсетей" name="ogImage" defaultValue={ogImage} list={mediaListId} />
    </details>
  );
}
