/**
 * Операции администратора. Каждая функция первым делом проверяет роль (assertAdmin) —
 * даже если её вызовут в обход интерфейса, без прав администратора она не выполнится.
 */
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  articles,
  articleTags,
  auditLog,
  books,
  faqItems,
  lessons,
  media,
  pages,
  practices,
  products,
  programModules,
  programs,
  sessions,
  settings,
  tags,
  testOptions,
  testQuestions,
  testResultBands,
  tests,
  topics,
  users,
} from "../schema";
import type { SessionUser } from "../auth/service";
import { passwordSchema, pseudonymSchema, slugSchema } from "@/lib/validation";
import { createAdmin } from "../auth/service";
import { readingMinutes } from "@/lib/markdown";
import { checkBandCoverage } from "@/lib/scoring";
import { DEFAULT_SETTINGS, type SiteSettings } from "./content";

export class ForbiddenError extends Error {
  constructor() {
    super("Недостаточно прав для этого действия");
  }
}
export class ValidationError extends Error {}

export function assertAdmin(actor: SessionUser | null | undefined): asserts actor is SessionUser {
  if (!actor || actor.role !== "admin") throw new ForbiddenError();
}

/** Служебный «администратор» для скрипта демо-наполнения (в журнал пишется без автора). */
export const SYSTEM_ACTOR: SessionUser = { id: "system", pseudonym: "seed", role: "admin", sessionId: "system" };
const actorRef = (a: SessionUser) => (a.id === SYSTEM_ACTOR.id ? null : a.id);

async function audit(actor: SessionUser, action: string, entity: string, entityId?: string) {
  await getDb().insert(auditLog).values({ actorId: actorRef(actor), action, entity, entityId });
}

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => `${i.path.join(".") || "поле"}: ${i.message}`).join("; "));
  return r.data;
}

async function ensureUniqueSlug(table: typeof articles | typeof tests | typeof practices | typeof programs | typeof books | typeof products | typeof pages | typeof topics, slug: string, id?: string) {
  const rows = await getDb()
    .select({ id: table.id })
    .from(table)
    .where(id ? and(eq(table.slug, slug), ne(table.id, id)) : eq(table.slug, slug))
    .limit(1);
  if (rows.length) throw new ValidationError(`Адрес «${slug}» уже используется другим материалом`);
}

const optText = z.string().trim().max(500).optional().transform((v) => (v ? v : null));
const optUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid().nullable());
const statusS = z.enum(["draft", "published"]);
const bool = z.unknown().optional().transform((v) => v === true || v === "on" || v === "true");
const sourcesS = z
  .array(z.object({ title: z.string().trim().min(1).max(500), url: z.string().trim().url().max(1000).optional().or(z.literal("")).transform((v) => v || undefined), note: z.string().trim().max(500).optional() }))
  .max(50)
  .default([]);
const seoS = { seoTitle: optText, seoDescription: optText, ogImage: optText };

function publishedAt(status: "draft" | "published", prev: Date | null | undefined) {
  return status === "published" ? (prev ?? new Date()) : (prev ?? null);
}

// ================= ТЕМЫ И ТЕГИ =================
export const topicSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  concern: optText,
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});
export async function saveTopic(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(topicSchema, input);
  await ensureUniqueSlug(topics, d.slug, id);
  const db = getDb();
  const [row] = id
    ? await db.update(topics).set({ ...d, updatedAt: new Date() }).where(eq(topics.id, id)).returning()
    : await db.insert(topics).values(d).returning();
  await audit(actor, id ? "update" : "create", "topic", row.id);
  return row;
}
export async function deleteTopic(actor: SessionUser, id: string) {
  assertAdmin(actor);
  await getDb().delete(topics).where(eq(topics.id, id));
  await audit(actor, "delete", "topic", id);
}

