"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
export type PracticeField = { id: string; label: string; type: "text" | "textarea" | "scale"; help?: string; min?: number; max?: number };
import { removeEntry, saveEntry } from "@/lib/local-store";
import { useLocalData } from "@/components/useLocalData";

type Props = { practice: { id: string; slug: string; title: string }; fields: PracticeField[] };

/** Ответы практики хранятся только в браузере (черновик сохраняется автоматически). */
export function PracticeForm({ practice, fields }: Props) {
  const { data, update, ready } = useLocalData();
  const stored = data.practiceEntries[practice.id];
  const [values, setValues] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [keep, setKeep] = useState(true);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (!ready || loaded) return;
    if (stored) { setValues(stored.values); setStatus(`Сохранено на этом устройстве: ${new Date(stored.updatedAt).toLocaleString("ru-RU")}`); }
    else setKeep(true);
    setLoaded(true);
  }, [ready, loaded, stored]);

  function set(id: string, v: string) { setValues((s) => ({ ...s, [id]: v })); setDirty(true); }

  function persist(isDraft: boolean) {
    if (!keep) return;
    const ok = update((d) => saveEntry(d, practice.id, { slug: practice.slug, title: practice.title, values: valuesRef.current, isDraft }));
    setDirty(false);
    setStatus(ok ? `${isDraft ? "Черновик сохранён" : "Ответы сохранены"} на этом устройстве: ${new Date().toLocaleTimeString("ru-RU")}` : "Браузер не разрешил сохранение (возможно, приватный режим). Скачайте ответы в файл.");
  }

  // Автосохранение черновика через 3 секунды после изменений
  useEffect(() => {
    if (!dirty || !keep) return;
    const t = setTimeout(() => persist(true), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, dirty, keep]);

  function forget() {
    update((d) => removeEntry(d, practice.id));
    setValues({}); setDirty(false); setStatus("Ответы удалены с этого устройства.");
  }

  function download(kind: "txt" | "json") {
    const date = new Date().toLocaleDateString("ru-RU");
    const body = kind === "json"
      ? JSON.stringify({ practice: practice.title, date, answers: fields.map((f) => ({ question: f.label, answer: values[f.id] ?? "" })) }, null, 2)
      : `${practice.title}\n${date}\n\n` + fields.map((f) => `${f.label}\n${values[f.id] ?? ""}\n`).join("\n");
    const blob = new Blob([body], { type: kind === "json" ? "application/json" : "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `insida-${practice.slug}.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <form className="form form-card" style={{ marginTop: "2.5rem" }} onSubmit={(e) => { e.preventDefault(); persist(false); }} aria-label="Ваши ответы">
      <div className="print-only"><h2>{practice.title}</h2></div>
      <p className="eyebrow no-print" style={{ margin: 0 }}>Ваши ответы</p>
      <p className="caption no-print" style={{ margin: 0 }}>
        Ответы сохраняются только в этом браузере и не отправляются на сервер. Все записи — в разделе <Link href="/account">«Мои записи»</Link>.
      </p>
      {fields.map((f) => (
        <div className="field" key={f.id}>
          <label htmlFor={`f-${f.id}`}>{f.label}</label>
          {f.help && <span className="hint" id={`h-${f.id}`}>{f.help}</span>}
          {f.type === "textarea" && <textarea id={`f-${f.id}`} className="textarea" value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} aria-describedby={f.help ? `h-${f.id}` : undefined} maxLength={20000} />}
          {f.type === "text" && <input id={`f-${f.id}`} className="input" value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} aria-describedby={f.help ? `h-${f.id}` : undefined} maxLength={2000} />}
          {f.type === "scale" && (
            <div className="range-row">
              <span className="caption">{f.min ?? 0}</span>
              <input id={`f-${f.id}`} type="range" min={f.min ?? 0} max={f.max ?? 10} value={values[f.id] ?? String(Math.round(((f.min ?? 0) + (f.max ?? 10)) / 2))} onChange={(e) => set(f.id, e.target.value)} />
              <span className="caption">{f.max ?? 10}</span>
              <output htmlFor={`f-${f.id}`}>{values[f.id] ?? "—"}</output>
            </div>
          )}
        </div>
      ))}
      <label className="check no-print">
        <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
        <span>Сохранять ответы на этом устройстве</span>
      </label>
      <p className="caption no-print" role="status" aria-live="polite">{status}{dirty && keep ? " · сохраняю черновик…" : ""}</p>
      <div className="toolbar no-print">
        {keep && <button type="submit" className="btn btn--primary">Сохранить ответы</button>}
        <button type="button" className="btn btn--ghost" onClick={() => download("txt")}>Скачать .txt</button>
        <button type="button" className="btn btn--ghost" onClick={() => download("json")}>Скачать .json</button>
        <button type="button" className="btn btn--ghost" onClick={() => window.print()} title="В окне печати выберите «Сохранить как PDF»">Печать / PDF</button>
        {stored && <button type="button" className="btn btn--danger btn--sm" onClick={forget}>Удалить мои ответы</button>}
      </div>
    </form>
  );
}
