/**
 * Создание администратора. Запуск: npm run admin:create
 * Без интерактивного ввода: ADMIN_NAME=... ADMIN_PASSWORD=... npm run admin:create
 * Пароль нигде не сохраняется в открытом виде; в коде нет «админа по умолчанию».
 */
import "dotenv/config";
import { createAdmin, AuthError } from "../src/server/auth/service";
import { closeDb } from "../src/server/db";
import { passwordSchema, pseudonymSchema } from "../src/lib/validation";
import { ask } from "./prompt";

async function main() {
  const name = process.env.ADMIN_NAME || (await ask("Имя администратора (псевдоним): "));
  const n = pseudonymSchema.safeParse(name);
  if (!n.success) throw new Error(n.error.issues[0].message);
  const password = process.env.ADMIN_PASSWORD || (await ask("Пароль (не короче 10 символов): ", true));
  const p = passwordSchema.safeParse(password);
  if (!p.success) throw new Error(p.error.issues[0].message);
  if (!process.env.ADMIN_PASSWORD) {
    const again = await ask("Повторите пароль: ", true);
    if (again !== password) throw new Error("Пароли не совпадают");
  }
  const { user, recoveryCodes } = await createAdmin({ pseudonym: n.data, password: p.data });
  console.log(`\n✓ Администратор «${user.pseudonym}» создан. Вход: /login\n`);
  console.log("Коды восстановления доступа (каждый одноразовый). СОХРАНИТЕ ИХ — повторно они не показываются:\n");
  for (const c of recoveryCodes) console.log("   " + c);
  console.log("");
}
main()
  .catch((e) => { console.error("✗", e instanceof AuthError || e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(closeDb);
