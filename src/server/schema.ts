/**
 * Схема базы данных INSIDA (Drizzle ORM, PostgreSQL).
 *
 * Принципы:
 *  - сайт НЕ хранит данные читателей: избранное, результаты тестов, ответы практик и прогресс
 *    живут только в браузере пользователя (см. src/lib/local-store.ts);
 *  - в таблице users — только аккаунты редакции (администраторы), без e-mail и настоящих имён;
 *  - контент имеет статус «черновик/опубликовано», пометку демо и редакторские поля;
 *  - файлы (изображения, PDF) хранятся в таблице media, т.к. у бесплатных хостингов нет постоянного диска.
 */
import { sql, type SQL } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// ---------- Перечисления ----------
export const roleEnum = pgEnum("role", ["admin"]);
export const statusEnum = pgEnum("content_status", ["draft", "published"]);
export const articleKindEnum = pgEnum("article_kind", ["article", "term", "collection"]);
export const reviewEnum = pgEnum("review_status", ["not_reviewed", "in_review", "reviewed"]);
export const productStatusEnum = pgEnum("product_status", ["coming_soon", "available", "archived"]);
export const guideAccessEnum = pgEnum("guide_access", ["free", "paid"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "cancelled", "refunded"]);

// Общие поля контента
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
const seo = {
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogImage: text("og_image"),
};

export type Source = { title: string; url?: string; note?: string };

// ---------- Пользователи и безопасность ----------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pseudonym: text("pseudonym").notNull(),
    pseudonymLower: text("pseudonym_lower").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("admin"),
    blocked: boolean("blocked").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_pseudonym_lower_idx").on(t.pseudonymLower)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 от токена сессии; сам токен хранится только в cookie пользователя */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** HMAC-SHA256 от кода (код одноразовый, 60 бит энтропии) */
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recovery_user_idx").on(t.userId), uniqueIndex("recovery_hash_idx").on(t.codeHash)],
);

/** Ограничение частоты запросов. Ключ содержит HMAC от IP, а не сам IP. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

// ---------- Таксономия ----------
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** короткая формулировка для блока «Что тебя сейчас волнует?» */
    concern: text("concern"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("topics_slug_idx").on(t.slug)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

// ---------- Библиотека ----------
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    kind: articleKindEnum("kind").notNull().default("article"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    coverImage: text("cover_image"),
    coverAlt: text("cover_alt"),
    author: text("author"),
    sources: jsonb("sources").$type<Source[]>().notNull().default([]),
    reviewStatus: reviewEnum("review_status").notNull().default("not_reviewed"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    contentUpdatedAt: timestamp("content_updated_at", { withTimezone: true }),
    readingMinutes: integer("reading_minutes").notNull().default(5),
    /** показывать мягкую рекомендацию обратиться за помощью */
    sensitive: boolean("sensitive").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...seo,
    ...timestamps,
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('russian', coalesce(${articles.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${articles.excerpt}, '')), 'B') || setweight(to_tsvector('russian', coalesce(${articles.body}, '')), 'C')`,
    ),
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.slug),
    index("articles_status_idx").on(t.status, t.publishedAt),
    index("articles_search_idx").using("gin", t.searchVector),
  ],
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })],
);

// ---------- Тесты (опросники) ----------
export type ScaleDef = { key: string; title: string };
export const tests = pgTable(
  "tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    intro: text("intro").notNull().default(""),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    coverImage: text("cover_image"),
    durationMinutes: integer("duration_minutes").notNull().default(5),
    /** шкалы, по которым считаются баллы, например [{key:"self", title:"Самокритика"}] */
    scales: jsonb("scales").$type<ScaleDef[]>().notNull().default([]),
    methodNote: text("method_note").notNull().default(""),
    sources: jsonb("sources").$type<Source[]>().notNull().default([]),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...seo,
    ...timestamps,
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('russian', coalesce(${tests.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${tests.excerpt}, '')), 'B') || setweight(to_tsvector('russian', coalesce(${tests.intro}, '')), 'C')`,
    ),
  },
  (t) => [uniqueIndex("tests_slug_idx").on(t.slug), index("tests_search_idx").using("gin", t.searchVector)],
);

export const questionTypeEnum = pgEnum("question_type", ["single", "multiple", "scale"]);

export const testQuestions = pgTable(
  "test_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: questionTypeEnum("type").notNull().default("single"),
    text: text("text").notNull(),
    hint: text("hint"),
  },
  (t) => [index("questions_test_idx").on(t.testId, t.position)],
);

export const testOptions = pgTable(
  "test_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => testQuestions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    /** баллы по шкалам: {"self": 2, "care": 0} */
    scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}),
    /** ветвление: перейти к вопросу с этой позицией (необязательно) */
    jumpToPosition: integer("jump_to_position"),
  },
  (t) => [index("options_question_idx").on(t.questionId, t.position)],
);

