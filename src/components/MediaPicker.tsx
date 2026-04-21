import { Image as ImageIcon, Film, Music, X, Loader2 } from "lucide-react";
import { useState } from "react";
import type { MediaAttachment, MediaType } from "@/lib/types";
import { MediaItem } from "./MediaPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function newId(prefix = "m") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface Props {
  media: MediaAttachment[];
  onChange: (m: MediaAttachment[]) => void;
}

export function MediaPicker({ media, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

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
          {media.map((m) => (
            <div key={m.id} className="relative">
              <MediaItem media={m} />
              <button
                type="button"
                onClick={() => onChange(media.filter((x) => x.id !== m.id))}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/90 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
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
