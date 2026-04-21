import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Trash2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useComments,
  useAddComment,
  useDeleteComment,
  useToggleCommentLike,
} from "@/lib/queries";
import { useTimeAgo } from "@/lib/format";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Comment } from "@/lib/types";

export function Comments({ entryId }: { entryId: string }) {
  const { user, isAdmin, username } = useAuth();
  const { data: comments = [], isLoading } = useComments(entryId);
  const addComment = useAddComment();
  const [text, setText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    await addComment.mutateAsync({ entryId, body });
    setText("");
  }

  return (
    <section className="mt-10" data-replies>
      <h2 className="font-serif text-sm font-semibold tracking-wide text-muted-foreground">
        Replies {comments.length > 0 && <span className="ml-1 text-muted-foreground/70">· {comments.length}</span>}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-subtle px-3 py-2 text-sm focus:outline-none focus:border-foreground/60"
            />
            <div className="mt-1 text-[11px] text-muted-foreground">
              Replying as <span className="text-foreground">@{username ?? "you"}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!text.trim() || addComment.isPending}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:mt-0"
          >
            <Send className="h-3.5 w-3.5" />
            {addComment.isPending ? "Posting…" : "Reply"}
          </button>
        </form>
      ) : (
        <div className="mt-4 rounded-md border border-border bg-subtle px-3 py-3 text-sm text-muted-foreground">
          <Link to="/auth" className="text-foreground underline underline-offset-2">
            Sign in
          </Link>{" "}
          to leave a reply.
        </div>
      )}

      <div className="mt-6 flex flex-col">
        {isLoading && (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading replies…</div>
        )}
        {!isLoading && comments.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No replies yet.</div>
        )}
        {comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            canDelete={!!user && (isAdmin || user.id === c.authorId)}
          />
        ))}
      </div>
    </section>
  );
}

function CommentRow({ comment, canDelete }: { comment: Comment; canDelete: boolean }) {
  const ago = useTimeAgo(comment.createdAt);
  const toggleLike = useToggleCommentLike();
  const del = useDeleteComment();
  const { user } = useAuth();
  return (
    <div className="hairline-b flex gap-3 py-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-subtle text-xs font-medium">
        {comment.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.authorName}</span>
          <span>·</span>
          <span title={new Date(comment.createdAt).toLocaleString()}>{ago}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {comment.body}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={() => {
              if (!user) return;
              toggleLike.mutate({ commentId: comment.id, liked: comment.liked });
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-subtle hover:text-foreground",
              comment.liked && "text-foreground",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", comment.liked && "fill-current")} />
            <span className="text-[11px] tabular-nums">{compactNumber(comment.likes)}</span>
          </button>
          {canDelete && (
            <button
              onClick={() => {
                if (window.confirm("Delete this reply?")) del.mutate(comment.id);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-subtle hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
