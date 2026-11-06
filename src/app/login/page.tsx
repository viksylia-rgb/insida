import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход для редакции", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="section container">
      <div className="auth-wrap">
        <p className="eyebrow">Только для редакции</p>
        <h1 style={{ fontSize: "var(--fs-h2)" }}>Вход в админ-панель</h1>
        <p className="muted">Читателям входить не нужно: избранное и записи сохраняются в разделе «Мои записи» прямо в браузере.</p>
        <LoginForm next={next} />
      </div>
    </section>
  );
}
