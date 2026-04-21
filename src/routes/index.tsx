import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { EntryCard } from "@/components/EntryCard";
import { FeedFilters, type FeedFilter, type FeedSort } from "@/components/FeedFilters";
import { useEntries } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Feed — vain" },
      { name: "description", content: "A single stream of short notes and longer essays." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { data: entries = [], isLoading } = useEntries();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<FeedSort>("newest");

  const items = useMemo(() => {
    let list = entries;
    if (filter === "post") list = list.filter((e) => e.type === "post");
    else if (filter === "article") list = list.filter((e) => e.type === "article");
    else if (filter === "media") {
      list = list.filter(
        (e) =>
          (e.type === "post" && e.media.length > 0) ||
          (e.type === "article" && !!e.coverUrl),
      );
    }
    list = [...list].sort((a, b) =>
      sort === "newest"
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : b.likes - a.likes,
    );
    return list;
  }, [entries, filter, sort]);

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          A quiet feed.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Short notes and long essays in one stream.
        </p>
      </div>
      <FeedFilters filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} />
      <div className="mt-2 flex flex-col">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Nothing here yet.</div>
        ) : (
          items.map((e) => <EntryCard key={e.id} entry={e} />)
        )}
      </div>
    </Layout>
  );
}