export const tagSchema = z.object({ slug: slugSchema, title: z.string().trim().min(2).max(60) });
export async function saveTag(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(tagSchema, input);
  const db = getDb();
  const dup = await db.select({ id: tags.id }).from(tags).where(id ? and(eq(tags.slug, d.slug), ne(tags.id, id)) : eq(tags.slug, d.slug));
  if (dup.length) throw new ValidationError("Такой тег уже есть");
  const [row] = id ? await db.update(tags).set(d).where(eq(tags.id, id)).returning() : await db.insert(tags).values(d).returning();
  await audit(actor, id ? "update" : "create", "tag", row.id);
  return row;
}
export async function deleteTag(actor: SessionUser, id: string) {
  assertAdmin(actor);
  await getDb().delete(tags).where(eq(tags.id, id));
  await audit(actor, "delete", "tag", id);
}

// ================= СТАТЬИ =================
export const articleSchema = z.object({
  slug: slugSchema,
  kind: z.enum(["article", "term", "collection"]),
  title: z.string().trim().min(3, "Заголовок слишком короткий").max(200),
  excerpt: z.string().trim().max(600).default(""),
  body: z.string().max(200_000).default(""),
  topicId: optUuid,
  coverImage: optText,
  coverAlt: optText,
  author: optText,
  sources: sourcesS,
  reviewStatus: z.enum(["not_reviewed", "in_review", "reviewed"]),
  reviewedBy: optText,
  contentUpdatedAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
  sensitive: bool,
  featured: bool,
  isDemo: bool,
  status: statusS,
  tagIds: z.array(z.string().uuid()).max(30).default([]),
  ...seoS,
});
export type ArticleInput = z.input<typeof articleSchema>;

export async function saveArticle(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const { tagIds, ...d } = parse(articleSchema, input);
  await ensureUniqueSlug(articles, d.slug, id);
  const db = getDb();
  return db.transaction(async (tx) => {
    const prev = id ? (await tx.select().from(articles).where(eq(articles.id, id)))[0] : undefined;
    if (id && !prev) throw new ValidationError("Материал не найден");
    const values = {
      ...d,
      readingMinutes: readingMinutes(d.body),
      reviewedAt: d.reviewStatus === "reviewed" ? (prev?.reviewedAt ?? new Date()) : null,
      contentUpdatedAt: d.contentUpdatedAt ?? new Date(),
      publishedAt: publishedAt(d.status, prev?.publishedAt),
      updatedAt: new Date(),
    };
    const [row] = id ? await tx.update(articles).set(values).where(eq(articles.id, id)).returning() : await tx.insert(articles).values(values).returning();
    await tx.delete(articleTags).where(eq(articleTags.articleId, row.id));
    if (tagIds.length) await tx.insert(articleTags).values(tagIds.map((tagId) => ({ articleId: row.id, tagId })));
    await tx.insert(auditLog).values({ actorId: actorRef(actor), action: id ? "update" : "create", entity: "article", entityId: row.id });
    return row;
  });
}

export async function setStatus(actor: SessionUser, entity: "article" | "test" | "practice" | "program" | "book" | "product" | "page" | "faq", id: string, status: "draft" | "published") {
  assertAdmin(actor);
  const db = getDb();
  const t = { article: articles, test: tests, practice: practices, program: programs, book: books, product: products, page: pages, faq: faqItems }[entity];
  if (!t) throw new ValidationError("Неизвестный тип материала");
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "published" && "publishedAt" in t) set.publishedAt = sql`coalesce(published_at, now())`;
  await db.update(t).set(set).where(eq(t.id, id));
  await audit(actor, status === "published" ? "publish" : "unpublish", entity, id);
}

export async function deleteEntity(actor: SessionUser, entity: "article" | "test" | "practice" | "program" | "book" | "product" | "page" | "faq", id: string) {
  assertAdmin(actor);
  const t = { article: articles, test: tests, practice: practices, program: programs, book: books, product: products, page: pages, faq: faqItems }[entity];
  await getDb().delete(t).where(eq(t.id, id));
  await audit(actor, "delete", entity, id);
}

export async function adminListArticles(actor: SessionUser) {
  assertAdmin(actor);
  return getDb()
    .select({ id: articles.id, slug: articles.slug, title: articles.title, kind: articles.kind, status: articles.status, isDemo: articles.isDemo, updatedAt: articles.updatedAt, topic: topics.title, reviewStatus: articles.reviewStatus })
    .from(articles)
    .leftJoin(topics, eq(topics.id, articles.topicId))
    .orderBy(desc(articles.updatedAt));
}

