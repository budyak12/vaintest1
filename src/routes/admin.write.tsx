import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Save, Send, FileText, Type, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { RichEditor } from "@/components/RichEditor";
import { MediaPicker } from "@/components/MediaPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TagInput } from "@/components/TagInput";
import { EmojiPicker } from "@/components/EmojiPicker";
import { emojiShortcode } from "@/lib/emoji";
import { useEntry, useUpsertEntry } from "@/lib/queries";
import type { Entry, Article, ShortPost } from "@/lib/types";
import { cn } from "@/lib/utils";

function validateSearch(search: Record<string, unknown>) {
  return {
    id: typeof search.id === "string" ? search.id : undefined,
    type: search.type === "post" || search.type === "article" ? search.type : undefined,
  } as { id?: string; type?: "post" | "article" };
}

export const Route = createFileRoute("/admin/write")({
  validateSearch,
  head: () => ({ meta: [{ title: "Write — vain admin" }] }),
  component: WriteAdmin,
});

function emptyPost(): ShortPost {
  return {
    id: "", type: "post", authorId: "", createdAt: "", updatedAt: "",
    tags: [], draft: false, views: 0, likes: 0, comments: 0, bookmarked: false, liked: false,
    body: "", media: [],
  };
}
function emptyArticle(): Article {
  return {
    id: "", type: "article", authorId: "", createdAt: "", updatedAt: "",
    tags: [], draft: false, views: 0, likes: 0, comments: 0, bookmarked: false, liked: false,
    title: "", subtitle: "", coverUrl: undefined, contentHtml: "", readingMinutes: 1, media: [],
  };
}

