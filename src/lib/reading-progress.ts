import { useEffect, useState } from "react";

const KEY = (id: string) => `vain:read:${id}`;
const subs = new Set<() => void>();

function notify() {
  for (const s of subs) s();
}

export function getReadingProgress(entryId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY(entryId));
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function setReadingProgress(entryId: string, pct: number) {
  if (typeof window === "undefined") return;
  const current = getReadingProgress(entryId);
  // Save only the MAXIMUM — scrolling back up does not reset progress.
  const next = Math.min(100, Math.max(current, Math.round(pct)));
  if (next === current) return;
  window.localStorage.setItem(KEY(entryId), String(next));
  notify();
}

export function clearReadingProgress(entryId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY(entryId));
  notify();
}

export function useReadingProgress(entryId: string | undefined): number {
  const [v, setV] = useState<number>(() => (entryId ? getReadingProgress(entryId) : 0));
  useEffect(() => {
    if (!entryId) {
      setV(0);
      return;
    }
    setV(getReadingProgress(entryId));
    const update = () => setV(getReadingProgress(entryId));
    subs.add(update);
    window.addEventListener("storage", update);
    return () => {
      subs.delete(update);
      window.removeEventListener("storage", update);
    };
  }, [entryId]);
  return v;
}
