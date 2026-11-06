import { hash, verify } from "@node-rs/argon2";

/** Параметры Argon2id по рекомендации OWASP (19 МиБ памяти, 2 итерации). */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Хеш-заглушка: проверка выполняется даже для несуществующего псевдонима,
// чтобы по времени ответа нельзя было узнать, занят ли он.
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword("insida-dummy-password-for-timing");
  return dummy;
}
