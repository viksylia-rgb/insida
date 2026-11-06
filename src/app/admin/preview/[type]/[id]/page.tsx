import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/current";
import { adminGet, adminGetArticle } from "@/server/services/admin";
import { renderMarkdown } from "@/lib/markdown";

export const metadata = { title: "Предпросмотр" };

/** Предпросмотр черновика (виден только администратору). */
export default async function Preview({ params }: { params: Promise<{ type: string; id: string }> }) {
  const actor = await requireAdmin();
  const { type, id } = await params;
  let title = "", lead = "", body = "";
  if (type === "article") { const a = await adminGetArticle(actor, id); if (!a) notFound(); title = a.title; lead = a.excerpt; body = a.body; }
  else if (type === "practice" || type === "program" || type === "page" || type === "product" || type === "test") {
    const r = (await adminGet(actor, type, id)) as Record<string, unknown> | null;
    if (!r) notFound();
    title = String(r.title ?? ""); lead = String(r.excerpt ?? "");
    body = String(r.body ?? r.description ?? r.intro ?? "");
  } else notFound();
  return (
    <article className="container--narrow">
      <p className="notice notice--warn"><strong>Предпросмотр.</strong> Так выглядит текст; материал может быть ещё не опубликован.</p>
      <h1 style={{ marginTop: "2rem" }}>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </article>
  );
}
