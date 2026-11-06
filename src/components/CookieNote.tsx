"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Сайт использует только необходимые cookie, поэтому это уведомление, а не запрос согласия. */
export function CookieNote() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!localStorage.getItem("insida-cookie-note")); } catch {}
  }, []);
  if (!show) return null;
  return (
    <div className="cookie-note" role="region" aria-label="Уведомление о cookie">
      <span>Мы используем только технически необходимые cookie (вход в аккаунт) и не подключаем стороннюю аналитику. <Link href="/legal/cookies">Подробнее</Link></span>
      <button className="btn btn--secondary btn--sm" onClick={() => { try { localStorage.setItem("insida-cookie-note", "1"); } catch {} setShow(false); }}>Понятно</button>
    </div>
  );
}