export const testResultBands = pgTable(
  "test_result_bands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    scaleKey: text("scale_key").notNull(),
    minScore: integer("min_score").notNull(),
    maxScore: integer("max_score").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    recommendations: text("recommendations").notNull().default(""),
    /** slug-и материалов для рекомендаций: "library/slug", "practices/slug" */
    links: jsonb("links").$type<string[]>().notNull().default([]),
  },
  (t) => [index("bands_test_idx").on(t.testId, t.scaleKey)],
);

// ---------- Практики ----------
export type PracticeField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "scale";
  help?: string;
  min?: number;
  max?: number;
};
export const practiceKindEnum = pgEnum("practice_kind", ["exercise", "journal", "reflection"]);

export const practices = pgTable(
  "practices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    kind: practiceKindEnum("kind").notNull().default("exercise"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    coverImage: text("cover_image"),
    durationMinutes: integer("duration_minutes").notNull().default(10),
    fields: jsonb("fields").$type<PracticeField[]>().notNull().default([]),
    sensitive: boolean("sensitive").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...seo,
    ...timestamps,
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('russian', coalesce(${practices.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${practices.excerpt}, '')), 'B') || setweight(to_tsvector('russian', coalesce(${practices.body}, '')), 'C')`,
    ),
  },
  (t) => [uniqueIndex("practices_slug_idx").on(t.slug), index("practices_search_idx").using("gin", t.searchVector)],
);

// ---------- Программы самостоятельного изучения ----------
export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    description: text("description").notNull().default(""),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    coverImage: text("cover_image"),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...seo,
    ...timestamps,
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('russian', coalesce(${programs.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${programs.excerpt}, '')), 'B') || setweight(to_tsvector('russian', coalesce(${programs.description}, '')), 'C')`,
    ),
  },
  (t) => [uniqueIndex("programs_slug_idx").on(t.slug), index("programs_search_idx").using("gin", t.searchVector)],
);

export const programModules = pgTable(
  "program_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [index("modules_program_idx").on(t.programId, t.position)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => programModules.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** задание для самостоятельной работы */
    assignment: text("assignment").notNull().default(""),
    practiceId: uuid("practice_id").references(() => practices.id, { onDelete: "set null" }),
    durationMinutes: integer("duration_minutes").notNull().default(10),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId, t.position), uniqueIndex("lessons_module_slug_idx").on(t.moduleId, t.slug)],
);

// ---------- Книжная полка ----------
export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    authors: text("authors").notNull(),
    year: integer("year"),
    publisher: text("publisher"),
    isbn: text("isbn"),
    /** собственная аннотация редакции — не текст книги и не издательская аннотация */
    annotation: text("annotation").notNull().default(""),
    whyRead: text("why_read").notNull().default(""),
    bibliographyUrl: text("bibliography_url"),
    coverImage: text("cover_image"),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    ...timestamps,
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('russian', coalesce(${books.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${books.authors}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${books.annotation}, '')), 'B')`,
    ),
  },
  (t) => [uniqueIndex("books_slug_idx").on(t.slug), index("books_search_idx").using("gin", t.searchVector)],
);

// ---------- Гайды и продукты ----------
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    description: text("description").notNull().default(""),
    /** состав: список пунктов */
    contents: jsonb("contents").$type<string[]>().notNull().default([]),
    format: text("format").notNull().default("PDF"),
    author: text("author"),
    access: guideAccessEnum("access").notNull().default("free"),
    /** цена в копейках; null — не указана */
    priceKopecks: integer("price_kopecks"),
    productStatus: productStatusEnum("product_status").notNull().default("coming_soon"),
    /** ссылка на покупку на внешней площадке продавца (VK, Telegram и т.п.) */
    externalBuyUrl: text("external_buy_url"),
    /** для бесплатных гайдов — ссылка на загруженный файл (/media/...) */
    fileUrl: text("file_url"),
    coverImage: text("cover_image"),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    isDemo: boolean("is_demo").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    ...seo,
    ...timestamps,
  },
  (t) => [uniqueIndex("products_slug_idx").on(t.slug)],
);

/**
 * Заказы — ЗАДЕЛ НА БУДУЩЕЕ. Таблицы созданы, но не используются,
 * пока не подключён платёжный провайдер (см. src/server/payments и docs/LAUNCH_CHECKLIST.md).
 */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** хеш ключа доступа, который покупатель получит после оплаты (аккаунты не нужны) */
  accessKeyHash: text("access_key_hash"),
  status: orderStatusEnum("status").notNull().default("pending"),
  totalKopecks: integer("total_kopecks").notNull(),
  provider: text("provider"),
  providerPaymentId: text("provider_payment_id"),
  receiptId: text("receipt_id"),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  priceKopecks: integer("price_kopecks").notNull(),
});

// ---------- Страницы, FAQ, настройки, медиа ----------
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** страница-шаблон, требующая заполнения и проверки юристом */
    needsLegalReview: boolean("needs_legal_review").notNull().default(false),
    status: statusEnum("status").notNull().default("draft"),
    ...seo,
    ...timestamps,
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

export const faqItems = pgTable("faq_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: statusEnum("status").notNull().default("published"),
  ...timestamps,
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  alt: text("alt"),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Журнал действий администраторов (без содержимого пользовательских данных). */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
