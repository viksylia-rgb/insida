import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("insida-cookie-note", "1"); });
});

test("главная, навигация и переключение темы", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Понимать себя");
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole("button", { name: /тему/ }).click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after); // выбор сохранён
  if (isMobile) {
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await page.getByRole("navigation", { name: "Мобильное меню" }).getByRole("link", { name: "Тесты" }).click();
  } else {
    await page.getByRole("navigation", { name: "Основное меню" }).getByRole("link", { name: "Тесты" }).click();
  }
  await expect(page).toHaveURL(/\/tests$/);
  // нет горизонтальной прокрутки
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("поиск и фильтры библиотеки", async ({ page }) => {
  await page.goto("/search?q=" + encodeURIComponent("тревожности"));
  await expect(page.getByRole("link", { name: /Привязанность во взрослых/ })).toBeVisible();
  await page.goto("/library?kind=term");
  await expect(page.getByRole("link", { name: "Выгорание", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Личные границы/ })).toHaveCount(0);
});

test("тест: прохождение с возвратом назад, результат сохраняется только в браузере", async ({ page }) => {
  const requests: string[] = [];
  await page.goto("/tests/vnutrenniy-kritik");
  page.on("request", (r) => { if (r.method() === "POST") requests.push(r.url()); });
  await page.getByRole("button", { name: "Начать" }).click();
  for (let i = 0; i < 8; i++) {
    await page.getByLabel("Часто").check();
    if (i === 2) { // проверяем «Назад»
      await page.getByRole("button", { name: "← Назад" }).click();
      await expect(page.getByLabel("Часто")).toBeChecked();
      await page.getByRole("button", { name: "Дальше" }).click();
      await page.getByLabel("Часто").check();
    }
    await page.getByRole("button", { name: i === 7 ? "Узнать результат" : "Дальше" }).click();
  }
  await expect(page.getByRole("heading", { name: "Что показывают ваши ответы" })).toBeVisible();
  await expect(page.getByText("Строгий внутренний критик")).toBeVisible();
  expect(requests).toEqual([]); // ответы не отправлялись на сервер
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Результаты тестов" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Как звучит ваш внутренний голос" })).toBeVisible();
});

test("тест с ветвлением пропускает вопрос", async ({ page }) => {
  await page.goto("/tests/zapas-sil");
  await page.getByRole("button", { name: "Начать" }).click();
  await page.getByLabel("Нет").check();
  await page.getByRole("button", { name: "Дальше" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toContainText("восстанавливаться");
});

test("практика: черновик, избранное, прогресс программы, экспорт и удаление", async ({ page }) => {
  await page.goto("/practices/dnevnik-samopodderzhki");
  await page.getByLabel("Что произошло?").fill("Ошибся в отчёте");
  await page.getByRole("button", { name: "Сохранить ответы" }).click();
  await expect(page.getByText(/Ответы сохранены на этом устройстве/)).toBeVisible();
  await page.getByRole("button", { name: "В избранное" }).click();
  await page.reload();
  await expect(page.getByLabel("Что произошло?")).toHaveValue("Ошибся в отчёте");
  await expect(page.getByRole("button", { name: "В избранном" })).toBeVisible();

  await page.goto("/programs/opora-na-sebya/golos-kritika");
  await page.getByRole("button", { name: "Отметить как пройденный" }).click();
  await page.goto("/programs/opora-na-sebya");
  await expect(page.getByRole("link", { name: "Продолжить" })).toHaveAttribute("href", /otkuda-strogost/);

  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Дневник самоподдержки" }).first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать файл" }).click();
  const file = await (await download).path();
  const json = JSON.parse(require("node:fs").readFileSync(file, "utf8"));
  expect(json.format).toBe("insida-local-export/v1");
  expect(Object.values(json.practiceEntries)[0]).toMatchObject({ values: { situation: "Ошибся в отчёте" } });
  await page.getByRole("button", { name: "Удалить все записи" }).click();
  await page.getByRole("button", { name: "Да, удалить" }).click();
  await expect(page.getByText("Здесь пока пусто.")).toBeVisible();
});

test("админ-панель закрыта без входа, вход и создание статьи", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  test.skip(!process.env.E2E_ADMIN_NAME, "не задан E2E_ADMIN_NAME");
  await page.getByLabel("Имя администратора").fill(process.env.E2E_ADMIN_NAME!);
  await page.getByLabel("Пароль").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Сводка" })).toBeVisible();
  await page.goto("/admin/articles/new");
  const slug = `e2e-${Date.now()}`;
  await page.getByLabel("Заголовок", { exact: true }).fill("Проверочная статья E2E");
  await page.getByLabel("Адрес страницы").fill(slug);
  await page.getByLabel("Текст", { exact: true }).fill("## Раздел\n\nТекст проверочной статьи.");
  await page.getByRole("button", { name: "Опубликовать" }).click();
  await expect(page.getByText("Материал создан")).toBeVisible();
  await page.goto(`/library/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Проверочная статья E2E");
  await page.goto("/admin/articles");
  await page.getByRole("link", { name: "Проверочная статья E2E" }).click();
  await page.getByRole("button", { name: "Удалить навсегда" }).click();
  await page.getByRole("button", { name: "Да, точно" }).click();
  await expect(page).toHaveURL(/deleted=1/);
});