export async function adminGetArticle(actor: SessionUser, id: string) {
  assertAdmin(actor);
  const db = getDb();
  const [a] = await db.select().from(articles).where(eq(articles.id, id));
  if (!a) return null;
  const t = await db.select({ id: articleTags.tagId }).from(articleTags).where(eq(articleTags.articleId, id));
  return { ...a, tagIds: t.map((x) => x.id) };
}

// ================= ТЕСТЫ =================
const optionS = z.object({
  label: z.string().trim().min(1, "Пустой вариант ответа").max(300),
  scores: z.record(z.string(), z.coerce.number().int().min(-100).max(100)).default({}),
  jumpToPosition: z.coerce.number().int().min(1).max(500).nullable().optional(),
});
const questionS = z.object({
  type: z.enum(["single", "multiple", "scale"]),
  text: z.string().trim().min(3, "Слишком короткий вопрос").max(600),
  hint: z.string().trim().max(400).optional().nullable(),
  options: z.array(optionS).min(2, "У вопроса должно быть минимум 2 варианта").max(12),
});
const bandS = z.object({
  scaleKey: z.string().trim().min(1).max(40),
  minScore: z.coerce.number().int(),
  maxScore: z.coerce.number().int(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10, "Опишите результат подробнее").max(4000),
  recommendations: z.string().trim().max(4000).default(""),
  links: z.array(z.string().trim().regex(/^(library|practices|tests|programs|guides)\/[a-z0-9-]+$/, "Ссылка вида library/slug")).max(10).default([]),
});
export const testSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(600).default(""),
  intro: z.string().max(20000).default(""),
  topicId: optUuid,
  coverImage: optText,
  durationMinutes: z.coerce.number().int().min(1).max(120),
  scales: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,30}$/, "Ключ шкалы: латиница, например self"), title: z.string().trim().min(1).max(100) })).min(1, "Нужна минимум одна шкала"),
  methodNote: z.string().max(5000).default(""),
  sources: sourcesS,
  isDemo: bool,
  status: statusS,
  questions: z.array(questionS).min(1, "Добавьте хотя бы один вопрос").max(200),
  bands: z.array(bandS).min(1, "Добавьте правила результатов"),
  ...seoS,
});

export async function saveTest(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const { questions, bands, ...d } = parse(testSchema, input);
  await ensureUniqueSlug(tests, d.slug, id);
  const keys = new Set(d.scales.map((s) => s.key));
  for (const b of bands) {
    if (!keys.has(b.scaleKey)) throw new ValidationError(`Правило «${b.title}» ссылается на неизвестную шкалу «${b.scaleKey}»`);
    if (b.minScore > b.maxScore) throw new ValidationError(`Правило «${b.title}»: минимум больше максимума`);
  }
  for (const q of questions) for (const o of q.options) for (const k of Object.keys(o.scores)) if (!keys.has(k)) throw new ValidationError(`Вариант «${o.label}» начисляет баллы по неизвестной шкале «${k}»`);
  const engineQs = questions.map((q, i) => ({ id: String(i), position: i + 1, type: q.type, text: q.text, options: q.options.map((o, j) => ({ id: `${i}-${j}`, label: o.label, scores: o.scores })) }));
  const coverage = checkBandCoverage(engineQs, d.scales, bands);
  const db = getDb();
  const row = await db.transaction(async (tx) => {
    const prev = id ? (await tx.select().from(tests).where(eq(tests.id, id)))[0] : undefined;
    const values = { ...d, publishedAt: publishedAt(d.status, prev?.publishedAt), updatedAt: new Date() };
    const [t] = id ? await tx.update(tests).set(values).where(eq(tests.id, id)).returning() : await tx.insert(tests).values(values).returning();
    // Вопросы пересоздаются целиком: старые сохранённые результаты пользователей хранят свой снимок ответов.
    await tx.delete(testQuestions).where(eq(testQuestions.testId, t.id));
    await tx.delete(testResultBands).where(eq(testResultBands.testId, t.id));
    for (const [i, q] of questions.entries()) {
      const [qr] = await tx.insert(testQuestions).values({ testId: t.id, position: i + 1, type: q.type, text: q.text, hint: q.hint || null }).returning();
      await tx.insert(testOptions).values(q.options.map((o, j) => ({ questionId: qr.id, position: j + 1, label: o.label, scores: o.scores, jumpToPosition: o.jumpToPosition ?? null })));
    }
    await tx.insert(testResultBands).values(bands.map((b) => ({ ...b, testId: t.id })));
    await tx.insert(auditLog).values({ actorId: actorRef(actor), action: id ? "update" : "create", entity: "test", entityId: t.id });
    return t;
  });
  return { test: row, warnings: coverage };
}

