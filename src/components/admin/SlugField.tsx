"use client";
import { useState } from "react";
import { slugify } from "@/lib/format";

/** Заголовок + адрес страницы: адрес предлагается автоматически из заголовка. */
export function TitleSlug({ title = "", slug = "", prefix, titleLabel = "Заголовок" }: { title?: string; slug?: string; prefix: string; titleLabel?: string }) {
  const [t, setT] = useState(title);
  const [s, setS] = useState(slug);
  const [touched, setTouched] = useState(!!slug);
  return (
    <>
      <div className="field">
        <label htmlFor="title">{titleLabel}</label>
        <input id="title" name="title" className="input" required value={t} onChange={(e) => { setT(e.target.value); if (!touched) setS(slugify(e.target.value)); }} />
      </div>
      <div className="field">
        <label htmlFor="slug">Адрес страницы</label>
        <input id="slug" name="slug" className="input" required value={s} onChange={(e) => { setS(e.target.value); setTouched(true); }} pattern="[a-z0-9-]+" />
        <span className="hint">{prefix}{s || "…"} · латиница, цифры и дефисы</span>
      </div>
    </>
  );
}
