/**
 * Загрузка контента из папки content/ (Markdown и JSON).
 * Выполняется только во время сборки сайта. Каждый файл проверяется схемой:
 * если в нём ошибка (например, после правки в Pages CMS), сборка остановится
 * с понятным сообщением, в каком файле и каком поле проблема.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { readingMinutes, markdownToPlain } from "./markdown";
import type { EngineBand, EngineQuestion, EngineScale } from "./scoring";

const ROOT = path.join(process.cwd(), "content");

// ---------- общие части схем ----------
const str = z.string().trim();
const optStr = z.string().trim().optional().nullable().transform((v) => v || undefined);
const bool = (d = false) => z.boolean().optional().nullable().transform((v) => v ?? d);
const date = z.union([z.string(), z.date()]).optional().nullable().transform((v) => (v ? new Date(v) : undefined));
const num = (d: number) => z.coerce.number().optional().nullable().transform((v) => (v == null || Number.isNaN(v) ? d : v));
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sources = z
  .array(z.object({ title: str.min(1), url: optStr, note: optStr }))
  .optional()
  .nullable()
  .transform((v) => v ?? []);
const list = <T extends z.ZodTypeAny>(s: T) => z.array(s).optional().nullable().transform((v) => (v ?? []) as z.infer<T>[]);

// ---------- схемы ----------
const articleS = z.object({
  title: str.min(2),
  kind: z.enum(["article", "term", "collection"]).optional().nullable().transform((v) => v ?? "article"),
  topic: optStr,
  tags: list(str),
  excerpt: optStr.transform((v) => v ?? ""),
  author: optStr,
  updated: date,
  review: z.enum(["not_reviewed", "in_review", "reviewed"]).optional().nullable().transform((v) => v ?? "not_reviewed"),
  reviewedBy: optStr,
  sources,
  featured: bool(),
  sensitive: bool(),
  demo: bool(),
  cover: optStr,
  coverAlt: optStr,
  published: bool(true),
  date,
  seoTitle: optStr,
  seoDescription: optStr,
});

const testS = z.object({
  title: str.min(2),
  excerpt: optStr.transform((v) => v ?? ""),
  intro: optStr.transform((v) => v ?? ""),
  topic: optStr,
  duration: num(5),
  demo: bool(),
  published: bool(true),
  date,
  cover: optStr,
  methodNote: optStr.transform((v) => v ?? ""),
  /** Вид расширенного отчёта. Пусто — стандартный результат по шкалам. */
  report: z.enum(["emotional-intimacy"]).optional().nullable().transform((v) => v ?? undefined),
  sources,
  scales: z.array(z.object({ key: str.regex(/^[a-z][a-z0-9_]*$/, "ключ шкалы — латиницей"), title: str.min(1) })).min(1),
  questions: z
    .array(
      z.object({
        type: z.enum(["single", "multiple", "scale"]).optional().nullable().transform((v) => v ?? "scale"),
        text: str.min(2),
        hint: optStr,
        options: z
          .array(
            z.object({
              label: str.min(1),
              scores: list(z.object({ scale: str, points: z.coerce.number() })),
              jumpTo: z.coerce.number().int().positive().optional().nullable(),
            }),
          )
          .min(2, "у вопроса нужно минимум 2 варианта"),
      }),
    )
    .min(1),
  results: z
    .array(
      z.object({
        scale: str,
        from: z.coerce.number(),
        to: z.coerce.number(),
        title: str.min(1),
        description: str.min(1),
        recommendations: optStr.transform((v) => v ?? ""),
        links: list(str),
      }),
    )
    .min(1),
});

const practiceS = z.object({
  title: str.min(2),
  kind: z.enum(["exercise", "journal", "reflection"]).optional().nullable().transform((v) => v ?? "exercise"),
  topic: optStr,
  excerpt: optStr.transform((v) => v ?? ""),
  duration: num(10),
  sensitive: bool(),
  demo: bool(),
  published: bool(true),
  date,
  cover: optStr,
  fields: list(
    z.object({
      id: str.regex(/^[a-z0-9_]+$/, "код поля — латиницей"),
      label: str.min(1),
      type: z.enum(["text", "textarea", "scale"]).optional().nullable().transform((v) => v ?? "textarea"),
      help: optStr,
      min: z.coerce.number().optional().nullable().transform((v) => v ?? undefined),
      max: z.coerce.number().optional().nullable().transform((v) => v ?? undefined),
    }),
  ),
});

