"use client";
import { useActionState, useRef, startTransition } from "react";
import type { FormState } from "@/server/actions/state";

/**
 * Обёртка для форм админки. Отправка через onSubmit, чтобы при ошибке валидации
 * введённые данные НЕ сбрасывались.
 */
export function AdminForm({ action, children, className = "form", initialMessage }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>; children: React.ReactNode; className?: string; initialMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialMessage ? { ok: true, message: initialMessage } : {});
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className={className}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name) fd.set(submitter.name, submitter.value);
        startTransition(() => formAction(fd));
      }}
      aria-busy={pending}
    >
      {children}
      <div aria-live="polite">
        {pending && <p className="caption">Сохраняю…</p>}
        {!pending && state.error && <p className="form-error" role="alert">{state.error}</p>}
        {!pending && state.fields && Object.values(state.fields).map((m, i) => <p key={i} className="form-error" role="alert">{m}</p>)}
        {!pending && state.message && <p className="form-success" role="status">{state.message}</p>}
      </div>
    </form>
  );
}
