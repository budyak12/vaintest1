import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ActionBar } from "@/components/ActionBar";
import { MediaItem } from "@/components/MediaPreview";
import { ArticleContent } from "@/components/ArticleContent";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { Comments } from "@/components/Comments";
import { useEntry, useIncrementView, useEntryAuthor } from "@/lib/queries";
import { fullDate } from "@/lib/format";
import { isUuid } from "@/lib/slug";
import { extractHeadings } from "@/lib/article-toc";

export const Route = createFileRoute("/article/$articleId")({
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(articleId);
  const { data: author } = useEntryAuthor(entry?.authorId);
  const inc = useIncrementView();

  useEffect(() => {
    if (entry?.id) inc.mutate(entry.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  // If user landed via UUID and entry has a slug, redirect to the pretty URL.
  useEffect(() => {
    if (entry && entry.slug && isUuid(articleId) && entry.slug !== articleId) {
      navigate({
        to: "/article/$articleId",
        params: { articleId: entry.slug },
        replace: true,
      });
    }
  }, [entry, articleId, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!entry || entry.type !== "article") {
    return (
      <Layout>
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Article not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm underline">Go home</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Article · {entry.readingMinutes} min read · {entry.views} views
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          {entry.title}
        </h1>
        {entry.coverUrl && entry.showCoverOnArticle && (
          <div className="mt-5 overflow-hidden rounded-md border border-border bg-subtle">
            <img
              src={entry.coverUrl}
              alt=""
              className="h-auto w-full object-contain"
            />
          </div>
        )}
        {entry.subtitle && (
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">{entry.subtitle}</p>
        )}
        <div className="hairline-b mt-6 flex items-center gap-3 pb-6">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-subtle">
            {author?.avatarUrl ? (
              <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-medium">
                {(author?.displayName || author?.username || "u").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-sm">
            <div className="text-foreground">
              {author?.username ? (
                <Link to="/u/$username" params={{ username: author.username }} className="hover:underline">
                  {author.displayName || author.username}
                </Link>
              ) : (
                author?.displayName || author?.username || "user"
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {author?.username ? (
                <Link to="/u/$username" params={{ username: author.username }} className="hover:underline">
                  @{author.username}
                </Link>
              ) : (
                <>@{author?.username || "user"}</>
              )}
              {" · "}
              {fullDate(entry.createdAt)}
            </div>
          </div>
        </div>
      </header>

      <ArticleContent html={entry.contentHtml} className="prose-editorial" />

      {entry.type === "article" && entry.media && entry.media.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {entry.media.map((m) => (
            <MediaItem key={m.id} media={m} />
          ))}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="hairline-t mt-12 pt-6 text-xs text-muted-foreground">
          {entry.tags.map((t) => `#${t}`).join("  ")}
        </div>
      )}

      <div className="hairline-t mt-6 pt-4">
        <ActionBar entry={entry} className="-ml-2" />
      </div>

      <Comments entryId={entry.id} />
    </Layout>
  );
}
