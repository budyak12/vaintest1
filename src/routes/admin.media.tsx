import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useMediaLibrary, useAddMedia, useDeleteMedia } from "@/lib/queries";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media — vain admin" }] }),
  component: MediaAdmin,
});

function MediaAdmin() {
  const { data: media = [], isLoading } = useMediaLibrary();
  const add = useAddMedia();
  const del = useDeleteMedia();
  const [type, setType] = useState<"image" | "video" | "audio">("image");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Media library</h1>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="rounded-md border border-border bg-subtle px-2 py-1.5 text-xs">
          <option value="image">image</option>
          <option value="video">video</option>
          <option value="audio">audio</option>
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="min-w-[16rem] flex-1 rounded-md border border-border bg-subtle px-2.5 py-1.5 text-xs focus:outline-none"
        />
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="alt / title"
          className="rounded-md border border-border bg-subtle px-2.5 py-1.5 text-xs focus:outline-none"
        />
        <button
          onClick={() => {
            if (!url) return;
            add.mutate({ type, url, alt: alt || undefined });
            setUrl(""); setAlt("");
          }}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {media.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-xs">
              <div className="w-12 text-center uppercase tracking-wider text-muted-foreground">{m.type}</div>
              <div className="min-w-0 flex-1 truncate">{m.alt || m.url}</div>
              <button
                onClick={() => del.mutate(m.id)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-subtle hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
