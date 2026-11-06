import { requireAdmin } from "@/server/auth/current";
import { adminListUsers } from "@/server/services/admin";
import { remainingRecoveryCodes } from "@/server/auth/service";
import { addAdminAction, blockAdminAction, deleteAdminAction, changePasswordAction } from "@/server/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { RecoveryCodes } from "./RecoveryCodes";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Команда и безопасность" };

export default async function Page() {
  const me = await requireAdmin();
  const [admins, codesLeft] = await Promise.all([adminListUsers(me), remainingRecoveryCodes(me.id)]);
  return (
    <>
      <h1>Команда и безопасность</h1>
      <div className="grid grid--2">
        <section className="panel">
          <h2>Сменить пароль</h2>
          <AdminForm action={changePasswordAction} className="form">
            <Field label="Текущий пароль" name="current" type="password" />
            <Field label="Новый пароль" name="next" type="password" hint="Не короче 10 символов" />
            <Field label="Повторите новый пароль" name="confirm" type="password" />
            <button className="btn btn--primary btn--sm" type="submit" style={{ width: "fit-content" }}>Сменить</button>
          </AdminForm>
        </section>
        <section className="panel">
          <h2>Коды восстановления</h2>
          <p className="small" style={{ margin: 0 }}>Осталось неиспользованных кодов: <strong>{codesLeft}</strong>. Каждый код одноразовый и заменяет восстановление по e-mail. Храните их офлайн (распечатайте или в менеджере паролей).</p>
          <RecoveryCodes />
        </section>
      </div>
      <h2 style={{ marginTop: "3rem" }}>Администраторы</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Имя</th><th>Создан</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.pseudonym}{a.id === me.id && " (вы)"}</td>
                <td className="caption">{formatDate(a.createdAt)}</td>
                <td>{a.blocked ? <span className="badge badge--draft">Заблокирован</span> : <span className="badge badge--ok">Активен</span>}</td>
                <td>{a.id !== me.id && (
                  <div className="cluster">
                    <form action={blockAdminAction}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="blocked" value={a.blocked ? "0" : "1"} /><button className="btn btn--ghost btn--sm">{a.blocked ? "Разблокировать" : "Заблокировать"}</button></form>
                    <form action={deleteAdminAction}><input type="hidden" name="id" value={a.id} /><ConfirmButton>Удалить</ConfirmButton></form>
                  </div>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel" style={{ maxWidth: 560, marginTop: "1.5rem" }}>
        <h2>Добавить администратора</h2>
        <AdminForm action={addAdminAction} className="form">
          <Field label="Имя (псевдоним)" name="pseudonym" />
          <Field label="Временный пароль" name="password" type="password" hint="Передайте лично, попросите сменить после входа" />
          <button className="btn btn--secondary btn--sm" type="submit" style={{ width: "fit-content" }}>Добавить</button>
        </AdminForm>
      </section>
    </>
  );
}
