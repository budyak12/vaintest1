import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  WrapText,
  Lock,
  Unlock,
  Trash2,
  Pencil,
  Crop,
  Square,
  Scan,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageEditorModal } from "./ImageEditorModal";
import { VideoEditorModal } from "./VideoEditorModal";
import { VideoPlayer, AudioPlayer } from "../MediaPlayers";

export type MediaAlign = "left" | "center" | "right" | "wrap-left" | "wrap-right" | "full";
export type ResizableMediaKind = "image" | "video" | "audio";
export type ObjectFit = "contain" | "cover";

interface MediaAttrs {
  src: string;
  alt: string | null;
  title: string | null;
  kind: ResizableMediaKind;
  width: string | null; // "60%" | "320px" | "auto"
  height: string | null; // "240px" | null
  align: MediaAlign;
  lockRatio: boolean;
  fit: ObjectFit;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableMedia: {
      insertResizableMedia: (
        attrs: Partial<MediaAttrs> & { src: string; kind: ResizableMediaKind },
      ) => ReturnType;
    };
  }
}

export const ResizableMedia = Node.create({
  name: "resizableMedia",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: null },
      title: { default: null },
      kind: { default: "image" as ResizableMediaKind },
      width: { default: "100%" },
      height: { default: null },
      align: { default: "center" as MediaAlign },
      lockRatio: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-lock-ratio") !== "false",
        renderHTML: (attrs) => ({ "data-lock-ratio": String(attrs.lockRatio) }),
      },
      fit: {
        default: "contain" as ObjectFit,
        parseHTML: (el) => (el.getAttribute("data-fit") as ObjectFit) || "contain",
        renderHTML: (attrs) => ({ "data-fit": attrs.fit }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-resizable-media]",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          const inner = node.querySelector("img,video,audio") as HTMLElement | null;
          const kind = (node.getAttribute("data-kind") as ResizableMediaKind) || "image";
          return {
            src: inner?.getAttribute("src") || "",
            alt: inner?.getAttribute("alt") || null,
            title: inner?.getAttribute("title") || null,
            kind,
            width: node.style.width || node.getAttribute("data-width") || "100%",
            height: node.style.height || node.getAttribute("data-height") || null,
            align: (node.getAttribute("data-align") as MediaAlign) || "center",
            fit: (node.getAttribute("data-fit") as ObjectFit) || "contain",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const a = node.attrs as MediaAttrs;
    const wrapperAttrs = mergeAttributes(HTMLAttributes, {
      "data-resizable-media": "true",
      "data-kind": a.kind,
      "data-align": a.align,
      "data-fit": a.fit,
      "data-width": a.width ?? "",
      "data-height": a.height ?? "",
      style: [
        a.width ? `width:${a.width}` : "",
        a.height ? `height:${a.height}` : "",
      ]
        .filter(Boolean)
        .join(";"),
    });

    if (a.kind === "video") {
      return [
        "figure",
        wrapperAttrs,
        [
          "video",
          {
            src: a.src,
            controls: "true",
            style: `width:100%;height:100%;object-fit:${a.lockRatio === false ? "fill" : "contain"}`,
          },
        ],
      ];
    }
    if (a.kind === "audio") {
      return [
        "figure",
        wrapperAttrs,
        ["audio", { src: a.src, controls: "true", style: "width:100%" }],
      ];
    }
    return [
      "figure",
      wrapperAttrs,
      [
        "img",
        {
          src: a.src,
          alt: a.alt ?? "",
          title: a.title ?? "",
          style: `width:100%;height:100%;display:block;object-fit:${a.fit}`,
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertResizableMedia:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              align: "center",
              width: "100%",
              height: null,
              lockRatio: true,
              fit: "contain",
              alt: null,
              title: null,
              ...attrs,
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaNodeView);
  },
});

function MediaNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const a = node.attrs as MediaAttrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLImageElement | HTMLVideoElement | HTMLAudioElement | null>(null);
  const [editingAlt, setEditingAlt] = useState(false);
  const [draftAlt, setDraftAlt] = useState(a.alt ?? "");
  const [showEditor, setShowEditor] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);

  const setAlign = (align: MediaAlign) => updateAttributes({ align });
  const toggleLock = () => updateAttributes({ lockRatio: !a.lockRatio });
  const toggleFit = () =>
    updateAttributes({ fit: a.fit === "cover" ? "contain" : "cover" });

  const replaceFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = a.kind === "image" ? "image/*" : a.kind === "video" ? "video/*" : "audio/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      const { uploadToStorage } = await import("./upload");
      try {
        const { url } = await uploadToStorage(f, a.kind);
        updateAttributes({ src: url });
      } catch (e) {
        console.error(e);
      }
    };
    input.click();
  }, [a.kind, updateAttributes]);

  // Resize: use rAF and snapshot starting metrics once.
  const onResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    corner: "br" | "bl" | "tr" | "tl" | "r" | "l" | "b",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const startRect = container.getBoundingClientRect();
    const parent = container.parentElement;
    const parentWidth = parent
      ? parent.getBoundingClientRect().width
      : startRect.width;
    const isTouch = "touches" in e;
    const startX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const startY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const startW = startRect.width;
    const startH = startRect.height;
    const ratio = startW / Math.max(1, startH);

    let raf = 0;
    let pending: { w: number; h: number | null } | null = null;
    const apply = () => {
      raf = 0;
      if (!pending) return;
      const widthPct = Math.min(100, Math.max(5, (pending.w / parentWidth) * 100));
      updateAttributes({
        width: `${widthPct.toFixed(2)}%`,
        height: pending.h != null ? `${Math.round(pending.h)}px` : null,
      });
      pending = null;
    };

    const move = (ev: MouseEvent | TouchEvent) => {
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      const dx = cx - startX;
      const dy = cy - startY;
      const signX = corner.includes("l") ? -1 : 1;
      const signY = corner.startsWith("t") ? -1 : 1;

      // Shift toggles ratio lock temporarily
      const shift = "shiftKey" in ev ? (ev as MouseEvent).shiftKey : false;
      const lock = a.lockRatio !== shift;

      let newW: number;
      let newH: number;

      if (corner === "l" || corner === "r") {
        newW = Math.max(40, startW + dx * signX);
        newH = lock ? newW / ratio : startH;
      } else if (corner === "b") {
        newH = Math.max(30, startH + dy);
        newW = lock ? newH * ratio : startW;
      } else {
        // corners: drive by larger delta for stable behaviour
        if (Math.abs(dx) >= Math.abs(dy)) {
          newW = Math.max(40, startW + dx * signX);
          newH = lock ? newW / ratio : Math.max(30, startH + dy * signY);
        } else {
          newH = Math.max(30, startH + dy * signY);
          newW = lock ? newH * ratio : Math.max(40, startW + dx * signX);
        }
      }

      // Width-driven nodes (image/video) lock height when ratio locked.
      // Audio: allow free height when user drags vertical handles, otherwise leave intrinsic.
      pending = {
        w: newW,
        h: lock ? null : newH,
      };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const up = () => {
      if (raf) cancelAnimationFrame(raf);
      apply();
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  useEffect(() => {
    if (editingAlt) setDraftAlt(a.alt ?? "");
  }, [editingAlt, a.alt]);

  const editable = editor.isEditable;
  const isActive = selected;

  const wrapperClass = cn(
    "rm-wrapper group relative my-4",
    `rm-align-${a.align}`,
    isActive && "rm-active",
  );

  const onApplyEdited = useCallback(
    async (blob: Blob, mime: string) => {
      const { uploadToStorage } = await import("./upload");
      const file = new File([blob], `edited-${Date.now()}.jpg`, { type: mime });
      const { url } = await uploadToStorage(file, "image");
      // Reset height — new image has its own intrinsic ratio
      updateAttributes({ src: url, height: null });
      setShowEditor(false);
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper
      as="div"
      className={wrapperClass}
      data-align={a.align}
      data-kind={a.kind}
    >
      <div
        ref={containerRef}
        className="rm-frame relative"
        style={{
          width: a.width ?? "100%",
          height: a.height ?? undefined,
          maxWidth: "100%",
        }}
      >
        {a.kind === "image" ? (
          <img
            ref={innerRef as React.RefObject<HTMLImageElement>}
            src={a.src}
            alt={a.alt ?? ""}
            title={a.title ?? undefined}
            draggable={false}
            className="block h-full w-full select-none rounded-md"
            style={{ objectFit: a.fit }}
          />
        ) : a.kind === "video" ? (
          <VideoPlayer src={a.src} className="h-full w-full" />
        ) : (
          <AudioPlayer
            src={a.src}
            title={a.alt ?? undefined}
            className="h-full"
            editableTitle={editable}
            onTitleChange={(next) => updateAttributes({ alt: next })}
          />
        )}

        {/* Resize handles */}
        {editable && (
          <>
            <Handle pos="tl" onStart={onResizeStart} />
            <Handle pos="tr" onStart={onResizeStart} />
            <Handle pos="bl" onStart={onResizeStart} />
            <Handle pos="br" onStart={onResizeStart} />
            <Handle pos="l" onStart={onResizeStart} />
            <Handle pos="r" onStart={onResizeStart} />
            <Handle pos="b" onStart={onResizeStart} />
          </>
        )}
      </div>

      {/* Floating toolbar */}
      {editable && (
        <div
          className={cn(
            "rm-toolbar pointer-events-auto absolute -top-10 left-1/2 z-20 hidden -translate-x-1/2 flex-wrap items-center gap-0.5 rounded-md border border-border bg-popover px-1 py-1 text-popover-foreground shadow-md",
            (isActive || editingAlt) && "!flex",
          )}
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
        >
          <TBtn title="Align left" onClick={() => setAlign("left")} active={a.align === "left"}>
            <AlignLeft className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Align center" onClick={() => setAlign("center")} active={a.align === "center"}>
            <AlignCenter className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Align right" onClick={() => setAlign("right")} active={a.align === "right"}>
            <AlignRight className="h-3.5 w-3.5" />
          </TBtn>
          <span className="mx-1 h-4 w-px bg-border" />
          <TBtn title="Wrap left (text on right)" onClick={() => setAlign("wrap-left")} active={a.align === "wrap-left"}>
            <WrapText className="h-3.5 w-3.5 -scale-x-100" />
          </TBtn>
          <TBtn title="Wrap right (text on left)" onClick={() => setAlign("wrap-right")} active={a.align === "wrap-right"}>
            <WrapText className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Full width" onClick={() => setAlign("full")} active={a.align === "full"}>
            <Maximize2 className="h-3.5 w-3.5" />
          </TBtn>
          <span className="mx-1 h-4 w-px bg-border" />
          <TBtn
            title="Reset size"
            onClick={() => updateAttributes({ width: "100%", height: null })}
          >
            <span className="px-1 text-[10px] font-medium">100%</span>
          </TBtn>
          <TBtn
            title={a.lockRatio ? "Unlock aspect ratio (Shift while dragging)" : "Lock aspect ratio"}
            onClick={toggleLock}
            active={a.lockRatio}
          >
            {a.lockRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </TBtn>
          {a.kind === "image" && (
            <TBtn
              title={a.fit === "cover" ? "Fit: cover (crop to fill)" : "Fit: contain (no crop)"}
              onClick={toggleFit}
              active={a.fit === "cover"}
            >
              {a.fit === "cover" ? <Square className="h-3.5 w-3.5" /> : <Scan className="h-3.5 w-3.5" />}
            </TBtn>
          )}
          <span className="mx-1 h-4 w-px bg-border" />
          {a.kind === "image" && (
            <>
              <TBtn title="Crop / rotate / flip" onClick={() => setShowEditor(true)}>
                <Crop className="h-3.5 w-3.5" />
              </TBtn>
              <TBtn title="Edit alt text" onClick={() => setEditingAlt((v) => !v)} active={editingAlt}>
                <span className="px-1 text-[10px] font-medium">ALT</span>
              </TBtn>
            </>
          )}
          {a.kind === "video" && (
            <TBtn title="Trim video" onClick={() => setShowVideoEditor(true)}>
              <Scissors className="h-3.5 w-3.5" />
            </TBtn>
          )}
          <TBtn title="Replace file" onClick={replaceFile}>
            <Pencil className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn title="Delete" onClick={() => deleteNode()}>
            <Trash2 className="h-3.5 w-3.5" />
          </TBtn>
        </div>
      )}

      {editable && editingAlt && (
        <div
          className="absolute left-1/2 top-0 z-20 mt-2 w-72 -translate-x-1/2 rounded-md border border-border bg-popover p-2 shadow-md"
          contentEditable={false}
        >
          <input
            autoFocus
            value={draftAlt}
            onChange={(e) => setDraftAlt(e.target.value)}
            placeholder="Alt text (for accessibility)"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditingAlt(false)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                updateAttributes({ alt: draftAlt });
                setEditingAlt(false);
              }}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {showEditor && a.kind === "image" && (
        <ImageEditorModal
          src={a.src}
          onCancel={() => setShowEditor(false)}
          onApply={onApplyEdited}
        />
      )}

      {showVideoEditor && a.kind === "video" && (
        <VideoEditorModal
          src={a.src}
          onCancel={() => setShowVideoEditor(false)}
          onApply={(newSrc) => {
            updateAttributes({ src: newSrc });
            setShowVideoEditor(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

function Handle({
  pos,
  onStart,
}: {
  pos: "tl" | "tr" | "bl" | "br" | "l" | "r" | "b";
  onStart: (
    e: React.MouseEvent | React.TouchEvent,
    pos: "tl" | "tr" | "bl" | "br" | "l" | "r" | "b",
  ) => void;
}) {
  return (
    <span
      role="presentation"
      onMouseDown={(e) => onStart(e, pos)}
      onTouchStart={(e) => onStart(e, pos)}
      className={cn("rm-handle", `rm-handle-${pos}`)}
    />
  );
}

function TBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded px-1 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground",
        active && "bg-foreground text-background hover:bg-foreground hover:text-background",
      )}
    >
      {children}
    </button>
  );
}
