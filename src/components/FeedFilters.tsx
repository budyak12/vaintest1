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
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              filter === f.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSort(s.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] uppercase tracking-wider transition-colors",
              sort === s.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
