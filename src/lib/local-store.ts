/**
 * Личные данные читателя — ТОЛЬКО в его браузере (localStorage).
 * Сервер их не получает и не хранит: ни псевдоним, ни избранное, ни результаты, ни ответы.
 *
 * Модуль состоит из чистых функций (покрыты автотестами) и React-хука useLocalData.
 */
import { z } from "zod";

export const STORAGE_KEY = "insida-data-v1";

const scaleResultS = z.object({
  key: z.string(),
  title: z.string(),
  score: z.number(),
  min: z.number(),
  max: z.number(),
  percent: z.number(),
  band: z.object({ title: z.string(), description: z.string(), recommendations: z.string(), links: z.array(z.string()) }).nullable(),
});

const dataSchema = z.object({
  version: z.literal(1),
  profile: z.object({ pseudonym: z.string().max(40).optional() }).default({}),
  favorites: z
    .array(z.object({ type: z.enum(["article", "test", "practice", "program", "book", "product"]), id: z.string().max(64), title: z.string().max(300), url: z.string().max(300).regex(/^\//), addedAt: z.string() }))
    .max(1000)
    .default([]),
  testResults: z
    .array(z.object({ id: z.string().max(64), testSlug: z.string().max(100), testTitle: z.string().max(300), date: z.string(), result: z.array(scaleResultS) }))
    .max(500)
    .default([]),
  practiceEntries: z
    .record(z.string().max(64), z.object({ slug: z.string().max(100), title: z.string().max(300), values: z.record(z.string().max(40), z.string().max(20000)), updatedAt: z.string(), isDraft: z.boolean() }))
    .default({}),
  lessonProgress: z.record(z.string().max(100), z.object({ title: z.string().max(300), total: z.number().int().min(0), done: z.array(z.string().max(64)).max(500) })).default({}),
});

export type LocalData = z.infer<typeof dataSchema>;
export type FavoriteItem = LocalData["favorites"][number];
export type StoredResult = LocalData["testResults"][number];

export const emptyData = (): LocalData => ({ version: 1, profile: {}, favorites: [], testResults: [], practiceEntries: {}, lessonProgress: {} });

/** Разбор сохранённых данных: повреждённые или чужие данные не ломают сайт. */
export function parseData(raw: string | null | undefined): LocalData {
  if (!raw) return emptyData();
  try {
    const r = dataSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : emptyData();
  } catch {
    return emptyData();
  }
}

// ---------- Чистые операции (возвращают новый объект) ----------
export function toggleFavorite(d: LocalData, item: Omit<FavoriteItem, "addedAt">, now = new Date()): LocalData {
  const exists = d.favorites.some((f) => f.type === item.type && f.id === item.id);
  return {
    ...d,
    favorites: exists ? d.favorites.filter((f) => !(f.type === item.type && f.id === item.id)) : [{ ...item, addedAt: now.toISOString() }, ...d.favorites],
  };
}

export function isFavorite(d: LocalData, type: FavoriteItem["type"], id: string) {
  return d.favorites.some((f) => f.type === type && f.id === id);
}

export function addTestResult(d: LocalData, r: Omit<StoredResult, "id" | "date">, now = new Date()): LocalData {
  const id = `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return { ...d, testResults: [{ ...r, id, date: now.toISOString() }, ...d.testResults].slice(0, 500) };
}

export function removeTestResult(d: LocalData, id: string): LocalData {
  return { ...d, testResults: d.testResults.filter((r) => r.id !== id) };
}

export function saveEntry(d: LocalData, practiceId: string, e: { slug: string; title: string; values: Record<string, string>; isDraft: boolean }, now = new Date()): LocalData {
  return { ...d, practiceEntries: { ...d.practiceEntries, [practiceId]: { ...e, updatedAt: now.toISOString() } } };
}

export function removeEntry(d: LocalData, practiceId: string): LocalData {
  const next = { ...d.practiceEntries };
  delete next[practiceId];
  return { ...d, practiceEntries: next };
}

export function setLessonDone(d: LocalData, program: { slug: string; title: string; total: number }, lessonId: string, done: boolean): LocalData {
  const cur = d.lessonProgress[program.slug] ?? { title: program.title, total: program.total, done: [] };
  const set = new Set(cur.done);
  if (done) set.add(lessonId);
  else set.delete(lessonId);
  return { ...d, lessonProgress: { ...d.lessonProgress, [program.slug]: { title: program.title, total: program.total, done: [...set] } } };
}

export function setPseudonym(d: LocalData, pseudonym: string): LocalData {
  const p = pseudonym.trim().slice(0, 40);
  return { ...d, profile: { ...d.profile, pseudonym: p || undefined } };
}

/** Экспорт в машиночитаемый JSON — пользователь хранит файл у себя. */
export function exportData(d: LocalData, now = new Date()): string {
  return JSON.stringify({ ...d, exportedAt: now.toISOString(), format: "insida-local-export/v1" }, null, 2);
}

export class ImportError extends Error {}

/** Импорт файла экспорта: replace — заменить всё, merge — объединить с тем, что уже есть. */
export function importData(current: LocalData, json: string, mode: "merge" | "replace"): LocalData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError("Файл повреждён или это не файл экспорта INSIDA");
  }
  const r = dataSchema.safeParse(parsed);
  if (!r.success) throw new ImportError("Файл не похож на экспорт INSIDA или создан несовместимой версией");
  const inc = r.data;
  if (mode === "replace") return inc;
  const favKey = (f: FavoriteItem) => `${f.type}:${f.id}`;
  const favs = new Map(current.favorites.map((f) => [favKey(f), f]));
  for (const f of inc.favorites) if (!favs.has(favKey(f))) favs.set(favKey(f), f);
  const results = new Map(current.testResults.map((t) => [t.id, t]));
  for (const t of inc.testResults) results.set(t.id, t);
  const entries = { ...current.practiceEntries };
  for (const [k, v] of Object.entries(inc.practiceEntries)) if (!entries[k] || entries[k].updatedAt < v.updatedAt) entries[k] = v;
  const progress = { ...current.lessonProgress };
  for (const [k, v] of Object.entries(inc.lessonProgress)) progress[k] = { ...v, done: [...new Set([...(progress[k]?.done ?? []), ...v.done])] };
  return {
    version: 1,
    profile: { pseudonym: current.profile.pseudonym ?? inc.profile.pseudonym },
    favorites: [...favs.values()],
    testResults: [...results.values()].sort((a, b) => b.date.localeCompare(a.date)),
    practiceEntries: entries,
    lessonProgress: progress,
  };
}

// ---------- Работа с localStorage ----------
const EVENT = "insida-data-change";

export function readStore(): LocalData {
  if (typeof window === "undefined") return emptyData();
  try {
    return parseData(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyData();
  }
}

export function writeStore(d: LocalData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    cached = null;
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    // Хранилище недоступно (приватный режим, переполнено) — сообщаем вызывающему коду.
    return false;
  }
}

export function clearStore() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
  cached = null;
  window.dispatchEvent(new Event(EVENT));
}

let cached: { raw: string | null; data: LocalData } | null = null;
function snapshot(): LocalData {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (!cached || cached.raw !== raw) cached = { raw, data: parseData(raw) };
  return cached.data;
}
const SERVER_SNAPSHOT = emptyData();

export function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && cb();
  window.addEventListener("storage", onStorage); // изменения из других вкладок
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, cb);
  };
}
export const getSnapshot = snapshot;
export const getServerSnapshot = () => SERVER_SNAPSHOT;
