import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { EMOJI_NAMES, emojiUrl, type EmojiName } from "@/lib/emoji";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (name: EmojiName) => void;
  className?: string;
  title?: string;
}

export function EmojiPicker({ onPick, className, title = "Insert emoji" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        title={title}
        aria-label={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground",
          open && "bg-foreground text-background hover:bg-foreground hover:text-background",
        )}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-[260px] rounded-md border border-border bg-background p-2 shadow-lg"
          style={{ left: 0 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-1.5 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Emoji
          </div>
          <div className="grid max-h-[220px] grid-cols-8 gap-0.5 overflow-y-auto">
            {EMOJI_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                title={`:${name}:`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(name);
                  setOpen(false);
                }}
                className="grid h-7 w-7 place-items-center rounded hover:bg-subtle"
              >
                <img
                  src={emojiUrl(name)}
                  alt={name}
                  className="h-5 w-5 object-contain"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
