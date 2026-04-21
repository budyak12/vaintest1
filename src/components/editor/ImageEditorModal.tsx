import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Ratio = "free" | "1:1" | "4:3" | "3:2" | "16:9" | "9:16";

interface Props {
  src: string;
  onCancel: () => void;
  onApply: (blob: Blob, mime: string) => void | Promise<void>;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RATIOS: { id: Ratio; label: string; v: number | null }[] = [
  { id: "free", label: "Free", v: null },
  { id: "1:1", label: "1:1", v: 1 },
  { id: "4:3", label: "4:3", v: 4 / 3 },
  { id: "3:2", label: "3:2", v: 3 / 2 },
  { id: "16:9", label: "16:9", v: 16 / 9 },
  { id: "9:16", label: "9:16", v: 9 / 16 },
];

export function ImageEditorModal({ src, onCancel, onApply }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [rotation, setRotation] = useState(0); // 0,90,180,270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState<Ratio>("free");
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load image (try CORS, fallback without)
  useEffect(() => {
    let cancelled = false;
    const tryLoad = (useCors: boolean) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (useCors) img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("load failed"));
        img.src = src;
      });
    (async () => {
      try {
        const img = await tryLoad(true).catch(() => tryLoad(false));
        if (!cancelled) {
          imgRef.current = img;
          setImgEl(img);
        }
      } catch {
        if (!cancelled) setError("Failed to load image");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Stage size observer
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute displayed image rect (after rotation/zoom/contain in stage)
  const rotated90 = rotation % 180 !== 0;
  const natW = imgEl ? (rotated90 ? imgEl.naturalHeight : imgEl.naturalWidth) : 0;
  const natH = imgEl ? (rotated90 ? imgEl.naturalWidth : imgEl.naturalHeight) : 0;

  const fitScale = imgEl && stageSize.w && stageSize.h
    ? Math.min(stageSize.w / natW, stageSize.h / natH)
    : 1;
  const dispScale = fitScale * zoom;
  const dispW = natW * dispScale;
  const dispH = natH * dispScale;
  const dispX = (stageSize.w - dispW) / 2;
  const dispY = (stageSize.h - dispH) / 2;

  // Initialize / reset crop on image load or ratio change
  useEffect(() => {
    if (!imgEl || !stageSize.w) return;
    const r = RATIOS.find((x) => x.id === ratio)?.v ?? null;
    let w = dispW;
    let h = dispH;
    if (r) {
      if (w / h > r) w = h * r;
      else h = w / r;
    }
    setCrop({
      x: dispX + (dispW - w) / 2,
      y: dispY + (dispH - h) / 2,
      w,
      h,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl, ratio, rotation, zoom, stageSize.w, stageSize.h]);

  // Crop drag/resize
  const dragRef = useRef<{
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startX: number;
    startY: number;
    box: CropBox;
  } | null>(null);

  const onCropMouseDown = (
    e: React.MouseEvent,
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
  ) => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, box: { ...crop } };
    const move = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      const r = RATIOS.find((x) => x.id === ratio)?.v ?? null;
      const minX = dispX;
      const minY = dispY;
      const maxX = dispX + dispW;
      const maxY = dispY + dispH;
      let { x, y, w, h } = d.box;

      if (d.mode === "move") {
        x = Math.max(minX, Math.min(maxX - w, d.box.x + dx));
        y = Math.max(minY, Math.min(maxY - h, d.box.y + dy));
      } else {
        const minSize = 24;
        const right = d.box.x + d.box.w;
        const bottom = d.box.y + d.box.h;
        if (d.mode.includes("e")) w = Math.max(minSize, Math.min(maxX - d.box.x, d.box.w + dx));
        if (d.mode.includes("s")) h = Math.max(minSize, Math.min(maxY - d.box.y, d.box.h + dy));
        if (d.mode.includes("w")) {
          const nx = Math.max(minX, Math.min(right - minSize, d.box.x + dx));
          w = right - nx;
          x = nx;
        }
        if (d.mode.includes("n")) {
          const ny = Math.max(minY, Math.min(bottom - minSize, d.box.y + dy));
          h = bottom - ny;
          y = ny;
        }
        if (r) {
          // enforce ratio: derive h from w (or vice versa) keeping anchored corner
          if (d.mode === "e" || d.mode === "w") {
            h = w / r;
            if (y + h > maxY) {
              h = maxY - y;
              w = h * r;
              if (d.mode === "w") x = right - w;
            }
          } else if (d.mode === "n" || d.mode === "s") {
            w = h * r;
            if (x + w > maxX) {
              w = maxX - x;
              h = w / r;
              if (d.mode === "n") y = bottom - h;
            }
          } else {
            // corners — fit by larger axis change
            if (Math.abs(dx) > Math.abs(dy)) h = w / r;
            else w = h * r;
            if (d.mode.includes("w")) x = right - w;
            if (d.mode.includes("n")) y = bottom - h;
          }
        }
      }
      setCrop({ x, y, w, h });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleApply = useCallback(async () => {
    if (!imgEl || !crop) return;
    setBusy(true);
    setError(null);
    try {
      // Map crop (in stage px) to source image px
      const cx = (crop.x - dispX) / dispScale;
      const cy = (crop.y - dispY) / dispScale;
      const cw = crop.w / dispScale;
      const ch = crop.h / dispScale;

      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(cw));
      out.height = Math.max(1, Math.round(ch));
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      // Draw with rotation/flip — render rotated source then crop
      // Strategy: use offscreen canvas of rotated full image, then drawImage(crop).
      const off = document.createElement("canvas");
      off.width = natW;
      off.height = natH;
      const octx = off.getContext("2d");
      if (!octx) throw new Error("Canvas unavailable");
      octx.save();
      octx.translate(natW / 2, natH / 2);
      octx.rotate((rotation * Math.PI) / 180);
      octx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      const drawW = imgEl.naturalWidth;
      const drawH = imgEl.naturalHeight;
      octx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      octx.restore();

      ctx.drawImage(off, cx, cy, cw, ch, 0, 0, out.width, out.height);

      const mime = "image/jpeg";
      const blob: Blob = await new Promise((resolve, reject) =>
        out.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), mime, 0.92),
      );
      await onApply(blob, mime);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export image");
    } finally {
      setBusy(false);
    }
  }, [imgEl, crop, dispScale, dispX, dispY, natW, natH, rotation, flipH, flipV, onApply]);

  const node = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur">
      {/* Header */}
      <div className="hairline-b flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CropIcon className="h-4 w-4" />
          Edit image
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-subtle"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !imgEl || !crop}
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply
          </button>
        </div>
      </div>

      {/* Stage */}
      <div ref={stageRef} className="relative flex-1 overflow-hidden bg-subtle/40">
        {!imgEl && !error && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        )}
        {imgEl && (
          <>
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: dispX,
                top: dispY,
                width: dispW,
                height: dispH,
                transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                transformOrigin: "center center",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
            {/* Dim overlay outside crop */}
            {crop && (
              <>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `rgba(0,0,0,0.55)`,
                    clipPath: `polygon(
                      0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                      ${crop.x}px ${crop.y}px,
                      ${crop.x}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y}px,
                      ${crop.x}px ${crop.y}px
                    )`,
                  }}
                />
                {/* Crop frame */}
                <div
                  onMouseDown={(e) => onCropMouseDown(e, "move")}
                  className="absolute cursor-move"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                    boxShadow: "0 0 0 1px var(--color-background), 0 0 0 2px var(--color-foreground)",
                  }}
                >
                  {/* Rule-of-thirds */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
                    <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
                    <div className="absolute top-1/3 left-0 w-full h-px bg-white/40" />
                    <div className="absolute top-2/3 left-0 w-full h-px bg-white/40" />
                  </div>
                  {/* Handles */}
                  {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((m) => (
                    <span
                      key={m}
                      onMouseDown={(e) => onCropMouseDown(e, m)}
                      className={cn("absolute h-3 w-3 -m-1.5 bg-foreground border border-background", cursorFor(m))}
                      style={posFor(m)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="hairline-t flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolBtn title="Rotate -90°" onClick={() => setRotation((r) => (r + 270) % 360)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Rotate +90°" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Flip horizontal" active={flipH} onClick={() => setFlipH((v) => !v)}>
            <FlipHorizontal className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn title="Flip vertical" active={flipV} onClick={() => setFlipV((v) => !v)}>
            <FlipVertical className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>

        <span className="mx-1 h-4 w-px bg-border" />

        <div className="flex items-center gap-1">
          <ToolBtn title="Zoom out" onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </ToolBtn>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1 w-32 cursor-pointer accent-foreground"
          />
          <ToolBtn title="Zoom in" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </ToolBtn>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-md px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-subtle"
          >
            Fit
          </button>
        </div>

        <span className="mx-1 h-4 w-px bg-border" />

        <div className="flex flex-wrap items-center gap-1">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRatio(r.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] tracking-wide text-muted-foreground hover:bg-subtle hover:text-foreground",
                ratio === r.id && "bg-foreground text-background hover:bg-foreground hover:text-background",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function posFor(m: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    nw: { left: 0, top: 0 },
    n: { left: "50%", top: 0 },
    ne: { right: 0, top: 0 },
    e: { right: 0, top: "50%" },
    se: { right: 0, bottom: 0 },
    s: { left: "50%", bottom: 0 },
    sw: { left: 0, bottom: 0 },
    w: { left: 0, top: "50%" },
  };
  return map[m] ?? {};
}
function cursorFor(m: string): string {
  const map: Record<string, string> = {
    nw: "cursor-nwse-resize",
    se: "cursor-nwse-resize",
    ne: "cursor-nesw-resize",
    sw: "cursor-nesw-resize",
    n: "cursor-ns-resize",
    s: "cursor-ns-resize",
    e: "cursor-ew-resize",
    w: "cursor-ew-resize",
  };
  return map[m] ?? "";
}

function ToolBtn({
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
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground",
        active && "bg-foreground text-background hover:bg-foreground hover:text-background",
      )}
    >
      {children}
    </button>
  );
}
