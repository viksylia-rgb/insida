"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn btn--primary", pendingText = "Сохраняю…", name, value, formNoValidate }: {
  children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string; formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} name={name} value={value} formNoValidate={formNoValidate} aria-busy={pending}>{pending ? pendingText : children}</button>;
}
