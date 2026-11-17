import type { MetadataRoute } from "next";
import { content } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const c = content();
  const u = (p: string) => `${SITE_URL}${p}/`;
  return [
    ...["", "/library", "/tests", "/practices", "/programs", "/guides", "/books", "/about", "/faq", "/contacts"].map((p) => ({ url: u(p) })),
    ...c.articles.map((a) => ({ url: u(`/library/${a.slug}`), lastModified: a.updated ?? a.date })),
    ...c.tests.map((t) => ({ url: u(`/tests/${t.slug}`) })),
    ...c.practices.map((p) => ({ url: u(`/practices/${p.slug}`) })),
    ...c.programs.map((p) => ({ url: u(`/programs/${p.slug}`) })),
    ...c.guides.map((g) => ({ url: u(`/guides/${g.slug}`) })),
    ...c.topics.map((t) => ({ url: u(`/topics/${t.slug}`) })),
    ...c.pages.filter((p) => p.slug.startsWith("legal-")).map((p) => ({ url: u(`/legal/${p.slug.slice(6)}`) })),
  ];
}
