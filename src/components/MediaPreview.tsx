import type { MediaAttachment } from "@/lib/types";
import { Music } from "lucide-react";

export function MediaPreview({ media }: { media: MediaAttachment[] }) {
  if (!media.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {media.map((m) => (
        <MediaItem key={m.id} media={m} />
      ))}
    </div>
  );
}

export function MediaItem({ media }: { media: MediaAttachment }) {
  if (media.type === "image") {
    return (
      <div className="overflow-hidden rounded-md border border-border">
        <img
          src={media.url}
          alt={media.alt ?? ""}
          className="h-auto w-full object-cover"
        />
      </div>
    );
  }
  if (media.type === "video") {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-black">
        <video
          src={media.url}
          controls
          className="h-auto w-full"
        />
      </div>
    );
  }
  // audio
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-subtle px-3 py-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground">
        <Music className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">
          {media.alt || "Audio"}
        </div>
        <audio
          src={media.url}
          controls
          className="mt-1 w-full"
        />
      </div>
    </div>
  );
}
