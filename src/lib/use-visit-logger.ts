import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Logs each page visit to /api/public/log-visit.
 * Fires on initial mount and on every pathname change.
 */
export function useVisitLogger() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip the admin logs page itself to avoid noise (optional)
    const controller = new AbortController();
    fetch("/api/public/log-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      /* never break the UI */
    });
    return () => controller.abort();
  }, [pathname]);
}
