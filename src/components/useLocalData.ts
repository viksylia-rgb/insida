"use client";
import { useCallback, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, readStore, subscribe, writeStore, type LocalData } from "@/lib/local-store";

/** Данные читателя из localStorage + функция обновления. Синхронизируется между вкладками. */
export function useLocalData() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((fn: (d: LocalData) => LocalData) => writeStore(fn(readStore())), []);
  return { data, update, ready };
}
