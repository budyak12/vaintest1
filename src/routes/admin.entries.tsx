import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useEntries, useDeleteEntry } from "@/lib/queries";
import { fullDate } from "@/lib/format";

export const Route = createFileRoute("/admin/entries")({
  head: () => ({ meta: [{ title: "Entries — vain admin" }] }),
  component: EntriesAdmin,
});

function EntriesAdmin() {
  const { data: entries = [], isLoading } = useEntries({ includeDrafts: true });
  const del = useDeleteEntry();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">All entries</h1>
        <Link
          to="/admin/write"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          + New
        </Link>
      </div>
      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 hairline-t">
          {entries.map((e) => (
            <div key={e.id} className="hairline-b flex items-center gap-3 py-3 text-sm">
              <div className="w-16 text-[10px] uppercase tracking-wider text-muted-foreground">
                {e.type}
                {e.draft && " · draft"}
              </div>
              <div className="min-w-0 flex-1 truncate">
                {e.type === "article" ? (e.title || "Untitled") : (e.body || "—")}
              </div>
              <div className="hidden w-32 text-xs text-muted-foreground sm:block">
                {fullDate(e.createdAt)}
              </div>
              <div className="hidden w-20 text-xs text-muted-foreground sm:block">
                {e.views} views
              </div>
              <Link
                to="/admin/write"
                search={{ id: e.id }}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => {
                  if (confirm("Delete this entry?")) del.mutate(e.id);
                }}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
