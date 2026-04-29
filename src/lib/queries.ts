import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthor, mapComment, mapEntry } from "./supabase-helpers";
import type { Entry, Comment, Author } from "./types";
import { useAuth } from "./auth";

const SEED_AUTHOR_ID = "00000000-0000-0000-0000-000000000001";

/* -------------------- ENTRIES -------------------- */

export function useEntries(opts: { includeDrafts?: boolean } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["entries", { includeDrafts: !!opts.includeDrafts, uid: user?.id ?? null }],
    queryFn: async () => fetchEntries(user?.id ?? null, opts.includeDrafts ?? false),
  });
}

export function useEntry(idOrSlug: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!idOrSlug,
    queryKey: ["entry", idOrSlug, user?.id ?? null],
    queryFn: async () => {
      if (!idOrSlug) return null;
      const { isUuid } = await import("./slug");
      const column = isUuid(idOrSlug) ? "id" : "slug";
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq(column, idOrSlug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const ctx = await fetchEntryContext([data.id], user?.id ?? null);
      return mapEntry(data, ctx[data.id]);
    },
  });
}

async function fetchEntries(uid: string | null, includeDrafts: boolean) {
  let q = supabase.from("entries").select("*").order("created_at", { ascending: false });
  if (!includeDrafts) q = q.eq("draft", false);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];
  const ctx = await fetchEntryContext(
    data.map((e) => e.id),
    uid,
  );
  return data.map((e) => mapEntry(e, ctx[e.id]));
}

async function fetchEntryContext(ids: string[], uid: string | null) {
  if (ids.length === 0) return {};
  const [likesRes, commentsRes, myLikesRes, myBookmarksRes] = await Promise.all([
    supabase.from("entry_likes").select("entry_id").in("entry_id", ids),
    supabase.from("comments").select("entry_id").in("entry_id", ids),
    uid
      ? supabase.from("entry_likes").select("entry_id").in("entry_id", ids).eq("user_id", uid)
      : Promise.resolve({ data: [], error: null }),
    uid
      ? supabase.from("bookmarks").select("entry_id").in("entry_id", ids).eq("user_id", uid)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const result: Record<string, { likes: number; comments: number; liked: boolean; bookmarked: boolean }> = {};
  for (const id of ids) {
    result[id] = { likes: 0, comments: 0, liked: false, bookmarked: false };
  }
  for (const row of likesRes.data ?? []) result[row.entry_id].likes += 1;
  for (const row of commentsRes.data ?? []) result[row.entry_id].comments += 1;
  for (const row of (myLikesRes.data as { entry_id: string }[]) ?? []) result[row.entry_id].liked = true;
  for (const row of (myBookmarksRes.data as { entry_id: string }[]) ?? []) result[row.entry_id].bookmarked = true;
  return result;
}

/* -------------------- LIKES & BOOKMARKS -------------------- */

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, liked }: { entryId: string; liked: boolean }) => {
      if (!user) throw new Error("Sign in to like.");
      if (liked) {
        const { error } = await supabase
          .from("entry_likes")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("entry_likes")
          .insert({ entry_id: entryId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["entry"] });
    },
  });
}

export function useToggleBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, bookmarked }: { entryId: string; bookmarked: boolean }) => {
      if (!user) throw new Error("Sign in to bookmark.");
      if (bookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ entry_id: entryId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["entry"] });
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useBookmarkedEntries() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["bookmarks", user?.id ?? null],
    queryFn: async () => {
      if (!user) return [];
      const { data: bms, error: bmErr } = await supabase
        .from("bookmarks")
        .select("entry_id")
        .eq("user_id", user.id);
      if (bmErr) throw bmErr;
      const ids = (bms ?? []).map((b) => b.entry_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .in("id", ids)
        .eq("draft", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ctx = await fetchEntryContext(
        (data ?? []).map((e) => e.id),
        user.id,
      );
      return (data ?? []).map((e) => mapEntry(e, ctx[e.id]));
    },
  });
}

