import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export interface MyProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  links: { label: string; url: string }[];
}

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id ?? null],
    queryFn: async (): Promise<MyProfile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        links: ((data.links as unknown) as { label: string; url: string }[]) ?? [],
      };
    },
  });
}

export function useUpdateMyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      displayName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const patch: {
        display_name?: string | null;
        bio?: string | null;
        avatar_url?: string | null;
      } = {};
      if (input.displayName !== undefined) patch.display_name = input.displayName;
      if (input.bio !== undefined) patch.bio = input.bio;
      if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
      void qc.invalidateQueries({ queryKey: ["author"] });
    },
  });
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return data.publicUrl;
}
