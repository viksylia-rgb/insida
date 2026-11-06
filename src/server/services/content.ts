/** Публичные запросы к контенту: только опубликованные материалы. */
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "../db";
import {
  articles,
  articleTags,
  books,
  faqItems,
  lessons,
  pages,
  practices,
  products,
  programModules,
  programs,
  settings,
  tags,
  testOptions,
  testQuestions,
  testResultBands,
  tests,
  topics,
} from "../schema";

const pub = (col: AnyPgColumn) => eq(col, "published");

// ---------- Таксономия ----------
export async function listTopics() {
  return getDb().select().from(topics).orderBy(asc(topics.sortOrder), asc(topics.title));
}

export async function getTopic(slug: string) {
  const [t] = await getDb().select().from(topics).where(eq(topics.slug, slug)).limit(1);
  return t ?? null;
}

export async function listTags() {
  return getDb().select().from(tags).orderBy(asc(tags.title));
}

// ---------- Статьи ----------
export type ArticleFilter = {
  topic?: string;
  tag?: string;
  kind?: "article" | "term" | "collection";
  q?: string;
  sort?: "new" | "relevance";
  limit?: number;
  offset?: number;
};

const articleCard = {
  id: articles.id,
  slug: articles.slug,
  kind: articles.kind,
  title: articles.title,
  excerpt: articles.excerpt,
  coverImage: articles.coverImage,
  coverAlt: articles.coverAlt,
  readingMinutes: articles.readingMinutes,
  publishedAt: articles.publishedAt,
  isDemo: articles.isDemo,
  topicTitle: topics.title,
  topicSlug: topics.slug,
};
export type ArticleCard = {
  id: string;
  slug: string;
  kind: "article" | "term" | "collection";
  title: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt: string | null;
  readingMinutes: number;
  publishedAt: Date | null;
  isDemo: boolean;
  topicTitle: string | null;
  topicSlug: string | null;
};

