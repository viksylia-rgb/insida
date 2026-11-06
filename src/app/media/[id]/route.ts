import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { media } from "@/server/schema";

/** Отдача загруженных файлов из базы. Имя файла — случайный id, поэтому кэшируем надолго. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileName = id.split(".")[0];
  if (!/^[a-z0-9]{16,40}$/.test(fileName)) return new Response("Not found", { status: 404 });
  const [row] = await getDb().select().from(media).where(eq(media.fileName, fileName)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": row.mimeType,
    "Content-Length": String(row.sizeBytes),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  };
  if (row.mimeType === "application/pdf") headers["Content-Disposition"] = `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`;
  return new Response(new Uint8Array(row.data), { headers });
}