const programS = z.object({
  title: str.min(2),
  excerpt: optStr.transform((v) => v ?? ""),
  description: optStr.transform((v) => v ?? ""),
  topic: optStr,
  demo: bool(),
  published: bool(true),
  date,
  cover: optStr,
  modules: list(
    z.object({
      title: str.min(1),
      description: optStr.transform((v) => v ?? ""),
      lessons: list(
        z.object({
          slug: str.regex(slugRe, "адрес урока — латиница и дефисы"),
          title: str.min(1),
          duration: num(10),
          body: optStr.transform((v) => v ?? ""),
          assignment: optStr.transform((v) => v ?? ""),
          practice: optStr,
        }),
      ),
    }),
  ),
});

const bookS = z.object({
  title: str.min(1),
  authors: str.min(1),
  year: z.coerce.number().int().optional().nullable().transform((v) => v || undefined),
  publisher: optStr,
  isbn: optStr,
  annotation: optStr.transform((v) => v ?? ""),
  whyRead: optStr.transform((v) => v ?? ""),
  link: optStr,
  cover: optStr,
  topic: optStr,
  featured: bool(),
  demo: bool(),
  published: bool(true),
});

const guideS = z.object({
  title: str.min(2),
  excerpt: optStr.transform((v) => v ?? ""),
  contents: list(str),
  format: optStr.transform((v) => v ?? "PDF"),
  author: optStr,
  access: z.enum(["free", "paid"]).optional().nullable().transform((v) => v ?? "free"),
  price: z.coerce.number().optional().nullable().transform((v) => v ?? undefined),
  status: z.enum(["coming_soon", "available", "archived"]).optional().nullable().transform((v) => v ?? "coming_soon"),
  buyUrl: optStr,
  file: optStr,
  cover: optStr,
  topic: optStr,
  demo: bool(),
  published: bool(true),
});

const pageS = z.object({ title: str.min(1), legalTemplate: bool(), seoTitle: optStr, seoDescription: optStr });
const topicsS = z.object({ topics: z.array(z.object({ slug: str.regex(slugRe), title: str.min(1), concern: optStr, description: optStr })) });
const faqS = z.object({ items: list(z.object({ question: str.min(1), answer: str.min(1) })) });
const settingsS = z.object({
  founderName: optStr.transform((v) => v ?? ""),
  founderRole: optStr.transform((v) => v ?? "Основатель INSIDA"),
  founderStory: optStr.transform((v) => v ?? ""),
  founderPhoto: optStr,
  founderPhotoAlt: optStr.transform((v) => v ?? "Портрет основателя INSIDA"),
  education: optStr.transform((v) => v ?? ""),
  mission: optStr.transform((v) => v ?? ""),
  contactEmail: optStr,
  socialLinks: list(z.object({ title: str.min(1), url: str.url() })),
  crisisText: str.min(10),
  heroTitle: str.min(2),
  heroLead: optStr.transform((v) => v ?? ""),
  heroImage: optStr,
  sellerInfo: optStr.transform((v) => v ?? ""),
});

// ---------- чтение файлов ----------
// Поле slug внутри файла нужно редактору Pages CMS; адресом страницы всегда служит имя файла.
class ContentError extends Error {}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown, file: string): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `  • ${i.path.join(".") || "(файл)"}: ${i.message}`).join("\n");
    throw new ContentError(`Ошибка в файле content/${file}:\n${msg}`);
  }
  return r.data;
}

function filesIn(dir: string, ext: string) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(ext) && !f.startsWith("_") && !f.startsWith("."))
    .sort()
    .map((f) => ({ slug: f.slice(0, -ext.length), rel: `${dir}/${f}`, raw: fs.readFileSync(path.join(full, f), "utf8") }));
}

function checkSlug(slug: string, rel: string) {
  if (!slugRe.test(slug)) throw new ContentError(`Имя файла content/${rel} должно быть латиницей в нижнем регистре через дефис (например, moy-material.md)`);
}

