import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { EntryCard } from "@/components/EntryCard";
import { useBookmarkedEntries } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — vain" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: items = [], isLoading } = useBookmarkedEntries();

  return (
    <Layout>
      <div className="hairline-b pb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Bookmarks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Saved for later reading.</p>
      </div>
      <div className="mt-2 flex flex-col">
        {authLoading || isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !user ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="underline">Sign in</Link> to save bookmarks.
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Nothing bookmarked yet.
          </div>
        ) : (
          items.map((e) => <EntryCard key={e.id} entry={e} />)
        )}
      </div>
    </Layout>
  );
}
