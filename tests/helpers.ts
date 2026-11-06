import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "@/server/db";
import { createAdmin } from "@/server/auth/service";
import type { SessionUser } from "@/server/auth/service";

let migrated = false;
export async function prepareDb() {
  if (!process.env.TEST_DATABASE_URL) throw new Error("Для интеграционных тестов задайте TEST_DATABASE_URL в .env");
  const db = getDb();
  if (!migrated) {
    await migrate(db, { migrationsFolder: "./drizzle" });
    migrated = true;
  }
  const res = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = res.rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`truncate ${names} restart identity cascade`));
}

let n = 0;
export async function makeAdmin(): Promise<SessionUser & { password: string }> {
  const password = "очень-надёжный-пароль-42";
  const { user } = await createAdmin({ pseudonym: `editor_${++n}_${Date.now() % 100000}`, password });
  return { id: user.id, pseudonym: user.pseudonym, role: "admin", sessionId: "test", password };
}

/** «Посторонний» — объект без прав администратора (например, подделанный вызов). */
export const outsider = { id: "00000000-0000-0000-0000-000000000001", pseudonym: "guest", role: "user", sessionId: "x" } as unknown as SessionUser;
