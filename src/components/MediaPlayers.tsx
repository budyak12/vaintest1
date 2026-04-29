import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Music,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtTime(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const RATES = [0.5, 1, 1.25, 1.5, 2] as const;

/* ------------------------------------------------------------------ */
/* Shared scrubber                                                     */
/* ------------------------------------------------------------------ */

function Scrubber({
  value,
  max,
  buffered,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  max: number;
  buffered?: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onChange(ratio * max);
    },
    [max, onChange],
  );

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      update(x);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [update]);

  const pct = max > 0 ? (value / max) * 100 : 0;
  const bufPct = max > 0 && buffered != null ? Math.min(100, (buffered / max) * 100) : 0;

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        update(e.touches[0].clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onChange(Math.min(max, value + 5));
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 5));
      }}
      className={cn(
        "group/scrub relative h-1.5 w-full cursor-pointer rounded-full bg-white/15 transition-[height] duration-150 hover:h-2",
        className,
      )}
    >
      {/* buffered */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/25"
        style={{ width: `${bufPct}%` }}
      />
      {/* progress */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white"
        style={{ width: `${pct}%` }}
      />
      {/* thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover/scrub:opacity-100"
        style={{ left: `${pct}%` }}
      >
        <div className="h-3 w-3 rounded-full bg-white shadow" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Volume                                                              */
/* ------------------------------------------------------------------ */

function VolumeControl({
  volume,
  muted,
  onVolume,
  onToggleMute,
  light,
}: {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  light?: boolean;
}) {
  return (
    <div className="group/vol relative flex items-center">
      <button
        type="button"
        onClick={onToggleMute}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md transition-colors",
          light
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-subtle hover:text-foreground",
        )}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <div className="ml-1 hidden w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-20 group-hover/vol:px-1 sm:block">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className={cn(
            "h-1 w-full cursor-pointer appearance-none rounded-full",
            light ? "vain-range vain-range-light" : "vain-range",
          )}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rate menu                                                           */
/* ------------------------------------------------------------------ */

function RateMenu({
  rate,
  onChange,
  light,
}: {
  rate: number;
  onChange: (r: number) => void;
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
          light
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-subtle hover:text-foreground",
        )}
        title="Playback speed"
      >
        <Gauge className="h-3.5 w-3.5" />
        {rate}×
      </button>
      {open && (
        <div
          className={cn(
            "absolute bottom-full right-0 z-30 mb-2 flex flex-col overflow-hidden rounded-md border shadow-md",
            light ? "border-white/15 bg-black/85 backdrop-blur" : "border-border bg-popover",
          )}
        >
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={cn(
                "px-3 py-1.5 text-left text-[11px] font-medium",
                light
                  ? "text-white/85 hover:bg-white/10"
                  : "text-foreground hover:bg-subtle",
                r === rate && (light ? "bg-white/10 text-white" : "bg-subtle"),
              )}
            >
              {r}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Video player                                                        */
/* ------------------------------------------------------------------ */

export function VideoPlayer({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onProg = () => {
      try {
        if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
      } catch {/* noop */}
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("progress", onProg);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("progress", onProg);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setTime(t);
  }, []);

  const onVol = useCallback((vv: number) => {
    setVolume(vv);
    setMuted(vv === 0);
    if (videoRef.current) {
      videoRef.current.volume = vv;
      videoRef.current.muted = vv === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }, []);

  const onRate = useCallback((r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  }, []);

  const toggleFs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "vain-video group/player relative isolate w-full overflow-hidden rounded-md bg-black",
        className,
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={toggle}
        className="block h-full w-full cursor-pointer"
      />

      {/* Big center play button when paused */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/25"
          aria-label="Play"
        >
          <Play className="h-7 w-7 translate-x-0.5 fill-current" />
        </button>
      )}

      {/* Bottom control bar */}
      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300",
          playing && !hovering ? "opacity-0" : "opacity-100",
        )}
      >
        <Scrubber
          value={time}
          max={duration}
          buffered={buffered}
          onChange={seek}
          ariaLabel="Seek video"
        />
        <div className="flex items-center gap-1 text-white">
          <button
            type="button"
            onClick={toggle}
            className="grid h-8 w-8 place-items-center rounded-md text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <VolumeControl
            volume={volume}
            muted={muted}
            onVolume={onVol}
            onToggleMute={toggleMute}
            light
          />
          <span className="ml-1 select-none font-mono text-[11px] tabular-nums text-white/85">
            {fmtTime(time)} / {fmtTime(duration)}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <RateMenu rate={rate} onChange={onRate} light />
            <button
              type="button"
              onClick={toggleFs}
              className="grid h-8 w-8 place-items-center rounded-md text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audio player                                                        */
/* ------------------------------------------------------------------ */

export function AudioPlayer({
  src,
  title,
  className,
}: {
  src: string;
  title?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const seek = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setTime(t);
  };
  const onVol = (v: number) => {
    setVolume(v);
    setMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = v === 0;
    }
  };
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };
  const onRate = (r: number) => {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-border bg-subtle px-3 py-2.5",
        className,
      )}
    >
      {/* Hidden native audio element drives playback */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={toggle}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-all hover:scale-[1.03] hover:bg-foreground hover:text-background"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px] fill-current" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Music className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 truncate text-sm text-foreground">
            {title || "Audio"}
          </div>
          <span className="ml-auto select-none font-mono text-[11px] tabular-nums text-muted-foreground">
            {fmtTime(time)} / {fmtTime(duration)}
          </span>
        </div>
        <div className="vain-audio-scrubber">
          <Scrubber
            value={time}
            max={duration}
            onChange={seek}
            ariaLabel="Seek audio"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <RateMenu rate={rate} onChange={onRate} />
        <VolumeControl
          volume={volume}
          muted={muted}
          onVolume={onVol}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  );
}
