export type TocItem = { id: string; text: string; level: 2 | 3 };

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "section"
  );
}

/**
 * Adds unique ids to <h2>/<h3> headings inside the given HTML string and
 * returns the annotated HTML alongside a flat TOC list. SSR-safe: when
 * DOMParser is unavailable, returns the input unchanged with an empty TOC.
 */
export function extractHeadings(html: string): { html: string; toc: TocItem[] } {
  if (typeof window === "undefined" || typeof DOMParser === "undefined" || !html) {
    return { html, toc: [] };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.querySelectorAll("h2, h3")) as HTMLHeadingElement[];

  const seen = new Map<string, number>();
  const toc: TocItem[] = [];

  for (const h of nodes) {
    const text = (h.textContent ?? "").trim();
    if (!text) continue;
    const base = slugify(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    h.setAttribute("id", id);
    toc.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
  }

  return { html: doc.body.innerHTML, toc };
}
