import { useEffect, useState, type RefObject } from "react";
import { setReadingProgress } from "@/lib/reading-progress";

/**
 * Thin top-of-viewport progress bar tracking how much of the referenced
 * element has been scrolled past. Element-scoped (not document-scoped) so
 * surrounding chrome (header, comments) doesn't skew the percentage.
 */
export function ReadingProgress({
  targetRef,
  entryId,
}: {
  targetRef: RefObject<HTMLElement | null>;
  entryId?: string;
}) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const calc = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setPct(rect.bottom <= window.innerHeight ? 100 : 0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setPct((scrolled / total) * 100);
    };
    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [targetRef]);

  // Persist the max progress per entry to localStorage (debounced).
  useEffect(() => {
    if (!entryId) return;
    const t = setTimeout(() => setReadingProgress(entryId, pct), 250);
    return () => clearTimeout(t);
  }, [pct, entryId]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 h-1 bg-foreground/10 shadow-sm sm:h-[3px]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
      aria-hidden="true"
    >
      <div
        className="h-full bg-foreground transition-[width] duration-100 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
