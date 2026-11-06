import { config as load } from "dotenv";
load({ quiet: true });
// Тесты всегда работают с отдельной базой: её содержимое очищается.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.AUTH_SECRET ||= "test-secret-test-secret-test-secret-123";
