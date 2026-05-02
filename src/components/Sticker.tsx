import { cn } from "@/lib/utils";

/**
 * Renders a Telegram-style video sticker.
 * Always autoplays, loops, muted, no controls.
 */
export function Sticker({
  src,
  size = 128,
  className,
  alt,
}: {
  src: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <span
      className={cn("vain-sticker inline-block align-middle", className)}
      style={{ width: size, height: size }}
      aria-label={alt ? `sticker: ${alt}` : "sticker"}
    >
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
