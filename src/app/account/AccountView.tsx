"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { exportData, importData, ImportError, removeEntry, removeTestResult, setPseudonym, toggleFavorite, clearStore, readStore, writeStore } from "@/lib/local-store";
import { useLocalData } from "@/components/useLocalData";

const TYPE_LABEL = { article: "Материал", test: "Тест", practice: "Практика", program: "Программа", book: "Книга", product: "Гайд" } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function AccountView() {
  const { data, update, ready } = useLocalData();
  const [name, setName] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  if (!ready) return <section className="container" style={{ minHeight: "40vh" }}><p className="muted">Загружаю ваши записи…</p></section>;

  const entries = Object.entries(data.practiceEntries).sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));
  const progress = Object.entries(data.lessonProgress).filter(([, v]) => v.done.length);
  const isEmpty = !data.favorites.length && !data.testResults.length && !entries.length && !progress.length;

  function download() {
    const blob = new Blob([exportData(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `insida-moi-zapisi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onImport(file: File) {
    try {
      if (file.size > 5_000_000) throw new ImportError("Файл слишком большой");
      const next = importData(readStore(), await file.text(), importMode);
      setMsg(writeStore(next) ? { ok: true, text: "Записи загружены из файла." } : { ok: false, text: "Браузер не разрешил сохранить данные." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ImportError ? e.message : "Не удалось прочитать файл" });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="container" style={{ paddingBottom: "5rem", display: "grid", gap: "4rem" }}>
      <p className="notice notice--warn" style={{ maxWidth: "80ch" }}>
        <strong>Важно:</strong> если очистить данные браузера, пользоваться другим устройством или режимом «инкогнито», записи здесь не появятся.
        Чтобы не потерять их, время от времени скачивайте файл с записями — его можно загрузить обратно на любом устройстве.
      </p>

      <section aria-labelledby="name-h" className="form-card" style={{ maxWidth: 640 }}>
        <h2 id="name-h" style={{ fontSize: "1.75rem" }}>{data.profile.pseudonym ? `Здравствуйте, ${data.profile.pseudonym}` : "Как к вам обращаться?"}</h2>
        <form className="search-box" onSubmit={(e) => { e.preventDefault(); update((d) => setPseudonym(d, name ?? "")); setName(null); }}>
          <label htmlFor="pseudo" className="sr-only">Псевдоним</label>
          <input id="pseudo" className="input" maxLength={40} placeholder="Псевдоним (необязательно)" value={name ?? data.profile.pseudonym ?? ""} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn--secondary" type="submit">Сохранить</button>
        </form>
        <p className="caption" style={{ marginBottom: 0 }}>Псевдоним виден только вам на этом устройстве.</p>
      </section>

      {isEmpty && (
        <div className="empty">
          <p>Здесь пока пусто.</p>
          <div className="cluster" style={{ justifyContent: "center" }}>
            <Link href="/tests" className="chip">Пройти тест</Link><Link href="/practices" className="chip">Открыть практику</Link><Link href="/library" className="chip">Читать библиотеку</Link>
          </div>
        </div>
      )}

      {data.favorites.length > 0 && (
        <section aria-labelledby="fav-h">
          <h2 id="fav-h">Избранное</h2>
          <ul className="list-plain">
            {data.favorites.map((f) => (
              <li key={f.type + f.id}>
                <span><span className="caption">{TYPE_LABEL[f.type]} · </span><Link href={f.url}>{f.title}</Link></span>
                <button className="btn btn--ghost btn--sm" onClick={() => update((d) => toggleFavorite(d, f))}>Убрать</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.testResults.length > 0 && (
        <section aria-labelledby="res-h">
          <h2 id="res-h">Результаты тестов</h2>
          <ul className="list-plain">
            {data.testResults.map((r) => (
              <li key={r.id} style={{ display: "block" }}>
                <div className="toolbar" style={{ justifyContent: "space-between" }}>
                  <span><Link href={`/tests/${r.testSlug}`}>{r.testTitle}</Link> <span className="caption">· {fmt(r.date)}</span></span>
                  <button className="btn btn--ghost btn--sm" onClick={() => update((d) => removeTestResult(d, r.id))}>Удалить</button>
                </div>
                {r.result.map((s) => (
                  <div key={s.key} style={{ marginTop: "0.75rem" }}>
                    <p className="small" style={{ margin: 0 }}><strong>{s.title}:</strong> {s.band?.title ?? `${s.score} из ${s.max}`}</p>
                    <div className="meter" style={{ height: 6, marginTop: 6 }}><span style={{ width: `${Math.max(s.percent, 3)}%` }} /></div>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {entries.length > 0 && (
        <section aria-labelledby="ent-h">
          <h2 id="ent-h">Ответы в практиках</h2>
          <ul className="list-plain">
            {entries.map(([id, e]) => (
              <li key={id}>
                <span><Link href={`/practices/${e.slug}`}>{e.title}</Link> <span className="caption">· {e.isDraft ? "черновик" : "сохранено"} · {fmt(e.updatedAt)}</span></span>
                <button className="btn btn--ghost btn--sm" onClick={() => update((d) => removeEntry(d, id))}>Удалить</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {progress.length > 0 && (
        <section aria-labelledby="prog-h">
          <h2 id="prog-h">Программы</h2>
          <ul className="list-plain">
            {progress.map(([slug, p]) => (
              <li key={slug}>
                <Link href={`/programs/${slug}`}>{p.title}</Link>
                <span className="caption">пройдено {p.done.length} из {p.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="data-h" className="form-card">
        <h2 id="data-h" style={{ fontSize: "1.75rem" }}>Мои данные</h2>
        <div className="grid grid--3">
          <div className="stack">
            <h3 className="h4" style={{ fontSize: "1.3rem" }}>Скачать</h3>
            <p className="small muted">Файл JSON со всеми записями: его можно хранить у себя или перенести на другое устройство.</p>
            <button className="btn btn--primary btn--sm" onClick={download} disabled={isEmpty && !data.profile.pseudonym}>Скачать файл</button>
          </div>
          <div className="stack">
            <h3 style={{ fontSize: "1.3rem" }}>Загрузить</h3>
            <p className="small muted">Восстановить записи из ранее скачанного файла.</p>
            <div className="cluster">
              <label className="check small"><input type="radio" name="mode" checked={importMode === "merge"} onChange={() => setImportMode("merge")} /> объединить</label>
              <label className="check small"><input type="radio" name="mode" checked={importMode === "replace"} onChange={() => setImportMode("replace")} /> заменить</label>
            </div>
            <label className="btn btn--secondary btn--sm" style={{ width: "fit-content" }}>
              Выбрать файл
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            </label>
          </div>
          <div className="stack">
            <h3 style={{ fontSize: "1.3rem" }}>Удалить всё</h3>
            <p className="small muted">Стирает все записи INSIDA с этого устройства. Отменить нельзя.</p>
            {!confirmClear ? (
              <button className="btn btn--danger btn--sm" onClick={() => setConfirmClear(true)}>Удалить все записи</button>
            ) : (
              <div className="cluster">
                <button className="btn btn--danger btn--sm" onClick={() => { clearStore(); setConfirmClear(false); setMsg({ ok: true, text: "Все записи удалены с этого устройства." }); }}>Да, удалить</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmClear(false)}>Отмена</button>
              </div>
            )}
          </div>
        </div>
        {msg && <p className={msg.ok ? "form-success" : "form-error"} role="status" style={{ marginTop: "1.5rem" }}>{msg.text}</p>}
      </section>
    </div>
  );
}