/* -------------------- ENTRY CRUD (admin) -------------------- */

export function useUpsertEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Partial<Entry> & { id?: string; type: "post" | "article" }) => {
      if (!user) throw new Error("Not authenticated");
      const { buildEntrySlug } = await import("./slug");
      const isPost = entry.type === "post";

      // Build a slug from title (article) or body (post). For posts we always
      // append a short id suffix for readability + uniqueness.
      const slug = buildEntrySlug({
        type: entry.type,
        title: (entry as { title?: string }).title,
        body: (entry as { body?: string }).body,
        id: entry.id,
      });

      const base = {
        type: entry.type,
        author_id: user.id,
        tags: entry.tags ?? [],
        draft: entry.draft ?? false,
      };
      const row = isPost
        ? {
            ...base,
            body: (entry as { body?: string }).body ?? "",
            media: ((entry as { media?: unknown }).media ?? []) as never,
            title: null,
            subtitle: null,
            cover_url: null,
            content_html: null,
            slug,
          }
        : {
            ...base,
            title: (entry as { title?: string }).title ?? "",
            subtitle: (entry as { subtitle?: string }).subtitle ?? null,
            cover_url: (entry as { coverUrl?: string }).coverUrl ?? null,
            show_cover_on_article:
              (entry as { showCoverOnArticle?: boolean }).showCoverOnArticle ?? true,
            content_html: (entry as { contentHtml?: string }).contentHtml ?? "",
            reading_minutes: (entry as { readingMinutes?: number }).readingMinutes ?? 1,
            body: null,
            media: ((entry as { media?: unknown }).media ?? []) as never,
            slug,
          };

      // If slug collides with another row, fall back to slug-<random>.
      async function ensureUniqueSlug(candidate: string): Promise<string> {
        let final = candidate;
        for (let i = 0; i < 5; i++) {
          const { data } = await supabase
            .from("entries")
            .select("id")
            .eq("slug", final)
            .maybeSingle();
          if (!data || data.id === entry.id) return final;
          final = `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
        }
        return final;
      }
      row.slug = await ensureUniqueSlug(slug);

      if (entry.id) {
        const { data, error } = await supabase
          .from("entries")
          .update(row)
          .eq("id", entry.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("entries")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["entry"] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useIncrementView() {
  return useMutation({
    mutationFn: async (entryId: string) => {
      if (typeof window !== "undefined") {
        const key = `viewed:${entryId}`;
        if (window.localStorage.getItem(key)) return;
        window.localStorage.setItem(key, "1");
      }
      const { error } = await supabase.rpc("increment_view", { _entry_id: entryId });
      if (error) throw error;
    },
  });
}

/* -------------------- COMMENTS -------------------- */

export function useComments(entryId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!entryId,
    queryKey: ["comments", entryId, user?.id ?? null],
    queryFn: async (): Promise<Comment[]> => {
      if (!entryId) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("entry_id", entryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const ids = data.map((c) => c.id);
      const authorIds = Array.from(new Set(data.map((c) => c.author_id)));
      const [{ data: likes }, { data: myLikes }, { data: profiles }] = await Promise.all([
        supabase.from("comment_likes").select("comment_id").in("comment_id", ids),
        user
          ? supabase
              .from("comment_likes")
              .select("comment_id")
              .in("comment_id", ids)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
        supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", authorIds),
      ]);
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      for (const r of likes ?? []) counts[r.comment_id] = (counts[r.comment_id] ?? 0) + 1;
      for (const r of (myLikes as { comment_id: string }[]) ?? []) mine.add(r.comment_id);
      const profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { display_name: p.display_name, username: p.username });
      }
      return data.map((c) =>
        mapComment(
          { ...c, profiles: profileMap.get(c.author_id) ?? null } as never,
          { likes: counts[c.id] ?? 0, liked: mine.has(c.id) },
        ),
      );
    },
  });
}

/* -------------------- ENTRY AUTHOR (per-entry) -------------------- */

export function useEntryAuthor(authorId: string | undefined) {
  return useQuery({
    enabled: !!authorId,
    queryKey: ["entry-author", authorId],
    queryFn: async (): Promise<Author | null> => {
      if (!authorId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authorId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapAuthor(data) : null;
    },
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, body }: { entryId: string; body: string }) => {
      if (!user) throw new Error("Sign in to comment.");
      const { error } = await supabase.from("comments").insert({
        entry_id: entryId,
        author_id: user.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["comments", vars.entryId] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
      void qc.invalidateQueries({ queryKey: ["entry", vars.entryId] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comments"] });
      void qc.invalidateQueries({ queryKey: ["admin-comments"] });
      void qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useToggleCommentLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!user) throw new Error("Sign in to like.");
      if (liked) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}

/* -------------------- AUTHOR PROFILE -------------------- */

export function useAuthor(): { data: Author | null; isLoading: boolean } {
  const q = useQuery({
    queryKey: ["author"],
    queryFn: async () => {
      // Public author = the seed author (single-author blog).
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", SEED_AUTHOR_ID)
        .maybeSingle();
      if (error) throw error;
      return data ? mapAuthor(data) : null;
    },
  });
  return { data: q.data ?? null, isLoading: q.isLoading };
}

/* -------------------- PUBLIC USER PROFILE (read-only) -------------------- */

export function useUserProfile(username: string | undefined) {
  return useQuery({
    enabled: !!username,
    queryKey: ["user-profile", username],
    queryFn: async (): Promise<Author | null> => {
      if (!username) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data ? mapAuthor(data) : null;
    },
  });
}

export function useUserEntries(authorId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!authorId,
    queryKey: ["user-entries", authorId, user?.id ?? null],
    queryFn: async (): Promise<Entry[]> => {
      if (!authorId) return [];
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("author_id", authorId)
        .eq("draft", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return [];
      const ctx = await fetchEntryContext(data.map((d) => d.id), user?.id ?? null);
      return data.map((row) => mapEntry(row, ctx[row.id]));
    },
  });
}

/* -------------------- ADMIN COMMENTS LIST -------------------- */

export function useAllCommentsForAdmin() {
  return useQuery({
    queryKey: ["admin-comments"],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const authorIds = Array.from(new Set(data.map((c) => c.author_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", authorIds);
      const profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { display_name: p.display_name, username: p.username });
      }
      return data.map((c) =>
        mapComment({ ...c, profiles: profileMap.get(c.author_id) ?? null } as never),
      );
    },
  });
}

/* -------------------- MEDIA LIBRARY -------------------- */

export function useMediaLibrary() {
  return useQuery({
    queryKey: ["media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media"] });
    },
  });
}

export function useAddMedia() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { type: "image" | "video" | "audio"; url: string; alt?: string }) => {
      const { error } = await supabase.from("media").insert({
        type: input.type,
        url: input.url,
        alt: input.alt ?? null,
        uploaded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["media"] });
    },
  });
}

/* -------------------- ADMIN STATS -------------------- */

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [entries, likes, comments, views] = await Promise.all([
        supabase.from("entries").select("id, type, draft, views", { count: "exact" }),
        supabase.from("entry_likes").select("entry_id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("entries").select("views"),
      ]);
      const totalViews = (views.data ?? []).reduce((s, e) => s + (e.views ?? 0), 0);
      const all = entries.data ?? [];
      return {
        totalEntries: all.length,
        totalPosts: all.filter((e) => e.type === "post").length,
        totalArticles: all.filter((e) => e.type === "article").length,
        totalDrafts: all.filter((e) => e.draft).length,
        totalLikes: likes.count ?? 0,
        totalComments: comments.count ?? 0,
        totalViews,
      };
    },
  });
}

/* -------------------- TAGS -------------------- */

export function useAllTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entries").select("tags");
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        for (const tag of row.tags ?? []) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}
