import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ActionBar } from "@/components/ActionBar";
import { MediaPreview } from "@/components/MediaPreview";
import { Comments } from "@/components/Comments";
import { useEntry, useIncrementView, useEntryAuthor } from "@/lib/queries";
import { fullDate, useTimeAgo } from "@/lib/format";
import { renderTextWithEmojiAndStickers } from "@/lib/emoji";
import { isUuid } from "@/lib/slug";

export const Route = createFileRoute("/post/$postId")({
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(postId);
  const { data: author } = useEntryAuthor(entry?.authorId);
  const inc = useIncrementView();

  useEffect(() => {
    if (entry && entry.slug && isUuid(postId) && entry.slug !== postId) {
      navigate({ to: "/post/$postId", params: { postId: entry.slug }, replace: true });
    }
  }, [entry, postId, navigate]);

  useEffect(() => {
    if (entry?.id) inc.mutate(entry.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!entry || entry.type !== "post") {
    return (
      <Layout>
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Post not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm underline">Go home</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <article className="hairline-b pb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-subtle">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-medium">
                {(author?.displayName || author?.username || "u").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <PostMeta
              authorName={author?.displayName || author?.username || "user"}
              username={author?.username || "user"}
              createdAt={entry.createdAt}
            />
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">
              {renderTextWithEmojiAndStickers(entry.body)}
            </p>
            {entry.media.length > 0 && (
              <div className="mt-4">
                <MediaPreview media={entry.media} />
              </div>
            )}
            {entry.tags.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {entry.tags.map((t) => `#${t}`).join("  ")}
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              {fullDate(entry.createdAt)} · {entry.views} views
            </div>
            <ActionBar entry={entry} className="mt-4 -ml-2" />
          </div>
        </div>
      </article>

      <Comments entryId={entry.id} />
    </Layout>
  );
}

function PostMeta({
  authorName,
  username,
  createdAt,
}: {
  authorName: string;
  username: string;
  createdAt: string;
}) {
  const ago = useTimeAgo(createdAt);
  const isReal = username && username !== "user";
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {isReal ? (
        <Link
          to="/u/$username"
          params={{ username }}
          className="font-medium text-foreground hover:underline"
        >
          {authorName}
        </Link>
      ) : (
        <span className="font-medium text-foreground">{authorName}</span>
      )}
      {isReal ? (
        <Link to="/u/$username" params={{ username }} className="hover:underline">
          @{username}
        </Link>
      ) : (
        <span>@{username}</span>
      )}
      <span>·</span>
      <span title={new Date(createdAt).toLocaleString()}>{ago}</span>
    </div>
  );
}
