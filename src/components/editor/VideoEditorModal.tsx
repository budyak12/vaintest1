import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Scissors, Play, Pause, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  /** Existing trim if present, in seconds */
  initialStart?: number;
  initialEnd?: number;
  onCancel: () => void;
  /** Returns the new src URL with #t=start,end fragment (or stripped if full range) */
  onApply: (newSrc: string, start: number, end: number) => void;
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

function stripFragment(src: string): string {
  const i = src.indexOf("#");
  return i === -1 ? src : src.slice(0, i);
}

export function VideoEditorModal({
  src,
  initialStart,
  initialEnd,
  onCancel,
  onApply,
}: Props) {
  const baseSrc = stripFragment(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [start, setStart] = useState(initialStart ?? 0);
  const [end, setEnd] = useState<number | null>(initialEnd ?? null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = v.duration || 0;
      setDuration(d);
      if (end == null) setEnd(d);
    };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      // Auto-pause at end marker
      if (end != null && v.currentTime >= end - 0.05 && !v.paused) {
        v.pause();
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [end]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Snap into trim range when playing
      if (v.currentTime < start || (end != null && v.currentTime >= end)) {
        v.currentTime = start;
      }
      void v.play();
    } else v.pause();
  }, [start, end]);

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(duration, Math.max(0, t));
  };

  const setStartHere = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.min(v.currentTime, (end ?? duration) - 0.1);
    setStart(Math.max(0, t));
  };
  const setEndHere = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.max(v.currentTime, start + 0.1);
    setEnd(Math.min(duration, t));
  };
  const reset = () => {
    setStart(0);
    setEnd(duration);
  };

  // Range slider drag — two thumbs on a single track
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const onThumbDown = (which: "start" | "end") => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = which;
  };
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      const which = dragRef.current;
      const track = trackRef.current;
      if (!which || !track || !duration) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const r = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const t = ratio * duration;
      if (which === "start") {
        const ns = Math.min(t, (end ?? duration) - 0.1);
        setStart(Math.max(0, ns));
        seek(ns);
      } else {
        const ne = Math.max(t, start + 0.1);
        setEnd(Math.min(duration, ne));
        seek(ne);
      }
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, start, end]);

  const handleApply = () => {
    const e2 = end ?? duration;
    const s = Math.max(0, start);
    const fullRange = s <= 0.05 && e2 >= duration - 0.05;
    const newSrc = fullRange ? baseSrc : `${baseSrc}#t=${s.toFixed(2)},${e2.toFixed(2)}`;
    onApply(newSrc, s, e2);
  };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? ((end ?? duration) / duration) * 100 : 100;
  const playheadPct = duration ? (currentTime / duration) * 100 : 0;

  const node = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur">
      {/* Header */}
      <div className="hairline-b flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scissors className="h-4 w-4" />
          Trim video
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:bg-subtle hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!duration}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-300 hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={baseSrc}
          playsInline
          preload="metadata"
          onClick={togglePlay}
          className="absolute inset-0 m-auto block h-full w-full cursor-pointer object-contain"
        />
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="pointer-events-auto absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/25"
            aria-label="Play"
          >
            <Play className="h-7 w-7 translate-x-0.5 fill-current" />
          </button>
        )}
      </div>

      {/* Trim controls */}
      <div className="hairline-t flex flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-muted-foreground transition-all duration-300 hover:bg-subtle hover:text-foreground"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={setStartHere}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-muted-foreground transition-all duration-300 hover:bg-subtle hover:text-foreground"
          >
            Set start
          </button>
          <button
            type="button"
            onClick={setEndHere}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-muted-foreground transition-all duration-300 hover:bg-subtle hover:text-foreground"
          >
            Set end
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-all duration-300 hover:bg-subtle hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <span className="ml-auto select-none font-mono tabular-nums text-muted-foreground">
            <span className="text-foreground">{fmt(currentTime)}</span> / {fmt(duration)}
            <span className="ml-3">
              ▸ {fmt(start)} – {fmt(end ?? duration)} ({fmt((end ?? duration) - start)})
            </span>
          </span>
        </div>

        {/* Trim track */}
        <div
          ref={trackRef}
          className="relative h-9 w-full rounded-md border border-border bg-subtle"
        >
          {/* unselected (left) */}
          <div
            className="absolute inset-y-0 left-0 bg-foreground/5"
            style={{ width: `${startPct}%` }}
          />
          {/* unselected (right) */}
          <div
            className="absolute inset-y-0 right-0 bg-foreground/5"
            style={{ width: `${100 - endPct}%` }}
          />
          {/* selected range */}
          <div
            className="absolute inset-y-0 border-x-2 border-foreground bg-primary/15"
            style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          />
          {/* playhead */}
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-primary"
            style={{ left: `${playheadPct}%` }}
          />
          {/* start thumb */}
          <button
            type="button"
            onMouseDown={onThumbDown("start")}
            onTouchStart={onThumbDown("start")}
            className="absolute top-1/2 z-10 grid h-7 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-sm bg-foreground text-background shadow"
            style={{ left: `${startPct}%` }}
            aria-label="Trim start"
          >
            <span className="h-3 w-px bg-background" />
          </button>
          {/* end thumb */}
          <button
            type="button"
            onMouseDown={onThumbDown("end")}
            onTouchStart={onThumbDown("end")}
            className="absolute top-1/2 z-10 grid h-7 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-sm bg-foreground text-background shadow"
            style={{ left: `${endPct}%` }}
            aria-label="Trim end"
          >
            <span className="h-3 w-px bg-background" />
          </button>
        </div>

        {/* Seek bar (move playhead within full duration) */}
        <input
          type="range"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.05}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className={cn("vain-range h-1 w-full cursor-pointer appearance-none rounded-full")}
        />
        <p className="text-[11px] text-muted-foreground">
          Trimming uses HTML5 media fragments (<code>#t=start,end</code>). The original file is not re-encoded — playback is bounded to the selected range.
        </p>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
