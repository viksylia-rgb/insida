"use client";
import Link from "next/link";
import { useActionState } from "react";
import { recoverAction } from "@/server/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function RecoverForm() {
  const [state, action] = useActionState(recoverAction, {});
  if (state.ok) {
    return (
      <div className="form-card">
        <p className="form-success" role="status">Пароль изменён, все прежние входы завершены.</p>
        <p className="small">Осталось неиспользованных кодов: {state.data?.remaining}. Новые коды можно выпустить в админ-панели → «Безопасность».</p>
        <Link href="/login" className="btn btn--primary">Войти</Link>
      </div>
    );
  }
  return (
    <form action={action} className="form form-card" noValidate>
      <div className="field"><label htmlFor="pseudonym">Имя администратора</label><input id="pseudonym" name="pseudonym" className="input" autoComplete="username" defaultValue={state.values?.pseudonym} required /></div>
      <div className="field"><label htmlFor="code">Код восстановления</label><input id="code" name="code" className="input" placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code" required aria-invalid={!!state.fields?.code} />{state.fields?.code && <span className="error">{state.fields.code}</span>}</div>
      <div className="field"><label htmlFor="password">Новый пароль</label><input id="password" name="password" type="password" className="input" autoComplete="new-password" required aria-invalid={!!state.fields?.password} /><span className="hint">Не короче 10 символов</span>{state.fields?.password && <span className="error">{state.fields.password}</span>}</div>
      <div className="field"><label htmlFor="passwordConfirm">Повторите пароль</label><input id="passwordConfirm" name="passwordConfirm" type="password" className="input" autoComplete="new-password" required />{state.fields?.passwordConfirm && <span className="error">{state.fields.passwordConfirm}</span>}</div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <SubmitButton pendingText="Проверяю…">Сменить пароль</SubmitButton>
    </form>
  );
}
