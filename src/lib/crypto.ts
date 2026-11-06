import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireSecret } from "./config";

/** Случайный токен в base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** HMAC с серверным секретом — для recovery-кодов и обезличивания IP в ключах rate limit. */
export function hmac(value: string): string {
  return createHmac("sha256", requireSecret("AUTH_SECRET")).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // без похожих символов (0/O, 1/I/L, U)
/** Recovery-код вида XXXX-XXXX-XXXX (12 символов ≈ 59 бит). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export function normalizeRecoveryCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 12 ? `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}` : clean;
}
