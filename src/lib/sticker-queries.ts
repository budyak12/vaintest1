import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadStickerFile } from "./stickers";
import { useAuth } from "./auth";

export interface Sticker {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface StickerRow {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  size_bytes: number | null;
  created_at: string;
}

function mapSticker(row: StickerRow): Sticker {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function useStickers() {
  return useQuery({
    queryKey: ["stickers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stickers" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as StickerRow[]).map(mapSticker);
    },
    staleTime: 60_000,
  });
}

export function useUploadSticker() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { file: File; alt?: string }) => {
      const { url, probe } = await uploadStickerFile(input.file);
      const { error } = await supabase.from("stickers" as never).insert({
        url,
        alt: input.alt ?? null,
        width: probe.width,
        height: probe.height,
        duration_ms: probe.durationMs,
        size_bytes: probe.sizeBytes,
        uploaded_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stickers"] });
    },
  });
}

export function useDeleteSticker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stickers" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["stickers"] });
    },
  });
}
