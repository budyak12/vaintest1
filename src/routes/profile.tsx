import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useMyProfile, useUpdateMyProfile, uploadAvatar } from "@/lib/profile-queries";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile — vain" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateMyProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/auth" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  async function handleAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      await update.mutateAsync({ avatarUrl: url });
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ displayName: displayName.trim() || null, bio: bio.trim() || null });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Layout>
    );
  }

  const initial = (displayName || profile?.username || "u").slice(0, 1).toUpperCase();

  return (
    <Layout>
      <section className="hairline-b pb-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit how you appear across vain.</p>
      </section>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-subtle">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl font-medium text-muted-foreground">
                {initial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 grid place-items-center bg-background/70">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-subtle disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              Change avatar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAvatar(f);
                e.target.value = "";
              }}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG up to a few MB.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Username</label>
          <div className="rounded-md border border-border bg-subtle px-3 py-2 text-sm text-muted-foreground">
            @{profile?.username ?? "—"}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dn" className="text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            id="dn"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground/60 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className="text-xs font-medium text-muted-foreground">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="A few words about yourself…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground/60 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back to feed
          </Link>
        </div>
      </form>
    </Layout>
  );
}
