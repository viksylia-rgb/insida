import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Markdown → безопасный HTML. Любой HTML внутри текста проходит через белый список,
 * скрипты, обработчики событий и javascript:-ссылки удаляются (защита от XSS).
 */
export function renderMarkdown(src: string): string {
  const raw = marked.parse(src ?? "", { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "h2", "h3", "h4", "p", "br", "hr", "strong", "em", "b", "i", "blockquote", "ul", "ol", "li",
      "a", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "img", "figure", "figcaption", "sup", "sub", "mark",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//.test(attribs.href ?? "");
        return {
          tagName,
          attribs: external ? { ...attribs, rel: "noopener noreferrer nofollow", target: "_blank" } : attribs,
        };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
      h1: "h2",
    },
  });
}

/** Обычный текст из markdown — для описаний и подсчёта времени чтения. */
export function markdownToPlain(src: string): string {
  return sanitizeHtml(marked.parse(src ?? "", { async: false }) as string, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function readingMinutes(src: string): number {
  const words = markdownToPlain(src).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}
