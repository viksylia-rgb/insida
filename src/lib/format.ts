const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" });

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatPrice(kopecks: number | null | undefined): string {
  if (kopecks == null) return "Цена уточняется";
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(kopecks / 100);
}

export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
}

export function minutes(n: number) {
  return `${n} ${plural(n, ["минута", "минуты", "минут"])}`;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Человекочитаемый адрес из заголовка: «Что такое границы» → chto-takoe-granitsy */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const KIND_LABELS = {
  article: "Статья",
  term: "Термин",
  collection: "Подборка",
  exercise: "Упражнение",
  journal: "Дневник",
  reflection: "Рефлексия",
} as const;
