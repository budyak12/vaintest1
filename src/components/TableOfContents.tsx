import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/article-toc";
import { cn } from "@/lib/utils";

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <aside className="pointer-events-auto fixed right-8 top-28 z-30 hidden w-52 xl:block">
      <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        В этой статье
      </div>
      <nav className="flex flex-col gap-1.5">
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(it.id);
                if (!el) return;
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", `#${it.id}`);
              }}
              className={cn(
                "border-l-2 pl-3 text-xs leading-snug transition-colors",
                it.level === 3 && "pl-6",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {it.text}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
