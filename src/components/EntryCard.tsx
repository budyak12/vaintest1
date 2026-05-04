import { Link, useNavigate } from "@tanstack/react-router";
import { useEntryAuthor } from "@/lib/queries";
import { useTimeAgo } from "@/lib/format";
import { ActionBar } from "./ActionBar";
import { MediaPreview } from "./MediaPreview";
import { renderTextWithEmojiAndStickers } from "@/lib/emoji";
import { useReadingProgress } from "@/lib/reading-progress";
import type { ShortPost, Article, Entry } from "@/lib/types";

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-subtle">
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-subtle text-xs font-medium text-foreground">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function MetaLine({ entry }: { entry: Entry }) {
  const { data: author } = useEntryAuthor(entry.authorId);
  const ago = useTimeAgo(entry.createdAt);
  const navigate = useNavigate();
  const display = author?.displayName || author?.username || "user";
  const handle = author?.username || "user";

  const goProfile = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!author?.username) return;
    e.preventDefault();
    e.stopPropagation();
    void navigate({ to: "/u/$username", params: { username: author.username } });
  };

  const linkClass = author?.username ? "cursor-pointer hover:underline" : "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span
        role={author?.username ? "link" : undefined}
        tabIndex={author?.username ? 0 : undefined}
        onClick={goProfile}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") goProfile(e);
        }}
        className={`font-medium text-foreground ${linkClass}`}
      >
        {display}
      </span>
      <span
        role={author?.username ? "link" : undefined}
        tabIndex={author?.username ? 0 : undefined}
        onClick={goProfile}
        className={linkClass}
      >
        @{handle}
      </span>
      <span>·</span>
      <span title={new Date(entry.createdAt).toLocaleString()}>{ago}</span>
      {entry.tags.length > 0 && (
        <>
          <span>·</span>
          <span className="truncate">{entry.tags.map((t) => `#${t}`).join(" ")}</span>
        </>
      )}
    </div>
  );
}

export function PostCard({ post }: { post: ShortPost }) {
  const { data: author } = useEntryAuthor(post.authorId);
  return (
    <Link
      to="/post/$postId"
      params={{ postId: post.slug || post.id }}
      className="group block hairline-b px-1 py-5 transition-colors hover:bg-subtle/40"
    >
      <div className="flex gap-3">
        <Avatar name={author?.displayName || author?.username || "u"} url={author?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <MetaLine entry={post} />
          <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {renderTextWithEmojiAndStickers(post.body)}
          </p>
          {post.media.length > 0 && (
            <div className="mt-3">
              <MediaPreview media={post.media} />
            </div>
          )}
          <ActionBar entry={post} className="mt-3 -ml-2" />
        </div>
      </div>
    </Link>
  );
}

export function ArticleCard({ article }: { article: Article }) {
  const { data: author } = useEntryAuthor(article.authorId);
  const readPct = useReadingProgress(article.id);
  return (
    <Link
      to="/article/$articleId"
      params={{ articleId: article.slug || article.id }}
      className="group block hairline-b py-7 transition-colors"
    >
      <div className="flex gap-3">
        <Avatar name={author?.displayName || author?.username || "u"} url={author?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <MetaLine entry={article} />
          <h2 className="mt-2 font-serif text-xl font-semibold leading-tight tracking-tight text-foreground transition-opacity group-hover:opacity-80 sm:text-2xl">
            {article.title}
          </h2>
          {article.subtitle && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {article.subtitle}
            </p>
          )}
          {article.coverUrl && (
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-subtle">
              <img
                src={article.coverUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-auto w-full object-contain"
              />
            </div>
          )}
          <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Article · {article.readingMinutes} min read
            {readPct > 0 && readPct < 95 && (
              <>
                {" · "}
                <span className="text-foreground">{readPct}% read</span>
              </>
            )}
            {readPct >= 95 && (
              <>
                {" · "}
                <span className="text-foreground">read</span>
              </>
            )}
          </div>
          {readPct > 0 && readPct < 95 && (
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full bg-foreground transition-[width] duration-200 ease-out"
                style={{ width: `${readPct}%` }}
              />
            </div>
          )}
          <ActionBar entry={article} className="mt-4 -ml-2" />
        </div>
      </div>
    </Link>
  );
}

export function EntryCard({ entry }: { entry: Entry }) {
  return entry.type === "post" ? (
    <PostCard post={entry} />
  ) : (
    <ArticleCard article={entry} />
  );
}
