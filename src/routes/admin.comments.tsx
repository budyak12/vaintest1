import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useAllCommentsForAdmin, useDeleteComment } from "@/lib/queries";
import { fullDate } from "@/lib/format";

export const Route = createFileRoute("/admin/comments")({
  head: () => ({ meta: [{ title: "Comments — vain admin" }] }),
  component: CommentsAdmin,
});

function CommentsAdmin() {
  const { data: items = [], isLoading } = useAllCommentsForAdmin();
  const del = useDeleteComment();
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Comments</h1>
      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="mt-6 hairline-t">
          {items.map((c) => (
            <div key={c.id} className="hairline-b flex items-start gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground">{c.authorName}</span> · {fullDate(c.createdAt)}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
              <button
                onClick={() => del.mutate(c.id)}
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
