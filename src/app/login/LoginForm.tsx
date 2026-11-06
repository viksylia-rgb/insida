"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="form form-card" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="pseudonym">Имя администратора</label>
        <input id="pseudonym" name="pseudonym" className="input" autoComplete="username" required defaultValue={state.values?.pseudonym} aria-invalid={!!state.fields?.pseudonym} />
      </div>
      <div className="field">
        <label htmlFor="password">Пароль</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required aria-invalid={!!state.fields?.password} />
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <SubmitButton pendingText="Вхожу…">Войти</SubmitButton>
      <p className="caption" style={{ margin: 0 }}><Link href="/recover">Забыли пароль? Восстановить по коду</Link></p>
    </form>
  );
}
