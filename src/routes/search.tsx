import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { EntryCard } from "@/components/EntryCard";
import { useEntries } from "@/lib/queries";

function validateSearch(search: Record<string, unknown>) {
  return { q: typeof search.q === "string" ? search.q : "" };
}

export const Route = createFileRoute("/search")({
  validateSearch,
  head: () => ({ meta: [{ title: "Search — vain" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [val, setVal] = useState(q);
  const { data: entries = [] } = useEntries();

  useEffect(() => setVal(q), [q]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return entries.filter((e) => {
      const haystack =
        e.type === "post"
          ? e.body
          : `${e.title} ${e.subtitle ?? ""} ${e.contentHtml.replace(/<[^>]+>/g, " ")}`;
      return (
        haystack.toLowerCase().includes(needle) ||
        e.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [q, entries]);

  return (
    <Layout>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: val.trim() } });
        }}
        className="hairline-b flex items-center gap-2 pb-5"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Search posts, articles, tags…"
          className="w-full bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </form>

      <div className="mt-4">
        {!q.trim() ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Type to search the feed.</p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No results for "{q}".</p>
        ) : (
          <>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"}
            </div>
            <div className="flex flex-col">
              {results.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
