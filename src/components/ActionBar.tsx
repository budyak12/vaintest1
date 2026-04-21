import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToggleLike, useToggleBookmark } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { Entry } from "@/lib/types";

export function ActionBar({ entry, className }: { entry: Entry; className?: string }) {
  const toggleLike = useToggleLike();
  const toggleBookmark = useToggleBookmark();
  const { user } = useAuth();
  const navigate = useNavigate();

  function requireAuth(action: () => void) {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    action();
  }

  function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url =
      window.location.origin +
      (entry.type === "article" ? `/article/${entry.id}` : `/post/${entry.id}`);
    if (navigator.share) void navigator.share({ url });
    else void navigator.clipboard?.writeText(url);
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <ActionButton
        active={entry.liked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requireAuth(() => toggleLike.mutate({ entryId: entry.id, liked: entry.liked }));
        }}
        label={compactNumber(entry.likes)}
        icon={<Heart className={cn("h-3.5 w-3.5", entry.liked && "fill-current")} />}
      />
      <ActionButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const url =
            (entry.type === "article" ? `/article/${entry.id}` : `/post/${entry.id}`) +
            "#replies";
          if (window.location.pathname.endsWith(`/${entry.id}`)) {
            document
              .querySelector('[data-replies]')
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            navigate({ to: url });
          }
        }}
        label={compactNumber(entry.comments)}
        icon={<MessageCircle className="h-3.5 w-3.5" />}
      />
      <ActionButton
        active={entry.bookmarked}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requireAuth(() =>
            toggleBookmark.mutate({ entryId: entry.id, bookmarked: entry.bookmarked }),
          );
        }}
        icon={<Bookmark className={cn("h-3.5 w-3.5", entry.bookmarked && "fill-current")} />}
      />
      <ActionButton onClick={share} icon={<Share2 className="h-3.5 w-3.5" />} />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-subtle hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {icon}
      {label && <span className="text-[11px] tabular-nums">{label}</span>}
    </button>
  );
}