export async function adminListTests(actor: SessionUser) {
  assertAdmin(actor);
  return getDb().select({ id: tests.id, slug: tests.slug, title: tests.title, status: tests.status, isDemo: tests.isDemo, updatedAt: tests.updatedAt }).from(tests).orderBy(desc(tests.updatedAt));
}

// ================= ПРАКТИКИ =================
export const practiceSchema = z.object({
  slug: slugSchema,
  kind: z.enum(["exercise", "journal", "reflection"]),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(600).default(""),
  body: z.string().max(100_000).default(""),
  topicId: optUuid,
  coverImage: optText,
  durationMinutes: z.coerce.number().int().min(1).max(240),
  fields: z
    .array(
      z.object({
        id: z.string().trim().regex(/^[a-z0-9_]{1,40}$/, "Код поля: латиница/цифры"),
        label: z.string().trim().min(2).max(500),
        type: z.enum(["text", "textarea", "scale"]),
        help: z.string().trim().max(500).optional(),
        min: z.coerce.number().int().optional(),
        max: z.coerce.number().int().optional(),
      }),
    )
    .max(40)
    .refine((fs) => new Set(fs.map((f) => f.id)).size === fs.length, "Коды полей должны быть уникальными"),
  sensitive: bool,
  isDemo: bool,
  status: statusS,
  ...seoS,
});
export async function savePractice(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(practiceSchema, input);
  await ensureUniqueSlug(practices, d.slug, id);
  const db = getDb();
  const prev = id ? (await db.select().from(practices).where(eq(practices.id, id)))[0] : undefined;
  const values = { ...d, publishedAt: publishedAt(d.status, prev?.publishedAt), updatedAt: new Date() };
  const [row] = id ? await db.update(practices).set(values).where(eq(practices.id, id)).returning() : await db.insert(practices).values(values).returning();
  await audit(actor, id ? "update" : "create", "practice", row.id);
  return row;
}

// ================= ПРОГРАММЫ =================
export const programSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(600).default(""),
  description: z.string().max(50_000).default(""),
  topicId: optUuid,
  coverImage: optText,
  isDemo: bool,
  status: statusS,
  ...seoS,
});
export async function saveProgram(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(programSchema, input);
  await ensureUniqueSlug(programs, d.slug, id);
  const db = getDb();
  const prev = id ? (await db.select().from(programs).where(eq(programs.id, id)))[0] : undefined;
  const values = { ...d, publishedAt: publishedAt(d.status, prev?.publishedAt), updatedAt: new Date() };
  const [row] = id ? await db.update(programs).set(values).where(eq(programs.id, id)).returning() : await db.insert(programs).values(values).returning();
  await audit(actor, id ? "update" : "create", "program", row.id);
  return row;
}

export const moduleSchema = z.object({ title: z.string().trim().min(2).max(200), description: z.string().max(5000).default(""), position: z.coerce.number().int().min(1).max(100) });
export async function saveModule(actor: SessionUser, programId: string, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(moduleSchema, input);
  const db = getDb();
  const [row] = id
    ? await db.update(programModules).set(d).where(and(eq(programModules.id, id), eq(programModules.programId, programId))).returning()
    : await db.insert(programModules).values({ ...d, programId }).returning();
  await audit(actor, id ? "update" : "create", "module", row.id);
  return row;
}
export async function deleteModule(actor: SessionUser, id: string) {
  assertAdmin(actor);
  await getDb().delete(programModules).where(eq(programModules.id, id));
  await audit(actor, "delete", "module", id);
}

