"use client";
import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./Icons";

/** Переключатель темы. Выбор сохраняется в localStorage; без выбора — системная тема. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") ?? "light");
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("insida-theme", next); } catch {}
    setTheme(next);
  }
  const label = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}

/** Скрипт в <head>: применяет тему до отрисовки, чтобы не было «вспышки». */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('insida-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;
