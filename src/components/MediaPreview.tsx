import type { MediaAttachment } from "@/lib/types";
import { VideoPlayer, AudioPlayer } from "./MediaPlayers";

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
      <div className="overflow-hidden rounded-md border border-border">
        <VideoPlayer src={media.url} />
      </div>
    );
  }
  // audio
  return <AudioPlayer src={media.url} title={media.alt} />;
}