export const lessonSchema = z.object({
  moduleId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(200),
  body: z.string().max(100_000).default(""),
  assignment: z.string().max(10_000).default(""),
  practiceId: optUuid,
  durationMinutes: z.coerce.number().int().min(1).max(240),
  position: z.coerce.number().int().min(1).max(200),
});
export async function saveLesson(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(lessonSchema, input);
  const db = getDb();
  const dup = await db.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.moduleId, d.moduleId), eq(lessons.slug, d.slug), id ? ne(lessons.id, id) : sql`true`));
  if (dup.length) throw new ValidationError("В этом модуле уже есть урок с таким адресом");
  const [row] = id ? await db.update(lessons).set(d).where(eq(lessons.id, id)).returning() : await db.insert(lessons).values(d).returning();
  await audit(actor, id ? "update" : "create", "lesson", row.id);
  return row;
}
export async function deleteLesson(actor: SessionUser, id: string) {
  assertAdmin(actor);
  await getDb().delete(lessons).where(eq(lessons.id, id));
  await audit(actor, "delete", "lesson", id);
}

// ================= КНИГИ =================
export const bookSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  authors: z.string().trim().min(1).max(300),
  year: z.coerce.number().int().min(1500).max(2100).optional().or(z.literal("").transform(() => undefined)),
  publisher: optText,
  isbn: optText,
  annotation: z.string().trim().max(5000).default(""),
  whyRead: z.string().trim().max(3000).default(""),
  bibliographyUrl: z.string().trim().url("Неверная ссылка").max(1000).optional().or(z.literal("")).transform((v) => v || null),
  coverImage: optText,
  topicId: optUuid,
  featured: bool,
  isDemo: bool,
  status: statusS,
});
export async function saveBook(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(bookSchema, input);
  await ensureUniqueSlug(books, d.slug, id);
  const db = getDb();
  const values = { ...d, year: d.year ?? null, updatedAt: new Date() };
  const [row] = id ? await db.update(books).set(values).where(eq(books.id, id)).returning() : await db.insert(books).values(values).returning();
  await audit(actor, id ? "update" : "create", "book", row.id);
  return row;
}

// ================= ГАЙДЫ / ПРОДУКТЫ =================
export const productSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().max(600).default(""),
  description: z.string().max(50_000).default(""),
  contents: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
  format: z.string().trim().min(1).max(100),
  author: optText,
  access: z.enum(["free", "paid"]),
  priceRub: z.coerce.number().min(0).max(1_000_000).optional().or(z.literal("").transform(() => undefined)),
  productStatus: z.enum(["coming_soon", "available", "archived"]),
  fileUrl: optText,
  externalBuyUrl: z.string().trim().max(500).optional().transform((v) => v || null).pipe(z.string().url("Ссылка для покупки должна начинаться с https://").regex(/^https:\/\//, "Только https-ссылка").nullable()),
  coverImage: optText,
  topicId: optUuid,
  isDemo: bool,
  status: statusS,
  ...seoS,
});
export async function saveProduct(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const { priceRub, ...d } = parse(productSchema, input);
  // На сайте нет оплаты: платный продукт можно открыть для продажи только со ссылкой на внешнюю площадку продавца.
  if (d.access === "paid" && d.productStatus === "available" && !d.externalBuyUrl) {
    throw new ValidationError("Чтобы открыть продажу, укажите ссылку для покупки на площадке продавца (VK, Telegram и т.п.). Оплата на самом сайте не подключена.");
  }
  await ensureUniqueSlug(products, d.slug, id);
  const db = getDb();
  const values = { ...d, priceKopecks: priceRub == null ? null : Math.round(priceRub * 100), updatedAt: new Date() };
  const [row] = id ? await db.update(products).set(values).where(eq(products.id, id)).returning() : await db.insert(products).values(values).returning();
  await audit(actor, id ? "update" : "create", "product", row.id);
  return row;
}

