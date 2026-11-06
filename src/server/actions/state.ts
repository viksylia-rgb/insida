export type FormState<T = unknown> = {
  ok?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  data?: T;
};

export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}
