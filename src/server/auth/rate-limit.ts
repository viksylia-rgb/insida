import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { hmac } from "@/lib/crypto";

export type RateRule = { limit: number; windowSeconds: number };

export const RULES = {
  loginByName: { limit: 8, windowSeconds: 15 * 60 },
  loginByIp: { limit: 30, windowSeconds: 15 * 60 },
  recover: { limit: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, RateRule>;

/** Ключ содержит HMAC идентификатора — сам IP или псевдоним в таблице не хранятся. */
export function rateKey(scope: string, id: string) {
  return `${scope}:${hmac(id.toLowerCase())}`;
}

export type RateResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/** Атомарно увеличивает счётчик в фиксированном окне. */
export async function hit(key: string, rule: RateRule): Promise<RateResult> {
  const db = getDb();
  const interval = `${rule.windowSeconds} seconds`;
  const res = await db.execute<{ count: number; window_start: Date }>(sql`
    insert into rate_limits (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - ${interval}::interval then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - ${interval}::interval then now() else rate_limits.window_start end
    returning count, window_start`);
  const row = res.rows[0];
  const count = Number(row.count);
  const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(rule.windowSeconds - elapsed)),
  };
}

export async function reset(key: string) {
  await getDb().execute(sql`delete from rate_limits where key = ${key}`);
}

/** Очистка устаревших записей (вызывается изредка при входе). */
export async function cleanup() {
  await getDb().execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
}

export function retryMessage(seconds: number) {
  const m = Math.ceil(seconds / 60);
  return `Слишком много попыток. Попробуйте снова через ${m} мин.`;
}
