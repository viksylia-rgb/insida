import Link from "next/link";
export function LocalNote({ what = "Ответы" }: { what?: string }) {
  return (
    <p className="caption">
      {what} сохраняются только в этом браузере и не отправляются на сервер. <Link href="/account">Мои записи</Link> — там можно скачать их в файл или удалить.
    </p>
  );
}
