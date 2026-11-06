import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/server/services/content";
import { config } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl;
  const e = await sitemapEntries();
  const fixed = ["", "/library", "/tests", "/practices", "/programs", "/guides", "/books", "/about", "/faq", "/contacts"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.7 : 1 }));
  const map = (prefix: string, rows: { slug: string; updatedAt: Date }[]) => rows.map((r) => ({ url: `${base}${prefix}${r.slug}`, lastModified: r.updatedAt }));
  return [
    ...fixed,
    ...map("/library/", e.articles),
    ...map("/tests/", e.tests),
    ...map("/practices/", e.practices),
    ...map("/programs/", e.programs),
    ...map("/topics/", e.topics),
    ...map("/", e.pages.filter((p) => p.slug.startsWith("legal/"))),
  ];
}