function WriteAdmin() {
  const { id, type: typeParam } = Route.useSearch();
  const navigate = useNavigate();
  const { data: existing } = useEntry(id);
  const upsert = useUpsertEntry();

  const [mode, setMode] = useState<"post" | "article">(typeParam ?? "post");
  const [draft, setDraft] = useState<Entry>(() => emptyPost());

  useEffect(() => {
    if (existing) {
      setDraft(existing);
      setMode(existing.type);
    }
  }, [existing]);

  function switchMode(next: "post" | "article") {
    if (next === mode) return;
    setMode(next);
    setDraft(next === "post" ? emptyPost() : emptyArticle());
  }

  async function publish(asDraft: boolean) {
    const payload = {
      ...draft,
      id: id || undefined,
      type: mode,
      draft: asDraft,
    } as Partial<Article> & Partial<ShortPost> & { id?: string; type: "post" | "article" };
    if (mode === "article") {
      const a = draft as Article;
      // Use the value the author entered; clamp to a sensible minimum.
      (payload as Partial<Article>).readingMinutes = Math.max(1, Math.round(a.readingMinutes || 1));
    }
    const saved = await upsert.mutateAsync(payload);
    if (asDraft) {
      navigate({ to: "/admin/entries" });
    } else if (saved) {
      if (mode === "post") navigate({ to: "/post/$postId", params: { postId: saved.id } });
      else navigate({ to: "/article/$articleId", params: { articleId: saved.id } });
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full overflow-hidden rounded-md border border-border text-xs sm:w-auto">
          <ModeBtn active={mode === "post"} onClick={() => switchMode("post")}>
            <Type className="h-3.5 w-3.5" /> Short post
          </ModeBtn>
          <ModeBtn active={mode === "article"} onClick={() => switchMode("article")}>
            <FileText className="h-3.5 w-3.5" /> Article
          </ModeBtn>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void publish(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-subtle hover:text-foreground sm:flex-initial"
          >
            <Save className="h-3.5 w-3.5" /> Save draft
          </button>
          <button
            onClick={() => void publish(false)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 sm:flex-initial"
          >
            <Send className="h-3.5 w-3.5" /> Publish
          </button>
        </div>
      </div>

      {mode === "post" ? (
        <PostEditor post={draft as ShortPost} onChange={(p) => setDraft(p)} />
      ) : (
        <ArticleEditor article={draft as Article} onChange={(a) => setDraft(a)} />
      )}

      <div className="mt-8">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Tags</div>
        <TagInput
          tags={draft.tags}
          onChange={(tags) => setDraft((d) => ({ ...d, tags }) as Entry)}
        />
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-subtle hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PostEditor({ post, onChange }: { post: ShortPost; onChange: (p: ShortPost) => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  function insertAtCursor(text: string) {
    const ta = taRef.current;
    if (!ta) {
      onChange({ ...post, body: post.body + text });
      return;
    }
    const start = ta.selectionStart ?? post.body.length;
    const end = ta.selectionEnd ?? post.body.length;
    const next = post.body.slice(0, start) + text + post.body.slice(end);
    onChange({ ...post, body: next });
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + text.length;
      ta.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <textarea
        ref={taRef}
        autoFocus
        value={post.body}
        onChange={(e) => onChange({ ...post, body: e.target.value })}
        placeholder="hi there! :)"
        rows={5}
        className="w-full resize-none border-0 bg-transparent text-xl leading-relaxed focus:outline-none"
      />
      <div className="flex items-center gap-1 text-muted-foreground">
        <EmojiPicker onPick={(name) => insertAtCursor(emojiShortcode(name))} />
        <span className="text-[11px] uppercase tracking-wider">Emoji</span>
      </div>
      <div className="hairline-t pt-4">
        <MediaPicker media={post.media} onChange={(media) => onChange({ ...post, media })} />
      </div>
    </div>
  );
}

function ArticleEditor({ article, onChange }: { article: Article; onChange: (a: Article) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <input
        autoFocus
        value={article.title}
        onChange={(e) => onChange({ ...article, title: e.target.value })}
        placeholder="Title"
        className="w-full border-0 bg-transparent font-serif text-2xl font-semibold tracking-tight focus:outline-none sm:text-4xl"
      />
      <CoverPicker
        coverUrl={article.coverUrl}
        onChange={(coverUrl) => onChange({ ...article, coverUrl })}
      />
      <input
        value={article.subtitle ?? ""}
        onChange={(e) => onChange({ ...article, subtitle: e.target.value })}
        placeholder="Subtitle (optional)"
        className="w-full border-0 bg-transparent text-base text-muted-foreground focus:outline-none sm:text-lg"
      />
      <div className="flex items-center gap-2">
        <label
          htmlFor="reading-min"
          className="text-[11px] uppercase tracking-wider text-muted-foreground"
        >
          Reading time
        </label>
        <input
          id="reading-min"
          type="number"
          min={1}
          max={999}
          value={article.readingMinutes || ""}
          onChange={(e) =>
            onChange({
              ...article,
              readingMinutes: Math.max(1, parseInt(e.target.value || "1", 10) || 1),
            })
          }
          className="w-16 rounded-md border border-border bg-subtle px-2 py-1 text-sm tabular-nums focus:border-foreground/60 focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">min read</span>
      </div>
      <RichEditor
        value={article.contentHtml}
        onChange={(contentHtml) => onChange({ ...article, contentHtml })}
        placeholder="we're all waiting for ur new post!"
      />
      <div className="hairline-t pt-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Media (image / video / audio)
        </div>
        <MediaPicker media={article.media} onChange={(media) => onChange({ ...article, media })} />
      </div>
    </div>
  );
}

function CoverPicker({
  coverUrl,
  onChange,
}: {
  coverUrl?: string;
  onChange: (url: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required to upload files");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/cover_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function pasteUrl() {
    const url = window.prompt("Paste cover image URL");
    if (url) onChange(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Cover image (preview)
      </div>
      {coverUrl ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-subtle">
          <img
            src={coverUrl}
            alt=""
            className="max-h-64 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground hover:text-foreground"
            title="Remove cover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center overflow-hidden rounded-md border border-border text-xs">
            <label className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              Upload cover
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={pasteUrl}
              className="border-l border-border px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
              title="Paste URL"
            >
              URL
            </button>
          </div>
          {uploading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
