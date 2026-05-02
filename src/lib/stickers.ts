import { supabase } from "@/integrations/supabase/client";

/**
 * Telegram-style video sticker constraints.
 * - .webm container, VP9 codec
 * - no audio track
 * - duration ≤ 10 seconds
 * - file size ≤ 512 KB
 * - one side exactly 512 px, the other ≤ 512 px
 */
export const STICKER_MAX_BYTES = 512 * 1024;
export const STICKER_MAX_DURATION_MS = 10_000;
export const STICKER_REQUIRED_DIMENSION = 512;

export interface StickerProbe {
  width: number;
  height: number;
  durationMs: number;
  hasAudio: boolean;
  sizeBytes: number;
}

/** Probe a .webm File via an offscreen <video> element. */
export function probeSticker(file: File): Promise<StickerProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    v.playsInline = true;
    v.src = url;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
    };
    v.onloadedmetadata = () => {
      // Detect audio track: best-effort across browsers.
      // @ts-expect-error — non-standard but widely available.
      const audioTracks = v.audioTracks?.length ?? 0;
      // @ts-expect-error — Mozilla
      const mozHasAudio = v.mozHasAudio === true;
      // @ts-expect-error — WebKit
      const webkitAudio = (v.webkitAudioDecodedByteCount ?? 0) > 0;
      const hasAudio = audioTracks > 0 || mozHasAudio || webkitAudio;
      const probe: StickerProbe = {
        width: v.videoWidth,
        height: v.videoHeight,
        durationMs: Math.round((v.duration || 0) * 1000),
        hasAudio,
        sizeBytes: file.size,
      };
      cleanup();
      resolve(probe);
    };
    v.onerror = () => {
      cleanup();
      reject(new Error("Не удалось прочитать видеофайл"));
    };
  });
}

export function validateStickerFile(file: File, probe: StickerProbe): string | null {
  if (!/\.webm$/i.test(file.name) && file.type !== "video/webm") {
    return "Файл должен быть в формате .webm";
  }
  if (probe.sizeBytes > STICKER_MAX_BYTES) {
    return `Размер файла превышает 512 KB (сейчас ${(probe.sizeBytes / 1024).toFixed(1)} KB)`;
  }
  if (probe.durationMs > STICKER_MAX_DURATION_MS + 100) {
    return `Длительность стикера должна быть не более 10 секунд (сейчас ${(probe.durationMs / 1000).toFixed(2)} с)`;
  }
  if (probe.hasAudio) {
    return "Стикер не должен содержать аудиодорожку";
  }
  if (
    probe.width !== STICKER_REQUIRED_DIMENSION &&
    probe.height !== STICKER_REQUIRED_DIMENSION
  ) {
    return `Одна из сторон должна быть строго 512 px (сейчас ${probe.width}×${probe.height})`;
  }
  if (
    probe.width > STICKER_REQUIRED_DIMENSION ||
    probe.height > STICKER_REQUIRED_DIMENSION
  ) {
    return `Размер стикера не должен превышать 512 px (сейчас ${probe.width}×${probe.height})`;
  }
  return null;
}

export async function uploadStickerFile(
  file: File,
): Promise<{ url: string; probe: StickerProbe }> {
  const probe = await probeSticker(file);
  const err = validateStickerFile(file, probe);
  if (err) throw new Error(err);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Требуется вход в систему");

  const path = `stickers/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webm`;
  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    contentType: "video/webm",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return { url: data.publicUrl, probe };
}
