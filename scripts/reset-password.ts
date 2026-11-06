/** Сброс пароля администратора из консоли сервера: npm run admin:reset-password */
import "dotenv/config";
import { resetPasswordByName } from "../src/server/auth/service";
import { closeDb } from "../src/server/db";
import { passwordSchema } from "../src/lib/validation";
import { ask } from "./prompt";

async function main() {
  const name = process.env.ADMIN_NAME || (await ask("Имя администратора: "));
  const password = process.env.ADMIN_PASSWORD || (await ask("Новый пароль: ", true));
  const p = passwordSchema.safeParse(password);
  if (!p.success) throw new Error(p.error.issues[0].message);
  await resetPasswordByName(name, p.data);
  console.log("✓ Пароль изменён, все сессии этого администратора завершены.");
}
main().catch((e) => { console.error("✗", e.message); process.exitCode = 1; }).finally(closeDb);
