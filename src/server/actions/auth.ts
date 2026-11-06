"use server";
import { redirect } from "next/navigation";
import { AuthError, login, recoverWithCode, deleteSession } from "../auth/service";
import { clearSessionCookie, clientIp, getSessionToken, safeNext, setSessionCookie } from "../auth/current";
import { fieldErrors, loginSchema, recoverSchema } from "@/lib/validation";
import { formToObject, type FormState } from "./state";

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = formToObject(fd);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Введите псевдоним и пароль", fields: fieldErrors(parsed.error), values: { pseudonym: values.pseudonym ?? "" } };
  try {
    const { session } = await login({ ...parsed.data, ip: await clientIp() });
    await setSessionCookie(session.token, session.expiresAt);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, values: { pseudonym: parsed.data.pseudonym } };
    console.error(e);
    return { error: "Не удалось войти. Попробуйте позже." };
  }
  redirect(safeNext(values.next, "/admin"));
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/");
}

export async function recoverAction(_: FormState<{ remaining: number }>, fd: FormData): Promise<FormState<{ remaining: number }>> {
  const values = formToObject(fd);
  const parsed = recoverSchema.safeParse(values);
  if (!parsed.success) return { error: "Проверьте поля формы", fields: fieldErrors(parsed.error), values: { pseudonym: values.pseudonym ?? "" } };
  try {
    const r = await recoverWithCode({ pseudonym: parsed.data.pseudonym, code: parsed.data.code, newPassword: parsed.data.password, ip: await clientIp() });
    return { ok: true, data: { remaining: r.remainingCodes } };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, values: { pseudonym: parsed.data.pseudonym } };
    console.error(e);
    return { error: "Не удалось восстановить доступ. Попробуйте позже." };
  }
}
