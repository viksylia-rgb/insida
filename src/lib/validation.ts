import { z } from "zod";

export const PSEUDONYM_RE = /^[\p{L}\p{N}_.\- ]{3,32}$/u;

export const pseudonymSchema = z
  .string()
  .trim()
  .min(3, "Псевдоним — не короче 3 символов")
  .max(32, "Псевдоним — не длиннее 32 символов")
  .regex(PSEUDONYM_RE, "Можно использовать буквы, цифры, пробел, точку, дефис и подчёркивание");

export const passwordSchema = z
  .string()
  .min(10, "Пароль — не короче 10 символов")
  .max(200, "Слишком длинный пароль")
  .refine((p) => new Set(p).size >= 5, "Пароль слишком однообразный")
  .refine((p) => !/^(.)\1+$/.test(p), "Пароль слишком простой");

export const loginSchema = z.object({
  pseudonym: z.string().trim().min(1, "Введите псевдоним").max(64),
  password: z.string().min(1, "Введите пароль").max(200),
});

export const recoverSchema = z
  .object({
    pseudonym: z.string().trim().min(1, "Введите псевдоним").max(64),
    code: z.string().trim().min(12, "Введите код восстановления").max(20),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, { message: "Пароли не совпадают", path: ["passwordConfirm"] });

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Адрес — не короче 2 символов")
  .max(90)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Адрес: только латиница в нижнем регистре, цифры и дефисы");

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Проверьте введённые данные";
}

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
