import Link from "next/link";
import { formatDate } from "@/lib/format";
import { setStatusAction } from "@/server/actions/admin";

type Row = { id: string; title: string; slug?: string; status: string; isDemo?: boolean; updatedAt: Date; extra?: string };

export function ListTable({ rows, base, entity, publicPrefix, newLabel, title, deleted }: { rows: Row[]; base: string; entity: string; publicPrefix?: string; newLabel: string; title: string; deleted?: boolean }) {
  return (
    <>
      <div className="admin-head"><h1>{title}</h1><Link href={`${base}/new`} className="btn btn--primary btn--sm">{newLabel}</Link></div>
      {deleted && <p className="form-success" role="status">Удалено.</p>}
      {rows.length === 0 ? <div className="empty">Пока ничего нет.</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Название</th><th>Статус</th><th>Изменено</th><th><span className="sr-only">Действия</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`${base}/${r.id}`}>{r.title}</Link>{r.extra && <div className="caption">{r.extra}</div>}{r.isDemo && <div><span className="badge badge--demo">демо</span></div>}</td>
                  <td>{r.status === "published" ? <span className="badge badge--ok">Опубликовано</span> : <span className="badge badge--draft">Черновик</span>}</td>
                  <td className="caption">{formatDate(r.updatedAt)}</td>
                  <td>
                    <div className="cluster" style={{ justifyContent: "flex-end" }}>
                      {publicPrefix && r.slug && r.status === "published" && <a className="btn btn--ghost btn--sm" href={`${publicPrefix}${r.slug}`} target="_blank" rel="noreferrer">На сайте</a>}
                      <form action={setStatusAction}>
                        <input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={r.status === "published" ? "draft" : "published"} />
                        <button className="btn btn--ghost btn--sm" type="submit">{r.status === "published" ? "Снять" : "Опубликовать"}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
