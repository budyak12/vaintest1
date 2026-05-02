import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Trash2, Send, Paperclip, X, Loader2 } from "lucide-react";
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
import type { Comment, MediaAttachment, MediaType } from "@/lib/types";
import { StickerPickerPopover } from "./StickerPickerPopover";
import { emojiShortcode } from "@/lib/emoji";
import { renderTextWithEmoji } from "@/lib/emoji";
import { Sticker } from "./Sticker";
import { MediaItem } from "./MediaPreview";
import { uploadToStorage, detectMediaType } from "@/components/editor/upload";
import { toast } from "sonner";

/* ---------- media token (de)serialization ---------- */
// Tokens are stored on a dedicated line inside the comment body:
//   [media:image:https://…|alt text]
//   [sticker:https://…/file.webm]
// so they roundtrip through the plain-text `comments.body` column.

const MEDIA_TOKEN_RE = /\[media:(image|video|audio):([^\]|]+)(?:\|([^\]]*))?\]/g;
const STICKER_TOKEN_RE = /\[sticker:([^\]]+)\]/g;
// Fallback: bare URLs pointing at uploaded media. Used to render media even
// if the token wrapper was stripped or the client that wrote the comment was
// older than the tokenization logic.
const BARE_URL_RE = /(https?:\/\/[^\s<>"'`\]]+)/g;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;

function classifyUrl(url: string): MediaType | null {
  if (IMAGE_EXT_RE.test(url)) return "image";
  if (VIDEO_EXT_RE.test(url)) return "video";
  if (AUDIO_EXT_RE.test(url)) return "audio";
  // Supabase storage URLs without an extension: assume image by default.
  if (/\/storage\/v1\/object\/public\//.test(url)) return "image";
  return null;
}

interface ParsedComment {
  text: string;
  media: MediaAttachment[];
  stickers: string[];
}

function parseCommentBody(body: string): ParsedComment {
  const media: MediaAttachment[] = [];
  const stickers: string[] = [];
  let i = 0;
  // 0. Extract sticker tokens.
  let text = body.replace(STICKER_TOKEN_RE, (_m, url: string) => {
    stickers.push(url);
    return "";
  });
  // 1. Extract explicit [media:...] tokens first.
  text = text.replace(MEDIA_TOKEN_RE, (_m, type: MediaType, url: string, alt?: string) => {
    media.push({ id: `c_${i++}`, type, url, alt: alt || undefined });
    return "";
  });
  // 2. Extract bare media URLs as a safety net for older comments.
  text = text.replace(BARE_URL_RE, (url) => {
    const type = classifyUrl(url);
    if (!type) return url;
    media.push({ id: `c_${i++}`, type, url });
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), media, stickers };
}

function mediaToken(m: MediaAttachment): string {
  const alt = (m.alt || "").replace(/[|\]]/g, "");
  return `[media:${m.type}:${m.url}${alt ? `|${alt}` : ""}]`;
}

function stickerToken(url: string): string {
  return `[sticker:${url}]`;
}

/* ---------- main component ---------- */

export function Comments({ entryId }: { entryId: string }) {
  const { user, isAdmin, username } = useAuth();
  const { data: comments = [], isLoading } = useComments(entryId);
  const addComment = useAddComment();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(snippet: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + snippet);
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const newOnes: MediaAttachment[] = [];
      for (const file of Array.from(files)) {
        const type = detectMediaType(file);
        if (!type) {
          toast.error(`Unsupported file: ${file.name}`);
          continue;
        }
        const { url, alt } = await uploadToStorage(file, type);
        newOnes.push({
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          url,
          alt,
        });
      }
      if (newOnes.length) setAttachments((a) => [...a, ...newOnes]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!user) return;
    if (!trimmed && attachments.length === 0) return;
    const mediaPart = attachments.map(mediaToken).join("\n");
    const body = [trimmed, mediaPart].filter(Boolean).join(trimmed && mediaPart ? "\n\n" : "");
    await addComment.mutateAsync({ entryId, body });
    setText("");
    setAttachments([]);
  }

  const canSubmit = (text.trim().length > 0 || attachments.length > 0) && !uploading;

  return (
    <section className="mt-10" data-replies>
      <h2 className="font-serif text-sm font-semibold tracking-wide text-muted-foreground">
        Replies {comments.length > 0 && <span className="ml-1 text-muted-foreground/70">· {comments.length}</span>}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
          <div className="rounded-md border border-border bg-subtle focus-within:border-foreground/60">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="w-full resize-none bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
            {attachments.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border p-2">
                {attachments.map((m) => (
                  <div key={m.id} className="relative">
                    <MediaItem media={m} />
                    <button
                      type="button"
                      onClick={() => setAttachments((a) => a.filter((x) => x.id !== m.id))}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground hover:text-foreground"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 border-t border-border px-1.5 py-1">
              <StickerPickerPopover
                onPickEmoji={(name) => insertAtCursor(emojiShortcode(name))}
                onPickSticker={async (s) => {
                  // Send the sticker as its own message immediately so it doesn't
                  // collide with text the user might still be typing.
                  await addComment.mutateAsync({ entryId, body: stickerToken(s.url) });
                }}
              />
              <button
                type="button"
                title="Attach media"
                aria-label="Attach media"
                onClick={() => fileInputRef.current?.click()}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  as <span className="text-foreground">@{username ?? "you"}</span>
                </span>
                <button
                  type="submit"
                  disabled={!canSubmit || addComment.isPending}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  {addComment.isPending ? "Posting…" : "Reply"}
                </button>
              </div>
            </div>
          </div>
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
  const parsed = parseCommentBody(comment.body);
  return (
    <div className="hairline-b flex gap-3 py-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-subtle text-xs font-medium">
        {comment.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {comment.authorUsername ? (
            <Link
              to="/u/$username"
              params={{ username: comment.authorUsername }}
              className="font-medium text-foreground hover:underline"
            >
              {comment.authorName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{comment.authorName}</span>
          )}
          <span>·</span>
          <span title={new Date(comment.createdAt).toLocaleString()}>{ago}</span>
        </div>
        {parsed.text && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {renderTextWithEmoji(parsed.text)}
          </p>
        )}
        {parsed.stickers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {parsed.stickers.map((url, idx) => (
              <Sticker key={`s_${idx}`} src={url} size={128} />
            ))}
          </div>
        )}
        {parsed.media.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {parsed.media.map((m) => (
              <MediaItem key={m.id} media={m} />
            ))}
          </div>
        )}
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