// ================= СТРАНИЦЫ, FAQ, НАСТРОЙКИ =================
export const pageSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)?$/, "Адрес страницы, например about или legal/privacy"),
  title: z.string().trim().min(2).max(200),
  body: z.string().max(200_000).default(""),
  needsLegalReview: bool,
  status: statusS,
  ...seoS,
});
export async function savePage(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(pageSchema, input);
  await ensureUniqueSlug(pages, d.slug, id);
  const db = getDb();
  const [row] = id ? await db.update(pages).set({ ...d, updatedAt: new Date() }).where(eq(pages.id, id)).returning() : await db.insert(pages).values(d).returning();
  await audit(actor, id ? "update" : "create", "page", row.id);
  return row;
}

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(400),
  answer: z.string().trim().min(5).max(10_000),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  status: statusS,
});
export async function saveFaq(actor: SessionUser, input: unknown, id?: string) {
  assertAdmin(actor);
  const d = parse(faqSchema, input);
  const db = getDb();
  const [row] = id ? await db.update(faqItems).set({ ...d, updatedAt: new Date() }).where(eq(faqItems.id, id)).returning() : await db.insert(faqItems).values(d).returning();
  await audit(actor, id ? "update" : "create", "faq", row.id);
  return row;
}

const settingsSchema = z.object({
  founderName: z.string().trim().max(200),
  founderRole: z.string().trim().max(200),
  founderStory: z.string().max(50_000),
  founderPhoto: z.string().trim().max(500).nullable().transform((v) => v || null),
  founderPhotoAlt: z.string().trim().max(300),
  education: z.string().trim().max(3000),
  mission: z.string().max(10_000),
  contactEmail: z.string().trim().email("Неверный e-mail").max(200).or(z.literal("")),
  socialLinks: z.array(z.object({ title: z.string().trim().min(1).max(60), url: z.string().trim().url().max(500) })).max(10),
  crisisText: z.string().trim().min(20).max(2000),
  heroTitle: z.string().trim().min(3).max(200),
  heroLead: z.string().trim().max(1000),
  heroImage: z.string().trim().max(500).nullable().transform((v) => v || null),
  sellerInfo: z.string().max(5000),
});
export async function saveSettings(actor: SessionUser, input: Partial<SiteSettings>) {
  assertAdmin(actor);
  const merged = parse(settingsSchema, { ...DEFAULT_SETTINGS, ...input });
  const db = getDb();
  for (const [key, value] of Object.entries(merged)) {
    if (value === null) {
      await db.delete(settings).where(eq(settings.key, key));
      continue;
    }
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }
  await audit(actor, "update", "settings");
  return merged;
}

// ================= МЕДИА =================
export async function listMedia(actor: SessionUser) {
  assertAdmin(actor);
  return getDb()
    .select({ id: media.id, fileName: media.fileName, originalName: media.originalName, mimeType: media.mimeType, sizeBytes: media.sizeBytes, alt: media.alt, createdAt: media.createdAt })
    .from(media)
    .orderBy(desc(media.createdAt));
}

export async function deleteMedia(actor: SessionUser, id: string) {
  assertAdmin(actor);
  await getDb().delete(media).where(eq(media.id, id));
  await audit(actor, "delete", "media", id);
}

