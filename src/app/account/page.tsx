import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Мои записи", robots: { index: false, follow: false } };

export default function Account() {
  return (
    <>
      <header className="page-head container">
        <Breadcrumbs items={[{ label: "Мои записи" }]} />
        <p className="eyebrow">Личное пространство</p>
        <h1>Мои записи</h1>
        <p className="lead">Избранное, результаты тестов, ответы в практиках и прогресс программ. Всё это хранится <strong>только в этом браузере</strong> — регистрация не нужна, на сервер ничего не отправляется.</p>
      </header>
      <AccountView />
    </>
  );
}
