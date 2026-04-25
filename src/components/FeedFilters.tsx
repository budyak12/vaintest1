import { cn } from "@/lib/utils";

export type FeedFilter = "all" | "post" | "article" | "media";
export type FeedSort = "newest" | "popular";

interface Props {
  filter: FeedFilter;
  sort: FeedSort;
  onFilter: (f: FeedFilter) => void;
  onSort: (s: FeedSort) => void;
}

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "post", label: "Posts" },
  { id: "article", label: "Articles" },
  { id: "media", label: "Media" },
];

const SORTS: { id: FeedSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Popular" },
];

export function FeedFilters({ filter, sort, onFilter, onSort }: Props) {
  return (
    <div className="hairline-b sticky top-14 z-30 -mx-4 flex items-center justify-between gap-3 bg-background/85 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:border-border sm:px-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilter(f.id)}
              className={cn(
                "group relative overflow-hidden rounded-md px-2.5 py-1 text-xs transition-all duration-300 ease-out",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:-translate-y-[1px]",
              )}
            >
              {!active && (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 scale-90 rounded-md bg-subtle opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        {SORTS.map((s) => {
          const active = sort === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSort(s.id)}
              className={cn(
                "relative rounded-md px-2 py-1 text-[11px] uppercase tracking-wider transition-colors duration-300 ease-out",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-2 -bottom-0.5 h-px origin-left bg-foreground/70 transition-transform duration-300 ease-out",
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
