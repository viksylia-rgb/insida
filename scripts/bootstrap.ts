/**
 * Автоматическая подготовка базы при сборке на Netlify (без терминала):
 *  1) применяет миграции;
 *  2) если база пустая — создаёт демо-наполнение;
 *  3) если администраторов нет и заданы ADMIN_NAME / ADMIN_PASSWORD — создаёт первого администратора.
 * Повторные сборки ничего не перезаписывают.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "../src/server/db";
import { createAdmin } from "../src/server/auth/service";
import { passwordSchema, pseudonymSchema } from "../src/lib/validation";

async function main() {
  const db = getDb();
  console.log("→ Миграции");
  await migrate(db, { migrationsFolder: "./drizzle" });
  const [{ n: topics }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from topics`)).rows;
  if (topics === 0) {
    console.log("→ База пустая — создаю демо-наполнение");
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  }
  const [{ n: admins }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from users`)).rows;
  if (admins === 0) {
    const name = process.env.ADMIN_NAME;
    const password = process.env.ADMIN_PASSWORD;
    if (name && password && pseudonymSchema.safeParse(name).success && passwordSchema.safeParse(password).success) {
      await createAdmin({ pseudonym: name, password });
      console.log(`✓ Создан администратор «${name}». Коды восстановления выпустите в админ-панели → «Команда и безопасность».`);
      console.log("  После первого входа удалите переменную ADMIN_PASSWORD в настройках Netlify.");
    } else {
      console.log("! Администраторов нет: задайте ADMIN_NAME и ADMIN_PASSWORD (не короче 10 символов) и пересоберите сайт.");
    }
  }
  console.log("✓ База готова");
}
main().catch((e) => { console.error("✗", e.message); process.exitCode = 1; }).finally(closeDb);
