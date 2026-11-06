import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __insidaPool?: Pool; __insidaDb?: DB };

function createPool(url: string) {
  return new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
}

/** Единое подключение к БД (переиспользуется при горячей перезагрузке в dev). */
export function getDb(): DB {
  if (!globalForDb.__insidaDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Не задана переменная окружения DATABASE_URL (см. .env.example)");
    globalForDb.__insidaPool = createPool(url);
    globalForDb.__insidaDb = drizzle(globalForDb.__insidaPool, { schema });
  }
  return globalForDb.__insidaDb;
}

export async function closeDb() {
  await globalForDb.__insidaPool?.end();
  globalForDb.__insidaPool = undefined;
  globalForDb.__insidaDb = undefined;
}

export { schema };
