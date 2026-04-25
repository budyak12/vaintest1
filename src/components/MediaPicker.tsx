import { Image as ImageIcon, Film, Music, X, Loader2, Star } from "lucide-react";
import { useState } from "react";
import type { MediaAttachment, MediaType } from "@/lib/types";
import { MediaItem } from "./MediaPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function newId(prefix = "m") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface Props {
  media: MediaAttachment[];
  onChange: (m: MediaAttachment[]) => void;
  /** Optional: enables "set as cover" buttons on image items. */
  coverUrl?: string;
  onCoverChange?: (url: string | undefined) => void;
}

export function MediaPicker({ media, onChange, coverUrl, onCoverChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const coverEnabled = typeof onCoverChange === "function";

  function addUrl(type: MediaType) {
    const url = window.prompt(`Paste ${type} URL`);
    if (!url) return;
    const alt = type !== "image" ? window.prompt("Title (optional)") || undefined : undefined;
    onChange([...media, { id: newId("m"), type, url, alt }]);
  }

  async function handleFile(type: MediaType, file: File) {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required to upload files");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      onChange([...media, { id: newId("m"), type, url: data.publicUrl, alt: file.name }]);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {media.length > 0 && (
        <div className="flex flex-col gap-2">
          {media.map((m) => {
            const isCover = coverEnabled && m.type === "image" && m.url === coverUrl;
            return (
              <div key={m.id} className="relative">
                <MediaItem media={m} />
                {/* Top-right: remove */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCover) onCoverChange?.(undefined);
                    onChange(media.filter((x) => x.id !== m.id));
                  }}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground hover:text-foreground"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Top-left: cover toggle (images only, when enabled) */}
                {coverEnabled && m.type === "image" && (
                  <button
                    type="button"
                    onClick={() => onCoverChange?.(isCover ? undefined : m.url)}
                    className={cn(
                      "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-all duration-300",
                      isCover
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background/90 text-muted-foreground hover:text-foreground",
                    )}
                    title={isCover ? "Cover image (click to unset)" : "Use as cover"}
                  >
                    <Star className={cn("h-3 w-3", isCover && "fill-current")} />
                    {isCover ? "Cover" : "Set as cover"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <PickButton label="Image" icon={<ImageIcon className="h-3.5 w-3.5" />} accept="image/*" onFile={(f) => handleFile("image", f)} onUrl={() => addUrl("image")} />
        <PickButton label="Video" icon={<Film className="h-3.5 w-3.5" />} accept="video/*" onFile={(f) => handleFile("video", f)} onUrl={() => addUrl("video")} />
        <PickButton label="Audio" icon={<Music className="h-3.5 w-3.5" />} accept="audio/*" onFile={(f) => handleFile("audio", f)} onUrl={() => addUrl("audio")} />
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
          </span>
        )}
      </div>
    </div>
  );
}

function PickButton({
  label,
  icon,
  accept,
  onFile,
  onUrl,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  onFile: (f: File) => void;
  onUrl: () => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-border text-xs">
      <label className="inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground">
        {icon}
        {label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      <button
        type="button"
        onClick={onUrl}
        className="border-l border-border px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
        title="Paste URL"
      >
        URL
      </button>
    </div>
  );
}