function readMd<T extends z.ZodTypeAny>(dir: string, schema: T) {
  return filesIn(dir, ".md").map(({ slug, rel, raw }) => {
    checkSlug(slug, rel);
    const { data, content } = matter(raw);
    delete (data as Record<string, unknown>).slug;
    return Object.assign({ slug, body: content.trim() }, parse(schema, data, rel) as object) as { slug: string; body: string } & z.output<T>;
  });
}

function readJson<T extends z.ZodTypeAny>(dir: string, schema: T) {
  return filesIn(dir, ".json").map(({ slug, rel, raw }) => {
    checkSlug(slug, rel);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new ContentError(`Файл content/${rel} не является корректным JSON: ${(e as Error).message}`);
    }
    if (data && typeof data === "object") delete (data as Record<string, unknown>).slug;
    return Object.assign({ slug }, parse(schema, data, rel) as object) as { slug: string } & z.output<T>;
  });
}

function readFile<T extends z.ZodTypeAny>(rel: string, schema: T): z.output<T> {
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return parse(schema, JSON.parse(raw), rel);
}

const byDateDesc = <T extends { date?: Date }>(a: T, b: T) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);

// ---------- публичное API (с кэшем на время сборки) ----------
let cache: ReturnType<typeof loadAll> | null = null;
export function content() {
  if (!cache || process.env.NODE_ENV === "development") cache = loadAll();
  return cache;
}

function loadAll() {
  const settings = readFile("settings.json", settingsS);
  const topics = readFile("topics.json", topicsS).topics;
  const faq = readFile("faq.json", faqS).items;
  const topicTitle = (s?: string) => topics.find((t) => t.slug === s)?.title;

  const articles = readMd("articles", articleS)
    .filter((a) => a.published)
    .map((a) => ({ ...a, readingMinutes: readingMinutes(a.body), topicTitle: topicTitle(a.topic) }))
    .sort(byDateDesc);
  const tests = readJson("tests", testS)
    .filter((t) => t.published)
    .map((t) => ({ ...t, topicTitle: topicTitle(t.topic), engine: toEngine(t) }))
    .sort(byDateDesc);
  const practices = readMd("practices", practiceS).filter((p) => p.published).map((p) => ({ ...p, topicTitle: topicTitle(p.topic) })).sort(byDateDesc);
  const programs = readJson("programs", programS)
    .filter((p) => p.published)
    .map((p) => ({ ...p, topicTitle: topicTitle(p.topic), lessons: p.modules.flatMap((m) => m.lessons) }))
    .sort(byDateDesc);
  const books = readJson("books", bookS).filter((b) => b.published).sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title, "ru"));
  const guides = readMd("guides", guideS).filter((g) => g.published && g.status !== "archived");
  const pages = readMd("pages", pageS);

  // Проверка ссылок между файлами — чтобы опечатки не превращались в «битые» страницы.
  const problems: string[] = [];
  const topicSlugs = new Set(topics.map((t) => t.slug));
  for (const [kind, items] of [["articles", articles], ["tests", tests], ["practices", practices], ["programs", programs], ["books", books], ["guides", guides]] as const) {
    for (const it of items as { slug: string; topic?: string }[]) {
      if (it.topic && !topicSlugs.has(it.topic)) problems.push(`content/${kind}/${it.slug}: тема «${it.topic}» не найдена в topics.json`);
    }
  }
  for (const p of programs) {
    const seen = new Set<string>();
    for (const l of p.lessons) {
      if (seen.has(l.slug)) problems.push(`content/programs/${p.slug}: повторяется адрес урока «${l.slug}»`);
      seen.add(l.slug);
      if (l.practice && !practices.some((x) => x.slug === l.practice)) problems.push(`content/programs/${p.slug}: урок «${l.title}» ссылается на несуществующую практику «${l.practice}»`);
    }
  }
  for (const t of tests) {
    const keys = new Set(t.scales.map((s) => s.key));
    for (const r of t.results) if (!keys.has(r.scale)) problems.push(`content/tests/${t.slug}: правило «${r.title}» ссылается на неизвестную шкалу «${r.scale}»`);
    t.questions.forEach((q, i) => q.options.forEach((o) => o.scores.forEach((s) => { if (!keys.has(s.scale)) problems.push(`content/tests/${t.slug}: вопрос ${i + 1}, вариант «${o.label}» — неизвестная шкала «${s.scale}»`); })));
  }
  if (problems.length) throw new ContentError("Проблемы в контенте:\n" + problems.map((p) => "  • " + p).join("\n"));

  return { settings, topics, faq, articles, tests, practices, programs, books, guides, pages, topicTitle };
}

