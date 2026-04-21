import type { Database } from "@/integrations/supabase/types";
import type { Entry, MediaAttachment, Author, Comment } from "./types";

export type EntryRow = Database["public"]["Tables"]["entries"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

export function mapEntry(
  row: EntryRow,
  ctx?: {
    likes?: number;
    comments?: number;
    liked?: boolean;
    bookmarked?: boolean;
  },
): Entry {
  const base = {
    id: row.id,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags ?? [],
    draft: row.draft,
    views: row.views ?? 0,
    likes: ctx?.likes ?? 0,
    comments: ctx?.comments ?? 0,
    bookmarked: ctx?.bookmarked ?? false,
    liked: ctx?.liked ?? false,
  };

  if (row.type === "post") {
    return {
      ...base,
      type: "post",
      body: row.body ?? "",
      media: ((row.media as unknown) as MediaAttachment[]) ?? [],
    };
  }
  return {
    ...base,
    type: "article",
    title: row.title ?? "",
    subtitle: row.subtitle ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    contentHtml: row.content_html ?? "",
    readingMinutes: row.reading_minutes ?? 1,
    media: ((row.media as unknown) as MediaAttachment[]) ?? [],
  };
}

export function mapAuthor(row: ProfileRow): Author {
  return {
    id: row.id,
    username: row.username ?? "",
    displayName: row.display_name ?? row.username ?? "anonymous",
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    links: ((row.links as unknown) as { label: string; url: string }[]) ?? [],
  };
}

export function mapComment(
  row: CommentRow & { profiles?: { display_name: string | null; username: string | null } | null },
  ctx?: { likes?: number; liked?: boolean },
): Comment {
  const name =
    row.profiles?.display_name ?? row.profiles?.username ?? "reader";
  return {
    id: row.id,
    entryId: row.entry_id,
    authorId: row.author_id,
    authorName: name,
    body: row.body,
    createdAt: row.created_at,
    likes: ctx?.likes ?? 0,
    liked: ctx?.liked ?? false,
  };
}

/** Convert a username (used in UI) to internal email used by Supabase Auth. */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@vain.local`;
}
