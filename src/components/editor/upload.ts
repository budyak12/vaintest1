import { supabase } from "@/integrations/supabase/client";
import type { MediaType } from "@/lib/types";

export async function uploadToStorage(
  file: File,
  type: MediaType,
): Promise<{ url: string; alt: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required to upload files");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${user.id}/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return { url: data.publicUrl, alt: file.name };
}

export function detectMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}
