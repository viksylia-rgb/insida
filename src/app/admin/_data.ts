import { desc } from "drizzle-orm";
import { getDb } from "@/server/db";
import { media } from "@/server/schema";
import { listTopics } from "@/server/services/content";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf" };
export const mediaUrl = (m: { fileName: string; mimeType: string }) => `/media/${m.fileName}.${EXT[m.mimeType] ?? "bin"}`;

/** Справочники для форм: темы и загруженные файлы. */
export async function formLookups() {
  const [topics, files] = await Promise.all([
    listTopics(),
    getDb().select({ fileName: media.fileName, mimeType: media.mimeType, originalName: media.originalName }).from(media).orderBy(desc(media.createdAt)).limit(300),
  ]);
  return {
    topicOptions: [["", "— без темы —"], ...topics.map((t) => [t.id, t.title])] as [string, string][],
    images: files.filter((f) => f.mimeType.startsWith("image/")).map((f) => ({ url: mediaUrl(f), name: f.originalName })),
    pdfs: files.filter((f) => f.mimeType === "application/pdf").map((f) => ({ url: mediaUrl(f), name: f.originalName })),
  };
}
