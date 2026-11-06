"use server";
/**
 * Серверные действия админ-панели. Каждое действие проверяет сессию администратора на сервере
 * (функции из services/admin повторно проверяют роль). CSRF: Next.js сверяет заголовок Origin
 * для server actions, cookie сессии — SameSite=Lax.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "../auth/current";
import { AuthError, changePassword, regenerateRecoveryCodes } from "../auth/service";
import * as A from "../services/admin";
import { getDb } from "../db";
import { media } from "../schema";
import { renderMarkdown } from "@/lib/markdown";
import { passwordSchema } from "@/lib/validation";
import type { FormState } from "./state";
import type { SessionUser } from "../auth/service";

async function actor(): Promise<SessionUser> {
  const u = await getCurrentUser();
  A.assertAdmin(u);
  return u;
}

function errorState(e: unknown): FormState {
  if (e instanceof A.ValidationError || e instanceof A.ForbiddenError || e instanceof AuthError) return { error: e.message };
  console.error(e);
  return { error: "Не удалось сохранить. Подробности — в журнале сервера." };
}

/** Обновляет кэш всех публичных страниц после изменения контента. */
function refreshSite() {
  revalidatePath("/", "layout");
}

// ---------- разбор форм ----------
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
/** Источники: по одному в строке, «Название | https://ссылка | примечание» */
async function parseSources(s: string) {
  return lines(s).map((l) => {
    const [title, url, note] = l.split("|").map((x) => x.trim());
    return { title, url: url || undefined, note: note || undefined };
  });
}

function commonContent(fd: FormData) {
  return {
    slug: str(fd, "slug"),
    title: str(fd, "title"),
    excerpt: str(fd, "excerpt"),
    topicId: str(fd, "topicId"),
    coverImage: str(fd, "coverImage"),
    status: fd.get("intent") === "publish" ? "published" : fd.get("intent") === "draft" ? "draft" : str(fd, "status") || "draft",
    isDemo: fd.get("isDemo") ?? "",
    seoTitle: str(fd, "seoTitle"),
    seoDescription: str(fd, "seoDescription"),
    ogImage: str(fd, "ogImage"),
  };
}

type Saver = (a: SessionUser, input: unknown, id?: string) => Promise<{ id: string } | { test: { id: string }; warnings: string[] }>;
async function save(fd: FormData, saver: Saver, input: Record<string, unknown>, listPath: string): Promise<FormState> {
  const id = str(fd, "id") || undefined;
  let newId: string;
  let warnings: string[] = [];
  try {
    const res = await saver(await actor(), input, id);
    if ("test" in res) { newId = res.test.id; warnings = res.warnings; } else newId = res.id;
  } catch (e) {
    return errorState(e);
  }
  refreshSite();
  if (!id) redirect(`${listPath}/${newId}?created=1`);
  return { ok: true, message: warnings.length ? `Сохранено, но проверьте правила результатов: ${warnings.slice(0, 5).join("; ")}` : "Сохранено" };
}

export async function saveArticleAction(_: FormState, fd: FormData): Promise<FormState> {
  return save(fd, A.saveArticle, {
    ...commonContent(fd),
    kind: str(fd, "kind"),
    body: str(fd, "body"),
    coverAlt: str(fd, "coverAlt"),
    author: str(fd, "author"),
    sources: await parseSources(str(fd, "sources")),
    reviewStatus: str(fd, "reviewStatus"),
    reviewedBy: str(fd, "reviewedBy"),
    contentUpdatedAt: str(fd, "contentUpdatedAt"),
    sensitive: fd.get("sensitive") ?? "",
    featured: fd.get("featured") ?? "",
    tagIds: fd.getAll("tagIds").map(String),
  }, "/admin/articles");
}

export async function saveTestAction(_: FormState, fd: FormData): Promise<FormState> {
  let structure: { scales: unknown; questions: unknown; bands: unknown };
  try { structure = JSON.parse(str(fd, "structure")); } catch { return { error: "Не удалось прочитать вопросы теста" }; }
  return save(fd, A.saveTest, {
    ...commonContent(fd),
    intro: str(fd, "intro"),
    durationMinutes: str(fd, "durationMinutes"),
    methodNote: str(fd, "methodNote"),
    sources: await parseSources(str(fd, "sources")),
    ...structure,
  }, "/admin/tests");
}

export async function savePracticeAction(_: FormState, fd: FormData): Promise<FormState> {
  let fields: unknown;
  try { fields = JSON.parse(str(fd, "fields") || "[]"); } catch { return { error: "Не удалось прочитать поля формы" }; }
  return save(fd, A.savePractice, { ...commonContent(fd), kind: str(fd, "kind"), body: str(fd, "body"), durationMinutes: str(fd, "durationMinutes"), fields, sensitive: fd.get("sensitive") ?? "" }, "/admin/practices");
}