/** Тест в формате движка подсчёта (src/lib/scoring.ts). */
function toEngine(t: z.output<typeof testS>): { questions: EngineQuestion[]; scales: EngineScale[]; bands: EngineBand[] } {
  return {
    scales: t.scales,
    questions: t.questions.map((q, i) => ({
      id: `q${i + 1}`,
      position: i + 1,
      type: q.type,
      text: q.text,
      options: q.options.map((o, j) => ({
        id: `q${i + 1}o${j + 1}`,
        label: o.label,
        scores: Object.fromEntries(o.scores.map((s) => [s.scale, s.points])),
        jumpToPosition: o.jumpTo ?? null,
      })),
    })),
    bands: t.results.map((r) => ({ scaleKey: r.scale, minScore: r.from, maxScore: r.to, title: r.title, description: r.description, recommendations: r.recommendations, links: r.links })),
  };
}

export type Content = ReturnType<typeof loadAll>;
export type Article = Content["articles"][number];
export type Test = Content["tests"][number];
export type Practice = Content["practices"][number];
export type Program = Content["programs"][number];
export type Book = Content["books"][number];
export type Guide = Content["guides"][number];
export type Settings = Content["settings"];

export type ArticleCard = Pick<Article, "slug" | "kind" | "title" | "excerpt" | "cover" | "coverAlt" | "readingMinutes" | "demo" | "topic" | "topicTitle" | "tags">;
export const toCard = (a: Article): ArticleCard => ({
  slug: a.slug, kind: a.kind, title: a.title, excerpt: a.excerpt, cover: a.cover, coverAlt: a.coverAlt,
  readingMinutes: a.readingMinutes, demo: a.demo, topic: a.topic, topicTitle: a.topicTitle, tags: a.tags,
});

/** Связанные материалы: общие теги весят больше, чем общая тема. */
export function relatedArticles(a: Article, limit = 3) {
  return content()
    .articles.filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, score: x.tags.filter((t) => a.tags.includes(t)).length * 2 + (x.topic && x.topic === a.topic ? 1 : 0) }))
    .sort((p, q) => q.score - p.score)
    .slice(0, limit)
    .map((p) => p.x);
}

/** Заголовки для ссылок вида "library/slug" в рекомендациях тестов. */
export function linkTitles(links: string[]): Record<string, string> {
  const c = content();
  const out: Record<string, string> = {};
  for (const l of links) {
    const [sec, slug] = l.split("/");
    const list: { slug: string; title: string }[] =
      sec === "library" ? c.articles : sec === "practices" ? c.practices : sec === "tests" ? c.tests : sec === "programs" ? c.programs : sec === "guides" ? c.guides : [];
    const hit = list.find((x) => x.slug === slug);
    if (hit) out[l] = hit.title;
  }
  return out;
}

export function getPage(name: string) {
  return content().pages.find((p) => p.slug === name) ?? null;
}

/** Данные для поиска в браузере (строится при сборке). */
export function searchDocuments() {
  const c = content();
  const doc = (type: string, url: string, title: string, excerpt: string, text: string, tags: string[] = []) => ({
    type, url, title, excerpt, tags, text: markdownToPlain(text).slice(0, 4000),
  });
  return [
    ...c.articles.map((a) => doc("article", `/library/${a.slug}`, a.title, a.excerpt, a.body, [...a.tags, a.topicTitle ?? ""])),
    ...c.tests.map((t) => doc("test", `/tests/${t.slug}`, t.title, t.excerpt, t.intro, [t.topicTitle ?? ""])),
    ...c.practices.map((p) => doc("practice", `/practices/${p.slug}`, p.title, p.excerpt, p.body, [p.topicTitle ?? ""])),
    ...c.programs.map((p) => doc("program", `/programs/${p.slug}`, p.title, p.excerpt, p.description, [p.topicTitle ?? ""])),
    ...c.books.map((b) => doc("book", `/books#${b.slug}`, `${b.title} — ${b.authors}`, b.annotation.slice(0, 200), b.annotation + " " + b.whyRead)),
    ...c.guides.map((g) => doc("guide", `/guides/${g.slug}`, g.title, g.excerpt, g.body)),
  ];
}
