import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStickers, useUploadSticker, useDeleteSticker } from "@/lib/sticker-queries";
import { Sticker } from "@/components/Sticker";

export const Route = createFileRoute("/admin/stickers")({
  head: () => ({ meta: [{ title: "Stickers — vain admin" }] }),
  component: StickerAdmin,
});

function StickerAdmin() {
  const { data: stickers = [], isLoading } = useStickers();
  const upload = useUploadSticker();
  const del = useDeleteSticker();
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync({ file, alt: alt || undefined });
        toast.success(`Sticker "${file.name}" uploaded`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setAlt("");
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Stickers</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Telegram-style video stickers (.webm, VP9, no audio, ≤ 10 s, ≤ 512 KB,
        одна сторона ровно 512 px).
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Optional name"
          className="min-w-[12rem] flex-1 rounded-md border border-border bg-subtle px-2.5 py-1.5 text-xs focus:outline-none"
        />
        <input
          ref={fileRef}
          type="file"
          accept="video/webm,.webm"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
        >
          {upload.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload .webm
        </button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : stickers.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No stickers yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {stickers.map((s) => (
            <div
              key={s.id}
              className="group relative flex flex-col items-center gap-1 rounded-md border border-border bg-subtle p-2"
            >
              <Sticker src={s.url} size={96} alt={s.alt ?? undefined} />
              <div className="w-full truncate text-center text-[10px] text-muted-foreground">
                {s.alt || "—"}
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                {s.width}×{s.height}
                {s.sizeBytes ? ` · ${(s.sizeBytes / 1024).toFixed(0)} KB` : ""}
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Delete this sticker?")) del.mutate(s.id);
                }}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Delete sticker"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