export async function saveProgramAction(_: FormState, fd: FormData): Promise<FormState> {
  return save(fd, A.saveProgram, { ...commonContent(fd), description: str(fd, "description") }, "/admin/programs");
}

export async function saveBookAction(_: FormState, fd: FormData): Promise<FormState> {
  const c = commonContent(fd);
  return save(fd, A.saveBook, {
    slug: c.slug, title: c.title, status: c.status, isDemo: c.isDemo, topicId: c.topicId, coverImage: c.coverImage,
    authors: str(fd, "authors"), year: str(fd, "year"), publisher: str(fd, "publisher"), isbn: str(fd, "isbn"),
    annotation: str(fd, "annotation"), whyRead: str(fd, "whyRead"), bibliographyUrl: str(fd, "bibliographyUrl"), featured: fd.get("featured") ?? "",
  }, "/admin/books");
}

export async function saveProductAction(_: FormState, fd: FormData): Promise<FormState> {
  return save(fd, A.saveProduct, {
    ...commonContent(fd), description: str(fd, "description"), contents: lines(str(fd, "contents")), format: str(fd, "format"),
    author: str(fd, "author"), access: str(fd, "access"), priceRub: str(fd, "priceRub"), productStatus: str(fd, "productStatus"),
    fileUrl: str(fd, "fileUrl"), externalBuyUrl: str(fd, "externalBuyUrl"),
  }, "/admin/guides");
}

export async function savePageAction(_: FormState, fd: FormData): Promise<FormState> {
  const c = commonContent(fd);
  return save(fd, A.savePage, { slug: c.slug, title: c.title, status: c.status, body: str(fd, "body"), needsLegalReview: fd.get("needsLegalReview") ?? "", seoTitle: c.seoTitle, seoDescription: c.seoDescription }, "/admin/pages");
}

export async function saveFaqAction(_: FormState, fd: FormData): Promise<FormState> {
  return save(fd, A.saveFaq, { question: str(fd, "question"), answer: str(fd, "answer"), sortOrder: str(fd, "sortOrder"), status: str(fd, "status") || "published" }, "/admin/faq");
}

// ---------- статусы и удаление ----------
type Entity = "article" | "test" | "practice" | "program" | "book" | "product" | "page";
const LIST: Record<Entity | "faq", string> = { article: "/admin/articles", test: "/admin/tests", practice: "/admin/practices", program: "/admin/programs", book: "/admin/books", product: "/admin/guides", page: "/admin/pages", faq: "/admin/faq" };

export async function setStatusAction(fd: FormData) {
  const entity = str(fd, "entity") as Entity | "faq";
  await A.setStatus(await actor(), entity, str(fd, "id"), str(fd, "status") === "published" ? "published" : "draft");
  refreshSite();
  revalidatePath(LIST[entity]);
}

export async function deleteAction(fd: FormData) {
  const entity = str(fd, "entity") as Entity | "faq";
  if (!(entity in LIST)) throw new Error("Неизвестный тип");
  await A.deleteEntity(await actor(), entity, str(fd, "id"));
  refreshSite();
  redirect(`${LIST[entity]}?deleted=1`);
}

// ---------- темы, теги ----------
export async function saveTopicAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await A.saveTopic(await actor(), { slug: str(fd, "slug"), title: str(fd, "title"), concern: str(fd, "concern"), description: str(fd, "description"), sortOrder: str(fd, "sortOrder") || "0" }, str(fd, "id") || undefined);
  } catch (e) { return errorState(e); }
  refreshSite();
  return { ok: true, message: "Тема сохранена" };
}
export async function deleteTopicAction(fd: FormData) { await A.deleteTopic(await actor(), str(fd, "id")); refreshSite(); }
export async function saveTagAction(_: FormState, fd: FormData): Promise<FormState> {
  try { await A.saveTag(await actor(), { slug: str(fd, "slug"), title: str(fd, "title") }, str(fd, "id") || undefined); } catch (e) { return errorState(e); }
  refreshSite();
  return { ok: true, message: "Тег сохранён" };
}
export async function deleteTagAction(fd: FormData) { await A.deleteTag(await actor(), str(fd, "id")); refreshSite(); }

// ---------- модули и уроки ----------
export async function saveModuleAction(_: FormState, fd: FormData): Promise<FormState> {
  try { await A.saveModule(await actor(), str(fd, "programId"), { title: str(fd, "title"), description: str(fd, "description"), position: str(fd, "position") }, str(fd, "id") || undefined); } catch (e) { return errorState(e); }
  refreshSite();
  return { ok: true, message: "Модуль сохранён" };
}
export async function deleteModuleAction(fd: FormData) { await A.deleteModule(await actor(), str(fd, "id")); refreshSite(); }