// ================= АДМИНИСТРАТОРЫ =================
/** Аккаунты редакции. Читателей в базе нет — их данные хранятся только в их браузерах. */
export async function adminListUsers(actor: SessionUser) {
  assertAdmin(actor);
  return getDb()
    .select({ id: users.id, pseudonym: users.pseudonym, role: users.role, blocked: users.blocked, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);
}

export async function adminAddAdmin(actor: SessionUser, input: { pseudonym: string; password: string }) {
  assertAdmin(actor);
  const p = parse(z.object({ pseudonym: pseudonymSchema, password: passwordSchema }), input);
  const { user } = await createAdmin(p);
  await audit(actor, "create", "admin", user.id);
  return user;
}

export async function adminSetBlocked(actor: SessionUser, userId: string, blocked: boolean) {
  assertAdmin(actor);
  if (userId === actor.id) throw new ValidationError("Нельзя заблокировать самого себя");
  const db = getDb();
  await db.update(users).set({ blocked, updatedAt: new Date() }).where(eq(users.id, userId));
  if (blocked) await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(actor, blocked ? "block" : "unblock", "admin", userId);
}

export async function adminDeleteUser(actor: SessionUser, userId: string) {
  assertAdmin(actor);
  if (userId === actor.id) throw new ValidationError("Нельзя удалить собственный аккаунт");
  await getDb().delete(users).where(eq(users.id, userId));
  await audit(actor, "delete", "admin", userId);
}

// ================= СВОДКА =================
export async function adminDashboard(actor: SessionUser) {
  assertAdmin(actor);
  const db = getDb();
  const count = async (t: typeof articles | typeof tests | typeof practices | typeof programs | typeof books | typeof products) => {
    const r = await db.select({ all: sql<number>`count(*)::int`, pub: sql<number>`count(*) filter (where status = 'published')::int` }).from(t);
    return r[0];
  };
  const [a, t, p, pr, b, g, u, log, m] = await Promise.all([
    count(articles),
    count(tests),
    count(practices),
    count(programs),
    count(books),
    count(products),
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ action: auditLog.action, entity: auditLog.entity, createdAt: auditLog.createdAt, actor: users.pseudonym }).from(auditLog).leftJoin(users, eq(users.id, auditLog.actorId)).orderBy(desc(auditLog.createdAt)).limit(10),
    db.select({ bytes: sql<number>`coalesce(sum(size_bytes), 0)::bigint` }).from(media),
  ]);
  return { articles: a, tests: t, practices: p, programs: pr, books: b, products: g, admins: u[0]?.n ?? 0, log, mediaBytes: Number(m[0]?.bytes ?? 0) };
}

export async function adminSimpleList(actor: SessionUser, entity: "practice" | "program" | "book" | "product" | "page" | "faq") {
  assertAdmin(actor);
  const db = getDb();
  switch (entity) {
    case "practice":
      return db.select({ id: practices.id, title: practices.title, slug: practices.slug, status: practices.status, isDemo: practices.isDemo, updatedAt: practices.updatedAt }).from(practices).orderBy(desc(practices.updatedAt));
    case "program":
      return db.select({ id: programs.id, title: programs.title, slug: programs.slug, status: programs.status, isDemo: programs.isDemo, updatedAt: programs.updatedAt }).from(programs).orderBy(desc(programs.updatedAt));
    case "book":
      return db.select({ id: books.id, title: books.title, slug: books.slug, status: books.status, isDemo: books.isDemo, updatedAt: books.updatedAt }).from(books).orderBy(asc(books.title));
    case "product":
      return db.select({ id: products.id, title: products.title, slug: products.slug, status: products.status, isDemo: products.isDemo, updatedAt: products.updatedAt }).from(products).orderBy(desc(products.updatedAt));
    case "page":
      return db.select({ id: pages.id, title: pages.title, slug: pages.slug, status: pages.status, isDemo: pages.needsLegalReview, updatedAt: pages.updatedAt }).from(pages).orderBy(asc(pages.slug));
    case "faq":
      return db.select({ id: faqItems.id, title: faqItems.question, slug: sql<string>`''`, status: faqItems.status, isDemo: sql<boolean>`false`, updatedAt: faqItems.updatedAt }).from(faqItems).orderBy(asc(faqItems.sortOrder));
  }
}

export async function adminGet(actor: SessionUser, entity: "practice" | "program" | "book" | "product" | "page" | "faq" | "test" | "topic", id: string) {
  assertAdmin(actor);
  const t = { practice: practices, program: programs, book: books, product: products, page: pages, faq: faqItems, test: tests, topic: topics }[entity];
  const [row] = await getDb().select().from(t).where(eq(t.id, id));
  return row ?? null;
}

export async function adminProgramStructure(actor: SessionUser, programId: string) {
  assertAdmin(actor);
  const db = getDb();
  const mods = await db.select().from(programModules).where(eq(programModules.programId, programId)).orderBy(asc(programModules.position));
  const ls = mods.length ? await db.select().from(lessons).where(inArray(lessons.moduleId, mods.map((m) => m.id))).orderBy(asc(lessons.position)) : [];
  return mods.map((m) => ({ ...m, lessons: ls.filter((l) => l.moduleId === m.id) }));
}
