import type { CSSProperties } from "react";
import { asset } from "@/lib/site";

const PALETTES = [
  ["#c99fa7", "#49302f", "#efe2d6", "#2c1c1a"],
  ["#e9d6cf", "#2c1c1a", "#c99fa7", "#49302f"],
  ["#a87580", "#f4eae0", "#d9c9bf", "#2c1c1a"],
  ["#f4eae0", "#49302f", "#c99fa7", "#2c1c1a"],
  ["#49302f", "#c99fa7", "#f7f0e9", "#2c1c1a"],
  ["#d9c9bf", "#a87580", "#faf6f1", "#49302f"],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/**
 * Изображение материала. Если фото нет — атмосферная композиция-плейсхолдер
 * в цветах бренда с пометкой о необходимости замены.
 */
export function Visual({ src, alt = "", seed, ratio, glyph, priority, label = "Плейсхолдер · заменить фото", sizes = "(max-width: 860px) 100vw, 50vw" }: {
  src?: string | null; alt?: string; seed: string; ratio?: string; glyph?: string; priority?: boolean; label?: string | false; sizes?: string;
}) {
  const style = { ...(ratio ? { "--ratio": ratio } : {}) } as CSSProperties;
  if (src) {
    return (
      <div className="visual" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(src)} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const h = hash(seed);
  const p = PALETTES[h % PALETTES.length];
  const vars = {
    ...style,
    "--v1": p[0], "--v2": p[1], "--v3": p[2], "--v4": p[3],
    "--x1": `${10 + (h % 50)}%`, "--y1": `${5 + ((h >> 3) % 40)}%`,
    "--x2": `${50 + ((h >> 5) % 45)}%`, "--y2": `${55 + ((h >> 7) % 40)}%`,
    "--angle": `${120 + ((h >> 9) % 90)}deg`, "--fold": `${90 + ((h >> 11) % 60)}deg`, "--rot": `${-10 + ((h >> 13) % 20)}deg`,
  } as CSSProperties;
  return (
    <div className="visual visual--placeholder" style={vars} role="img" aria-label={alt || "Декоративное изображение"}>
      {glyph && <span className="visual__glyph" aria-hidden="true">{glyph}</span>}
      {label && <span className="visual__label">{label}</span>}
    </div>
  );
}
