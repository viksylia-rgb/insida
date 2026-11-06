"use client";
import { useActionState } from "react";
import { regenerateCodesAction } from "@/server/actions/admin";

export function RecoveryCodes() {
  const [state, action, pending] = useActionState(regenerateCodesAction, {});
  if (state.data?.codes) {
    return (
      <div>
        <p className="form-success" role="status">Новые коды выпущены, старые больше не действуют. Сохраните их сейчас — повторно они не показываются.</p>
        <div className="codes">{state.data.codes.map((c) => <span key={c}>{c}</span>)}</div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard?.writeText(state.data!.codes.join("\n"))}>Скопировать</button>
      </div>
    );
  }
  return <form action={action}><button className="btn btn--secondary btn--sm" disabled={pending}>Выпустить новые коды</button></form>;
}
