import { useEffect, useRef, useState } from "react";
import { Smile, Sticker as StickerIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMOJI_NAMES, emojiUrl, type EmojiName } from "@/lib/emoji";
import { useStickers, type Sticker as StickerType } from "@/lib/sticker-queries";
import { Sticker } from "./Sticker";

type Tab = "emoji" | "sticker";

interface Props {
  onPickEmoji: (name: EmojiName) => void;
  onPickSticker: (sticker: StickerType) => void;
  className?: string;
  defaultTab?: Tab;
}

/**
 * Combined Emoji / Sticker picker popover. Replaces the standalone EmojiPicker
 * in places where users should be able to send video stickers as well.
 */
export function StickerPickerPopover({
  onPickEmoji,
  onPickSticker,
  className,
  defaultTab = "emoji",
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data: stickers = [], isLoading } = useStickers();

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
        title="Insert emoji or sticker"
        aria-label="Insert emoji or sticker"
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
          className="absolute z-50 mt-1 w-[280px] rounded-md border border-border bg-background p-2 shadow-lg"
          style={{ left: 0 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mb-2 flex items-center gap-1 rounded-md bg-subtle p-0.5">
            <TabBtn active={tab === "emoji"} onClick={() => setTab("emoji")}>
              <Smile className="h-3.5 w-3.5" />
              Emoji
            </TabBtn>
            <TabBtn active={tab === "sticker"} onClick={() => setTab("sticker")}>
              <StickerIcon className="h-3.5 w-3.5" />
              Stickers
            </TabBtn>
          </div>

          {tab === "emoji" ? (
            <div className="grid max-h-[220px] grid-cols-8 gap-0.5 overflow-y-auto">
              {EMOJI_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={`:${name}:`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPickEmoji(name);
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
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading…
                </div>
              ) : stickers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No stickers yet. Admin can upload them in the Stickers section.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1">
                  {stickers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={s.alt ?? "sticker"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onPickSticker(s);
                        setOpen(false);
                      }}
                      className="grid aspect-square place-items-center rounded hover:bg-subtle"
                    >
                      <Sticker src={s.url} size={56} alt={s.alt ?? undefined} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
