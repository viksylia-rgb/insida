"use client";
import { useState } from "react";

/** Двухшаговое подтверждение без браузерных диалогов. */
export function ConfirmButton({ children, className = "btn btn--danger btn--sm" }: { children: React.ReactNode; className?: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button type="button" className={className} onClick={() => setArmed(true)}>{children}</button>;
  return (
    <span className="cluster">
      <button type="submit" className={className}>Да, точно</button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setArmed(false)}>Отмена</button>
    </span>
  );
}
