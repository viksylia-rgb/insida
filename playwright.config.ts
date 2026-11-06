import { defineConfig, devices } from "@playwright/test";

/**
 * Сквозные проверки в браузере (десктоп и телефон).
 * Перед запуском: npm run build && npm start (в другом окне), админ E2E_ADMIN_NAME / E2E_ADMIN_PASSWORD.
 * Если браузеры Playwright не установлены: npx playwright install chromium
 * (или укажите путь к Chrome: CHROME_PATH=/usr/bin/google-chrome).
 */
const launchOptions = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {};
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", launchOptions, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
  ],
});
