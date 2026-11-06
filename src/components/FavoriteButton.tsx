"use client";
import { isFavorite, toggleFavorite, type FavoriteItem } from "@/lib/local-store";
import { useLocalData } from "./useLocalData";
import { IconBookmark } from "./Icons";

type Props = { type: FavoriteItem["type"]; id: string; title: string; url: string };

/** Избранное хранится только в браузере читателя. */
export function FavoriteButton({ type, id, title, url }: Props) {
  const { data, update, ready } = useLocalData();
  const fav = ready && isFavorite(data, type, id);
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm fav-btn"
      aria-pressed={fav}
      disabled={!ready}
      title="Сохраняется только на этом устройстве"
      onClick={() => update((d) => toggleFavorite(d, { type, id, title, url }))}
    >
      <IconBookmark /> {fav ? "В избранном" : "В избранное"}
    </button>
  );
}
