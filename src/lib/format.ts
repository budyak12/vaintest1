import { useEffect, useState } from "react";
import { format } from "date-fns";

/**
 * Human relative time, anchored to the post's actual `createdAt`.
 * Returns "just now" for < 30s, then 1m / 2m / 1h / 3d / 4w / 2y.
 */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000); // seconds, never negative

  if (diff < 30) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const m = diff / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const days = h / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  const weeks = days / 7;
  if (weeks < 5) return `${Math.floor(weeks)}w ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  const years = days / 365;
  return `${Math.floor(years)}y ago`;
}

/**
 * Live-updating relative time. Re-renders on a sensible interval based
 * on the age of the timestamp so the UI never lies.
 */
export function useTimeAgo(iso: string): string {
  const [, setTick] = useState(0);
  useEffect(() => {
    const d = new Date(iso).getTime();
    if (isNaN(d)) return;
    function pickInterval() {
      const diff = (Date.now() - d) / 1000;
      if (diff < 60) return 1000; // every second
      if (diff < 3600) return 30_000; // 30s
      if (diff < 86_400) return 60_000; // 1m
      return 5 * 60_000; // 5m
    }
    let id = window.setInterval(function tick() {
      setTick((t) => t + 1);
      window.clearInterval(id);
      id = window.setInterval(tick, pickInterval());
    }, pickInterval());
    return () => window.clearInterval(id);
  }, [iso]);
  return timeAgo(iso);
}

export function fullDate(iso: string) {
  try {
    return format(new Date(iso), "MMM d, yyyy 'at' HH:mm");
  } catch {
    return "";
  }
}

export function compactNumber(n: number) {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return Math.round(n / 1000) + "k";
}
