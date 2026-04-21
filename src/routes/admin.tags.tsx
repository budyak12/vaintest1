import { createFileRoute } from "@tanstack/react-router";
import { useAllTags } from "@/lib/queries";

export const Route = createFileRoute("/admin/tags")({
  head: () => ({ meta: [{ title: "Tags — vain admin" }] }),
  component: TagsAdmin,
});

function TagsAdmin() {
  const { data: tags = [], isLoading } = useAllTags();
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Tags</h1>
      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : tags.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <div key={t.tag} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
              <span>#{t.tag}</span>
              <span className="text-muted-foreground tabular-nums">{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