export async function saveLessonAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id") || undefined;
  let row: { id: string };
  try {
    row = await A.saveLesson(await actor(), { moduleId: str(fd, "moduleId"), slug: str(fd, "slug"), title: str(fd, "title"), body: str(fd, "body"), assignment: str(fd, "assignment"), practiceId: str(fd, "practiceId"), durationMinutes: str(fd, "durationMinutes"), position: str(fd, "position") }, id);
  } catch (e) { return errorState(e); }
  refreshSite();
  if (!id) redirect(`/admin/programs/${str(fd, "programId")}/lessons/${row.id}?created=1`);
  return { ok: true, message: "Урок сохранён" };
}
export async function deleteLessonAction(fd: FormData) {
  await A.deleteLesson(await actor(), str(fd, "id"));
  refreshSite();
  redirect(`/admin/programs/${str(fd, "programId")}`);
}

// ---------- настройки ----------
export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const socialLinks = lines(str(fd, "socialLinks")).map((l) => { const [title, url] = l.split("|").map((x) => x.trim()); return { title, url }; });
    await A.saveSettings(await actor(), {
      founderName: str(fd, "founderName"), founderRole: str(fd, "founderRole"), founderStory: str(fd, "founderStory"), founderPhoto: str(fd, "founderPhoto"),
      founderPhotoAlt: str(fd, "founderPhotoAlt"), education: str(fd, "education"), mission: str(fd, "mission"), contactEmail: str(fd, "contactEmail"),
      socialLinks, crisisText: str(fd, "crisisText"), heroTitle: str(fd, "heroTitle"), heroLead: str(fd, "heroLead"), heroImage: str(fd, "heroImage"), sellerInfo: str(fd, "sellerInfo"),
    });
  } catch (e) { return errorState(e); }
  refreshSite();
  return { ok: true, message: "Настройки сохранены" };
}

// ---------- медиа ----------
const LIMITS = { image: 4 * 1024 * 1024, pdf: 5 * 1024 * 1024 };
function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString("ascii") === "ftypavif") return "image/avif";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf" };

export async function uploadMediaAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const a = await actor();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Выберите файл" };
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniff(buf);
    if (!mime) return { error: "Разрешены только JPG, PNG, WebP, AVIF и PDF" };
    const limit = mime === "application/pdf" ? LIMITS.pdf : LIMITS.image;
    if (buf.length > limit) return { error: `Файл слишком большой: максимум ${limit / 1024 / 1024} МБ для ${mime === "application/pdf" ? "PDF" : "изображений"}. Сожмите файл и попробуйте снова.` };
    const fileName = randomBytes(12).toString("hex");
    await getDb().insert(media).values({ fileName, originalName: file.name.slice(0, 200), mimeType: mime, sizeBytes: buf.length, alt: str(fd, "alt").slice(0, 300) || null, data: buf });
    void a;
    revalidatePath("/admin/media");
    return { ok: true, message: `Загружено. Адрес файла: /media/${fileName}.${EXT[mime]}` };
  } catch (e) { return errorState(e); }
}
export async function deleteMediaAction(fd: FormData) { await A.deleteMedia(await actor(), str(fd, "id")); revalidatePath("/admin/media"); }

// ---------- команда и безопасность ----------
export async function addAdminAction(_: FormState, fd: FormData): Promise<FormState> {
  try { await A.adminAddAdmin(await actor(), { pseudonym: str(fd, "pseudonym"), password: str(fd, "password") }); } catch (e) { return errorState(e); }
  revalidatePath("/admin/team");
  return { ok: true, message: "Администратор добавлен. Передайте ему пароль лично и попросите выпустить коды восстановления." };
}
export async function blockAdminAction(fd: FormData) { await A.adminSetBlocked(await actor(), str(fd, "id"), str(fd, "blocked") === "1"); revalidatePath("/admin/team"); }
export async function deleteAdminAction(fd: FormData) { await A.adminDeleteUser(await actor(), str(fd, "id")); revalidatePath("/admin/team"); }

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const a = await actor();
  const next = passwordSchema.safeParse(fd.get("next"));
  if (!next.success) return { fields: { next: next.error.issues[0].message } };
  if (fd.get("next") !== fd.get("confirm")) return { fields: { confirm: "Пароли не совпадают" } };
  try { await changePassword(a.id, str(fd, "current"), next.data, a.sessionId); } catch (e) { if (e instanceof AuthError) return { fields: { current: e.message } }; throw e; }
  return { ok: true, message: "Пароль изменён. На других устройствах выполнен выход." };
}
export async function regenerateCodesAction(_: FormState<{ codes: string[] }>): Promise<FormState<{ codes: string[] }>> {
  const a = await actor();
  return { ok: true, data: { codes: await regenerateRecoveryCodes(a.id) } };
}

// ---------- предпросмотр markdown ----------
export async function previewMarkdownAction(md: string): Promise<string> {
  await actor();
  return renderMarkdown(String(md).slice(0, 200_000));
}
