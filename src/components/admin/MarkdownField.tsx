"use client";
import { useState } from "react";
import { previewMarkdownAction } from "@/server/actions/admin";

export function MarkdownField({ name, label, defaultValue = "", rows = 16, hint }: { name: string; label: string; defaultValue?: string; rows?: number; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [html, setHtml] = useState("");
  async function preview() { setTab("preview"); setHtml(await previewMarkdownAction(value)); }
  return (
    <div className="field">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <label htmlFor={`md-${name}`}>{label}</label>
        <div className="md-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")}>Текст</button>
          <button type="button" role="tab" aria-selected={tab === "preview"} onClick={preview}>Предпросмотр</button>
        </div>
      </div>
      <textarea id={`md-${name}`} name={name} className="textarea textarea--code" rows={rows} value={value} onChange={(e) => setValue(e.target.value)} hidden={tab !== "edit"} />
      {tab === "preview" && <div className="md-preview prose" dangerouslySetInnerHTML={{ __html: html || "<p class='muted'>Пусто</p>" }} />}
      <span className="hint">{hint ?? "Формат Markdown: ## Подзаголовок, **жирный**, *курсив*, - список, > цитата, [ссылка](https://…), ![описание](/media/…)."}</span>
    </div>
  );
}
