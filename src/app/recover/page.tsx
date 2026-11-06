import type { Metadata } from "next";
import { RecoverForm } from "./RecoverForm";

export const metadata: Metadata = { title: "Восстановление доступа", robots: { index: false, follow: false } };

export default function Recover() {
  return (
    <section className="section container">
      <div className="auth-wrap">
        <p className="eyebrow">Для редакции</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Восстановление доступа</h1>
        <p className="muted">У аккаунтов нет e-mail, поэтому доступ восстанавливается одноразовым кодом, который был выдан при создании администратора. Если кодов нет — пароль можно сбросить на сервере командой <code>npm run admin:reset-password</code> (см. README).</p>
        <RecoverForm />
      </div>
    </section>
  );
}
