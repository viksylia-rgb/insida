"use client";
import { useState } from "react";
import type { PracticeField } from "@/server/schema";

/** Редактор полей формы практики (вопросы для ответа). */
export function FieldsEditor({ initial }: { initial: PracticeField[] }) {
  const [fields, setFields] = useState<PracticeField[]>(initial);
  const upd = (i: number, patch: Partial<PracticeField>) => setFields((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="panel">
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      <h2>Поля для ответов</h2>
      <p className="caption" style={{ margin: 0 }}>Читатель заполняет эти поля; ответы хранятся только в его браузере.</p>
      {fields.map((f, i) => (
        <div key={i} className="q-block">
          <div className="opt-row" style={{ gridTemplateColumns: "140px 1fr 160px auto" }}>
            <input className="input" aria-label="Код поля" value={f.id} onChange={(e) => upd(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
            <input className="input" aria-label="Вопрос" placeholder="Вопрос" value={f.label} onChange={(e) => upd(i, { label: e.target.value })} />
            <select className="select" aria-label="Тип поля" value={f.type} onChange={(e) => upd(i, { type: e.target.value as PracticeField["type"] })}>
              <option value="textarea">Длинный ответ</option>
              <option value="text">Короткий ответ</option>
              <option value="scale">Шкала (ползунок)</option>
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFields((x) => x.filter((_, j) => j !== i))}>Удалить</button>
          </div>
          <input className="input" placeholder="Подсказка (необязательно)" value={f.help ?? ""} onChange={(e) => upd(i, { help: e.target.value })} />
          {f.type === "scale" && (
            <div className="row-2">
              <input className="input" type="number" aria-label="Минимум" value={f.min ?? 0} onChange={(e) => upd(i, { min: Number(e.target.value) })} />
              <input className="input" type="number" aria-label="Максимум" value={f.max ?? 10} onChange={(e) => upd(i, { max: Number(e.target.value) })} />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn btn--secondary btn--sm" style={{ width: "fit-content" }} onClick={() => setFields((x) => [...x, { id: `q${x.length + 1}`, label: "", type: "textarea" }])}>+ Поле</button>
    </div>
  );
}
