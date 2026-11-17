/**
 * Поиск по сайту прямо в браузере, без сервера и внешних сервисов.
 * Понимает разные формы русских слов за счёт сравнения по началу слова
 * («тревожности» найдёт «тревога»), учитывает вес заголовка, тегов и текста.
 */
export type SearchDoc = { type: string; url: string; title: string; excerpt: string; text: string; tags: string[] };
export type SearchHit = SearchDoc & { score: number };

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Основа слова: для слов длиннее 5 букв — первые 5 букв (грубый, но надёжный «стемминг»). */
export function stem(word: string): string {
  return word.length > 5 ? word.slice(0, 5) : word;
}

export function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter((w) => w.length >= 2);
}

function fieldScore(fieldWords: string[], qStem: string, exact: string): number {
  let best = 0;
  for (const w of fieldWords) {
    if (w === exact) return 1;
    if (w.startsWith(qStem)) best = Math.max(best, 0.7);
  }
  return best;
}

export function search(docs: SearchDoc[], query: string, limit = 30): SearchHit[] {
  const qWords = tokenize(query).slice(0, 8);
  if (!qWords.length) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const title = tokenize(d.title);
    const tags = tokenize(d.tags.join(" "));
    const body = tokenize(`${d.excerpt} ${d.text}`);
    let total = 0;
    let matchedAll = true;
    for (const q of qWords) {
      const st = stem(q);
      const s = fieldScore(title, st, q) * 3 + fieldScore(tags, st, q) * 2 + fieldScore(body, st, q);
      if (s === 0) matchedAll = false;
      total += s;
    }
    if (matchedAll && total > 0) hits.push({ ...d, score: total });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
