import { beforeEach, describe, expect, it } from "vitest";
import { makeAdmin, outsider, prepareDb } from "../helpers";
import { adminListUsers, deleteEntity, ForbiddenError, saveArticle, saveProduct, saveTag, saveTest, saveTopic, setStatus, ValidationError, adminSetBlocked, adminAddAdmin } from "@/server/services/admin";
import { getArticle, listArticles, searchAll, relatedArticles } from "@/server/services/content";

const article = (over: Record<string, unknown> = {}) => ({
  slug: "granitsy",
  kind: "article",
  title: "Что такое личные границы",
  excerpt: "Коротко о том, как замечать и обозначать свои границы.",
  body: "## Введение\n\nГраницы помогают сохранять отношения бережными. Тревожность часто растёт там, где границы размыты.",
  reviewStatus: "not_reviewed",
  status: "draft",
  isDemo: "on",
  sources: [],
  tagIds: [],
  ...over,
});

describe("доступ администратора", () => {
  beforeEach(prepareDb);

  it("без прав администратора админ-операции не выполняются", async () => {
    await expect(saveArticle(outsider, article())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(adminListUsers(outsider)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveTopic(outsider, { slug: "x1", title: "Тема" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(saveArticle(null as never, article())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("админ может добавить коллегу, но не может заблокировать себя", async () => {
    const admin = await makeAdmin();
    const colleague = await adminAddAdmin(admin, { pseudonym: "Редактор", password: "Надёжный-пароль-77" });
    expect((await adminListUsers(admin)).length).toBe(2);
    await expect(adminSetBlocked(admin, admin.id, true)).rejects.toBeInstanceOf(ValidationError);
    await adminSetBlocked(admin, colleague.id, true);
    await expect(adminAddAdmin(admin, { pseudonym: "x", password: "1" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("CRUD материалов", () => {
  beforeEach(prepareDb);

  it("создание, черновик скрыт, публикация, редактирование, снятие, удаление", async () => {
    const admin = await makeAdmin();
    const topic = await saveTopic(admin, { slug: "otnosheniya", title: "Отношения", concern: "Сложно в отношениях" });
    const tag = await saveTag(admin, { slug: "granitsy", title: "границы" });
    const a = await saveArticle(admin, article({ topicId: topic.id, tagIds: [tag.id] }));
    expect(await getArticle("granitsy")).toBeNull(); // черновик не виден публично
    expect((await getArticle("granitsy", { includeDrafts: true }))?.title).toBe("Что такое личные границы");

    await setStatus(admin, "article", a.id, "published");
    const pub = await getArticle("granitsy");
    expect(pub?.tags.map((t) => t.slug)).toEqual(["granitsy"]);
    expect(pub?.publishedAt).toBeTruthy();

    await saveArticle(admin, article({ title: "Личные границы: введение", status: "published", topicId: topic.id }), a.id);
    expect((await getArticle("granitsy"))?.title).toBe("Личные границы: введение");

    const list = await listArticles({ topic: "otnosheniya" });
    expect(list.total).toBe(1);

    await setStatus(admin, "article", a.id, "draft");
    expect(await getArticle("granitsy")).toBeNull();
    await deleteEntity(admin, "article", a.id);
    expect(await getArticle("granitsy", { includeDrafts: true })).toBeNull();
  });

  it("валидация: занятый адрес и неверный slug дают понятную ошибку", async () => {
    const admin = await makeAdmin();
    await saveArticle(admin, article());
    await expect(saveArticle(admin, article())).rejects.toThrow(/уже используется/);
    await expect(saveArticle(admin, article({ slug: "Плохой адрес" }))).rejects.toThrow(/латиница/);
  });

  it("полнотекстовый поиск находит материал по другой форме слова", async () => {
    const admin = await makeAdmin();
    await saveArticle(admin, article({ status: "published" }));
    await saveArticle(admin, article({ slug: "ustalost", title: "Усталость и отдых", body: "Про сон и восстановление", status: "published" }));
    const hits = await searchAll("тревожности");
    expect(hits[0]?.slug).toBe("granitsy");
    const hits2 = await searchAll("границам");
    expect(hits2.map((h) => h.slug)).toContain("granitsy");
    expect((await listArticles({ q: "восстановления" })).items.map((i) => i.slug)).toEqual(["ustalost"]);
  });

  it("связанные материалы учитывают общие теги", async () => {
    const admin = await makeAdmin();
    const tag = await saveTag(admin, { slug: "trevoga", title: "тревога" });
    const a = await saveArticle(admin, article({ status: "published", tagIds: [tag.id] }));
    await saveArticle(admin, article({ slug: "bez-tegov", title: "Без тегов", status: "published" }));
    await saveArticle(admin, article({ slug: "s-tegom", title: "С тегом", status: "published", tagIds: [tag.id] }));
    const rel = await relatedArticles(a.id, null, [tag.id]);
    expect(rel[0].slug).toBe("s-tegom");
  });

  it("платный продукт открывается для продажи только со ссылкой на внешнюю площадку", async () => {
    const admin = await makeAdmin();
    const base = { slug: "workbook", title: "Рабочая тетрадь", format: "PDF", access: "paid", status: "published", productStatus: "available" };
    await expect(saveProduct(admin, base)).rejects.toThrow(/ссылку для покупки/);
    await expect(saveProduct(admin, { ...base, externalBuyUrl: "javascript:alert(1)" })).rejects.toThrow();
    const p = await saveProduct(admin, { ...base, productStatus: "coming_soon", priceRub: "990" });
    expect(p.priceKopecks).toBe(99000);
    const sale = await saveProduct(admin, { ...base, slug: "workbook-2", externalBuyUrl: "https://vk.com/example" });
    expect(sale.productStatus).toBe("available");
  });

  it("сохранение теста проверяет шкалы и предупреждает о дырах в правилах", async () => {
    const admin = await makeAdmin();
    const input = {
      slug: "t1",
      title: "Демо-тест",
      durationMinutes: 3,
      status: "published",
      scales: [{ key: "a", title: "А" }],
      questions: [{ type: "scale", text: "Как часто?", options: [{ label: "Редко", scores: { a: 0 } }, { label: "Часто", scores: { a: 2 } }] }],
      bands: [{ scaleKey: "a", minScore: 0, maxScore: 1, title: "Низко", description: "Описание результата" }],
    };
    const { warnings } = await saveTest(admin, input);
    expect(warnings).toContain("Шкала «А»: балл 2 не попадает ни в одно правило");
    await expect(saveTest(admin, { ...input, slug: "t2", bands: [{ ...input.bands[0], scaleKey: "zzz" }] })).rejects.toThrow(/неизвестную шкалу/);
  });
});

describe("префиксный поиск", () => {
  beforeEach(prepareDb);
  it("«тревожности» находит текст со словом «тревога»", async () => {
    const admin = await makeAdmin();
    await saveArticle(admin, { slug: "pro-trevogu", kind: "article", title: "Когда приходит тревога", body: "Тревога — естественная реакция.", reviewStatus: "not_reviewed", status: "published" });
    expect((await searchAll("тревожности")).map((h) => h.slug)).toContain("pro-trevogu");
  });
});
