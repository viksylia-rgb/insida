/** Применяет SQL-миграции из папки drizzle/ к базе DATABASE_URL. Запуск: npm run db:migrate */
import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "../src/server/db";

async function main() {
  console.log("→ Применяю миграции…");
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("✓ База данных в актуальном состоянии");
  await closeDb();
}
main().catch(async (e) => {
  console.error("✗ Ошибка миграции:", e.message);
  await closeDb();
  process.exit(1);
});