export async function listArticles(f: ArticleFilter = {}) {
  const db = getDb();
  const conds: SQL[] = [pub(articles.status)];
  if (f.kind) conds.push(eq(articles.kind, f.kind));
  if (f.topic) conds.push(eq(topics.slug, f.topic));
  if (f.tag) {
    conds.push(
      inArray(
        articles.id,
        db.select({ id: articleTags.articleId }).from(articleTags).innerJoin(tags, eq(tags.id, articleTags.tagId)).where(eq(tags.slug, f.tag)),
      ),
    );
  }
  let rank: SQL | undefined;
  if (f.q && f.q.trim()) {
    const q = f.q.trim();
    const tsq = tsQuery(q);
    conds.push(or(sql`${articles.searchVector} @@ ${tsq}`, ilike(articles.title, `%${escapeLike(q)}%`))!);
    rank = sql`ts_rank(${articles.searchVector}, ${tsq})`;
  }
  const where = and(...conds);
  const order = rank && f.sort !== "new" ? [desc(rank), desc(articles.publishedAt)] : [desc(articles.publishedAt)];
  const [rows, total] = await Promise.all([
    db
      .select(articleCard)
      .from(articles)
      .leftJoin(topics, eq(topics.id, articles.topicId))
      .where(where)
      .orderBy(...order)
      .limit(f.limit ?? 12)
      .offset(f.offset ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(articles)
      .leftJoin(topics, eq(topics.id, articles.topicId))
      .where(where),
  ]);
  return { items: rows as ArticleCard[], total: total[0]?.n ?? 0 };
}

export async function featuredArticles(limit = 4) {
  return (await getDb()
    .select(articleCard)
    .from(articles)
    .leftJoin(topics, eq(topics.id, articles.topicId))
    .where(and(pub(articles.status), eq(articles.featured, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)) as ArticleCard[];
}

export async function getArticle(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const db = getDb();
  const conds = [eq(articles.slug, slug)];
  if (!opts.includeDrafts) conds.push(pub(articles.status));
  const [row] = await db
    .select({ article: articles, topic: topics })
    .from(articles)
    .leftJoin(topics, eq(topics.id, articles.topicId))
    .where(and(...conds))
    .limit(1);
  if (!row) return null;
  const tagRows = await db
    .select({ slug: tags.slug, title: tags.title, id: tags.id })
    .from(articleTags)
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .where(eq(articleTags.articleId, row.article.id));
  return { ...row.article, topic: row.topic, tags: tagRows };
}

/** Связанные материалы: общие теги и тема, затем свежие по теме. */
export async function relatedArticles(articleId: string, topicId: string | null, tagIds: string[], limit = 3) {
  const db = getDb();
  const score = sql<number>`(
    (select count(*) from ${articleTags} at2 where at2.article_id = ${articles.id} and at2.tag_id in (${tagIds.length ? sql.join(tagIds.map((t) => sql`${t}::uuid`), sql`, `) : sql`null`})) * 2
    + case when ${articles.topicId} = ${topicId}::uuid then 1 else 0 end
  )`;
  return (await db
    .select(articleCard)
    .from(articles)
    .leftJoin(topics, eq(topics.id, articles.topicId))
    .where(and(pub(articles.status), ne(articles.id, articleId)))
    .orderBy(desc(score), desc(articles.publishedAt))
    .limit(limit)) as ArticleCard[];
}

// ---------- Тесты ----------
export async function listTests(f: { topic?: string } = {}) {
  const conds: SQL[] = [pub(tests.status)];
  if (f.topic) conds.push(eq(topics.slug, f.topic));
  return getDb()
    .select({
      id: tests.id,
      slug: tests.slug,
      title: tests.title,
      excerpt: tests.excerpt,
      durationMinutes: tests.durationMinutes,
      coverImage: tests.coverImage,
      isDemo: tests.isDemo,
      topicTitle: topics.title,
      topicSlug: topics.slug,
      questionCount: sql<number>`(select count(*)::int from ${testQuestions} where ${testQuestions.testId} = ${tests.id})`,
    })
    .from(tests)
    .leftJoin(topics, eq(topics.id, tests.topicId))
    .where(and(...conds))
    .orderBy(desc(tests.publishedAt));
}

export async function getTestFull(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const db = getDb();
  const conds = [eq(tests.slug, slug)];
  if (!opts.includeDrafts) conds.push(pub(tests.status));
  const [row] = await db.select({ test: tests, topic: topics }).from(tests).leftJoin(topics, eq(topics.id, tests.topicId)).where(and(...conds)).limit(1);
  if (!row) return null;
  return { ...row.test, topic: row.topic, ...(await loadTestStructure(row.test.id)) };
}

export async function loadTestStructure(testId: string) {
  const db = getDb();
  const qs = await db.select().from(testQuestions).where(eq(testQuestions.testId, testId)).orderBy(asc(testQuestions.position));
  const opts = qs.length
    ? await db.select().from(testOptions).where(inArray(testOptions.questionId, qs.map((q) => q.id))).orderBy(asc(testOptions.position))
    : [];
  const bands = await db.select().from(testResultBands).where(eq(testResultBands.testId, testId)).orderBy(asc(testResultBands.scaleKey), asc(testResultBands.minScore));
  return {
    questions: qs.map((q) => ({ ...q, options: opts.filter((o) => o.questionId === q.id) })),
    bands,
  };
}

// ---------- Практики ----------
export async function listPractices(f: { topic?: string; kind?: "exercise" | "journal" | "reflection" } = {}) {
  const conds: SQL[] = [pub(practices.status)];
  if (f.topic) conds.push(eq(topics.slug, f.topic));
  if (f.kind) conds.push(eq(practices.kind, f.kind));
  return getDb()
    .select({
      id: practices.id,
      slug: practices.slug,
      kind: practices.kind,
      title: practices.title,
      excerpt: practices.excerpt,
      durationMinutes: practices.durationMinutes,
      coverImage: practices.coverImage,
      isDemo: practices.isDemo,
      topicTitle: topics.title,
      topicSlug: topics.slug,
    })
    .from(practices)
    .leftJoin(topics, eq(topics.id, practices.topicId))
    .where(and(...conds))
    .orderBy(desc(practices.publishedAt));
}

export async function getPractice(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const conds = [eq(practices.slug, slug)];
  if (!opts.includeDrafts) conds.push(pub(practices.status));
  const [row] = await getDb()
    .select({ practice: practices, topic: topics })
    .from(practices)
    .leftJoin(topics, eq(topics.id, practices.topicId))
    .where(and(...conds))
    .limit(1);
  return row ? { ...row.practice, topic: row.topic } : null;
}

// ---------- Программы ----------
export async function listPrograms() {
  return getDb()
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.title,
      excerpt: programs.excerpt,
      coverImage: programs.coverImage,
      isDemo: programs.isDemo,
      topicTitle: topics.title,
      lessonCount: sql<number>`(select count(*)::int from ${lessons} l join ${programModules} m on m.id = l.module_id where m.program_id = ${programs.id})`,
    })
    .from(programs)
    .leftJoin(topics, eq(topics.id, programs.topicId))
    .where(pub(programs.status))
    .orderBy(desc(programs.publishedAt));
}

export async function getProgramFull(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const db = getDb();
  const conds = [eq(programs.slug, slug)];
  if (!opts.includeDrafts) conds.push(pub(programs.status));
  const [p] = await db.select().from(programs).where(and(...conds)).limit(1);
  if (!p) return null;
  const mods = await db.select().from(programModules).where(eq(programModules.programId, p.id)).orderBy(asc(programModules.position));
  const ls = mods.length
    ? await db
        .select({ id: lessons.id, moduleId: lessons.moduleId, position: lessons.position, slug: lessons.slug, title: lessons.title, durationMinutes: lessons.durationMinutes })
        .from(lessons)
        .where(inArray(lessons.moduleId, mods.map((m) => m.id)))
        .orderBy(asc(lessons.position))
    : [];
  const modules = mods.map((m) => ({ ...m, lessons: ls.filter((l) => l.moduleId === m.id) }));
  return { ...p, modules, flatLessons: modules.flatMap((m) => m.lessons) };
}

export async function getLesson(programId: string, lessonSlug: string) {
  const [row] = await getDb()
    .select({ lesson: lessons, practiceSlug: practices.slug, practiceTitle: practices.title })
    .from(lessons)
    .innerJoin(programModules, eq(programModules.id, lessons.moduleId))
    .leftJoin(practices, eq(practices.id, lessons.practiceId))
    .where(and(eq(programModules.programId, programId), eq(lessons.slug, lessonSlug)))
    .limit(1);
  return row ? { ...row.lesson, practiceSlug: row.practiceSlug, practiceTitle: row.practiceTitle } : null;
}

// ---------- Книги ----------
export async function listBooks(f: { topic?: string; featuredOnly?: boolean; limit?: number } = {}) {
  const conds: SQL[] = [pub(books.status)];
  if (f.topic) conds.push(eq(topics.slug, f.topic));
  if (f.featuredOnly) conds.push(eq(books.featured, true));
  return getDb()
    .select({ book: books, topicTitle: topics.title, topicSlug: topics.slug })
    .from(books)
    .leftJoin(topics, eq(topics.id, books.topicId))
    .where(and(...conds))
    .orderBy(desc(books.featured), asc(books.title))
    .limit(f.limit ?? 100);
}

// ---------- Гайды и продукты ----------
export async function listProducts(access?: "free" | "paid") {
  const conds: SQL[] = [pub(products.status), ne(products.productStatus, "archived")];
  if (access) conds.push(eq(products.access, access));
  return getDb().select().from(products).where(and(...conds)).orderBy(asc(products.access), desc(products.createdAt));
}

export async function getProduct(slug: string) {
  const [p] = await getDb().select().from(products).where(and(eq(products.slug, slug), pub(products.status))).limit(1);
  return p ?? null;
}

// ---------- Страницы, FAQ, настройки ----------
export async function getPage(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const conds = [eq(pages.slug, slug)];
  if (!opts.includeDrafts) conds.push(pub(pages.status));
  const [p] = await getDb().select().from(pages).where(and(...conds)).limit(1);
  return p ?? null;
}

export async function listFaq() {
  return getDb().select().from(faqItems).where(eq(faqItems.status, "published")).orderBy(asc(faqItems.sortOrder));
}

export type SiteSettings = {
  founderName: string;
  founderRole: string;
  founderStory: string;
  founderPhoto: string | null;
  founderPhotoAlt: string;
  education: string;
  mission: string;
  contactEmail: string;
  socialLinks: { title: string; url: string }[];
  crisisText: string;
  heroTitle: string;
  heroLead: string;
  heroImage: string | null;
  sellerInfo: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  founderName: "Виктория Евгеньевна Локеева",
  founderRole: "Основатель и автор INSIDA",
  founderStory: "Долгое время мне было сложно слышать себя. Снаружи всё выглядело благополучно — учёба, работа, люди рядом, — а внутри часто было шумно: тревога, сомнения, ощущение, что я живу по чужим ожиданиям и не до конца понимаю, чего хочу на самом деле. Я умела договариваться с другими, но не с собой.\n\nПоворотным стало простое решение — перестать спорить со своими чувствами и начать в них разбираться. Я читала книги и исследования, вела дневник, училась задавать себе неудобные вопросы и не пугаться ответов. По первому образованию я юрист — наверное, поэтому мне так важно опираться на проверенные знания, а не на красивые обещания. Позже я прошла профессиональную переподготовку по социальной психологии: захотелось понимать не только себя, но и то, как устроены отношения между людьми.\n\nБаланс пришёл не сразу — и это не точка, которой достигаешь однажды и навсегда. Скорее навык, к которому можно возвращаться: замечать, что со мной происходит, бережно с этим обходиться и выбирать то, что действительно моё.\n\nINSIDA выросла из этого пути. Мне хотелось создать место, где о психологии говорят спокойно и честно, без ярлыков и давления, — и где у каждого есть возможность выстроить свой диалог с внутренним миром.",
  founderPhoto: "/images/founder.jpg",
  founderPhotoAlt: "Виктория Локеева, основатель INSIDA",
  education:
    "Высшее юридическое образование; профессиональная переподготовка по программе «Социальная психология», Новосибирский государственный университет, 504 академических часа (по предоставленным сведениям).",
  mission: "INSIDA — пространство для понимания себя. Наша миссия — помочь выстроить бережный и честный диалог с собственным внутренним миром: через понятные знания из психологии, вопросы для размышления и практики, к которым можно возвращаться в своём темпе.",
  contactEmail: "",
  socialLinks: [],
  crisisText:
    "Если вам сейчас очень тяжело или есть мысли причинить себе вред, пожалуйста, не оставайтесь с этим в одиночку: обратитесь к специалисту или позвоните по номеру 112 — единой службе экстренной помощи.",
  heroTitle: "Понимать себя — без спешки и громких обещаний",
  heroLead:
    "INSIDA — журнал о психологии и самопознании. Научно обоснованные идеи простым языком, вопросы для размышления и практики, которые можно пройти в своём темпе.",
  heroImage: "/images/founder.jpg",
  sellerInfo: "",
};

export async function getSettings(): Promise<SiteSettings> {
  const rows = await getDb().select().from(settings);
  const obj: Record<string, unknown> = {};
  for (const r of rows) obj[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(obj as Partial<SiteSettings>) };
}

// ---------- Поиск по всему сайту ----------
export type SearchHit = { type: "article" | "test" | "practice" | "program" | "book"; slug: string; title: string; excerpt: string; rank: number; url: string };

/**
 * Запасной префиксный запрос: русский стеммер даёт разные основы для «тревога» (тревог)
 * и «тревожности» (тревожн), поэтому дополнительно ищем по первым 5 буквам каждого слова.
 */
export function prefixQuery(q: string): string {
  const words = q.toLowerCase().replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? [];
  return words
    .filter((w) => w.length >= 3)
    .slice(0, 6)
    .map((w) => `${w.length > 5 ? w.slice(0, 5) : w}:*`)
    .join(" & ");
}

/** Полнотекстовый запрос: точный (с морфологией) ИЛИ префиксный. */
export function tsQuery(q: string) {
  const pq = prefixQuery(q);
  return pq ? sql`(websearch_to_tsquery('russian', ${q}) || to_tsquery('simple', ${pq}))` : sql`websearch_to_tsquery('russian', ${q})`;
}

export function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * «Умный» поиск без внешних сервисов: полнотекстовый поиск PostgreSQL с русской морфологией
 * (ищет «тревожность» по запросу «тревога»), ранжирование по весам заголовка/описания/текста,
 * совпадение по тегам и запасной поиск по подстроке в заголовке.
 */
export async function searchAll(q: string, limit = 30): Promise<SearchHit[]> {
  const query = q.trim().slice(0, 120);
  if (query.length < 2) return [];
  const like = `%${escapeLike(query)}%`;
  const res = await getDb().execute<SearchHit>(sql`
    with q as (select ${tsQuery(query)} as tsq)
    select * from (
      select 'article' as type, a.slug, a.title, a.excerpt,
        ts_rank(a.search_vector, q.tsq) * 1.2
        + case when a.title ilike ${like} then 0.5 else 0 end
        + coalesce((select 0.4 from article_tags at join tags t on t.id = at.tag_id where at.article_id = a.id and (t.title ilike ${like}) limit 1), 0) as rank
      from articles a, q
      where a.status = 'published' and (a.search_vector @@ q.tsq or a.title ilike ${like}
        or exists (select 1 from article_tags at join tags t on t.id = at.tag_id where at.article_id = a.id and t.title ilike ${like}))
      union all
      select 'test', t.slug, t.title, t.excerpt, ts_rank(t.search_vector, q.tsq) + case when t.title ilike ${like} then 0.5 else 0 end
      from tests t, q where t.status = 'published' and (t.search_vector @@ q.tsq or t.title ilike ${like})
      union all
      select 'practice', p.slug, p.title, p.excerpt, ts_rank(p.search_vector, q.tsq) + case when p.title ilike ${like} then 0.5 else 0 end
      from practices p, q where p.status = 'published' and (p.search_vector @@ q.tsq or p.title ilike ${like})
      union all
      select 'program', p.slug, p.title, p.excerpt, ts_rank(p.search_vector, q.tsq) + case when p.title ilike ${like} then 0.5 else 0 end
      from programs p, q where p.status = 'published' and (p.search_vector @@ q.tsq or p.title ilike ${like})
      union all
      select 'book', b.slug, b.title || ' — ' || b.authors, left(b.annotation, 200), ts_rank(b.search_vector, q.tsq) * 0.8 + case when b.title ilike ${like} then 0.4 else 0 end
      from books b, q where b.status = 'published' and (b.search_vector @@ q.tsq or b.title ilike ${like} or b.authors ilike ${like})
    ) s order by rank desc limit ${limit}`);
  const base = { article: "/library/", test: "/tests/", practice: "/practices/", program: "/programs/", book: "/books#" } as const;
  return res.rows.map((r) => ({ ...r, rank: Number(r.rank), url: base[r.type] + r.slug }));
}

/** Все материалы темы — для страницы /topics/[slug]. */
export async function topicContent(topicId: string) {
  const db = getDb();
  const [arts, ts, ps, bs] = await Promise.all([
    db.select(articleCard).from(articles).leftJoin(topics, eq(topics.id, articles.topicId)).where(and(pub(articles.status), eq(articles.topicId, topicId))).orderBy(desc(articles.publishedAt)),
    db.select({ slug: tests.slug, title: tests.title, excerpt: tests.excerpt, durationMinutes: tests.durationMinutes, isDemo: tests.isDemo }).from(tests).where(and(pub(tests.status), eq(tests.topicId, topicId))),
    db.select({ slug: practices.slug, title: practices.title, excerpt: practices.excerpt, durationMinutes: practices.durationMinutes, kind: practices.kind, isDemo: practices.isDemo }).from(practices).where(and(pub(practices.status), eq(practices.topicId, topicId))),
    db.select().from(books).where(and(pub(books.status), eq(books.topicId, topicId))),
  ]);
  return { articles: arts as ArticleCard[], tests: ts, practices: ps, books: bs };
}

/** Метаданные для sitemap.xml */
export async function sitemapEntries() {
  const db = getDb();
  const [a, t, p, pr, pg, top] = await Promise.all([
    db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles).where(pub(articles.status)),
    db.select({ slug: tests.slug, updatedAt: tests.updatedAt }).from(tests).where(pub(tests.status)),
    db.select({ slug: practices.slug, updatedAt: practices.updatedAt }).from(practices).where(pub(practices.status)),
    db.select({ slug: programs.slug, updatedAt: programs.updatedAt }).from(programs).where(pub(programs.status)),
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(pub(pages.status)),
    db.select({ slug: topics.slug, updatedAt: topics.updatedAt }).from(topics),
  ]);
  return { articles: a, tests: t, practices: p, programs: pr, pages: pg, topics: top };
}

/** Заголовки материалов для ссылок вида "library/slug" в рекомендациях тестов. */
export async function resolveLinkTitles(links: string[]): Promise<Record<string, string>> {
  const db = getDb();
  const out: Record<string, string> = {};
  const by = (sec: string) => [...new Set(links.filter((l) => l.startsWith(sec + "/")).map((l) => l.split("/")[1]))];
  const tables = { library: articles, practices, tests, programs, guides: products } as const;
  await Promise.all(
    Object.entries(tables).map(async ([sec, t]) => {
      const slugs = by(sec);
      if (!slugs.length) return;
      const rows = await db.select({ slug: t.slug, title: t.title }).from(t).where(and(inArray(t.slug, slugs), eq(t.status, "published")));
      for (const r of rows) out[`${sec}/${r.slug}`] = r.title;
    }),
  );
  return out;
}
