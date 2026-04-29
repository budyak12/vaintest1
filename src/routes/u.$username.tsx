import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { EntryCard } from "@/components/EntryCard";
import { useUserEntries, useUserProfile } from "@/lib/queries";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — vain` },
      { name: "description", content: `Profile of @${params.username} on vain.` },
    ],
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const { data: profile, isLoading } = useUserProfile(username);
  const { data: entries = [] } = useUserEntries(profile?.id);

  if (isLoading) {
    return (
      <Layout>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">User @{username} not found.</p>
          <Link to="/" className="mt-2 inline-block text-sm underline">Go home</Link>
        </div>
      </Layout>
    );
  }

  const initial = (profile.displayName || profile.username || "u").slice(0, 1).toUpperCase();

  return (
    <Layout>
      <section className="hairline-b pb-8">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-subtle text-xl font-medium">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              {profile.displayName || profile.username}
            </h1>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
            {profile.bio && <p className="mt-3 text-sm text-foreground/90">{profile.bio}</p>}
            {profile.links && profile.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {profile.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-2 flex flex-col">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No published entries yet.
          </div>
        ) : (
          entries.map((e) => <EntryCard key={e.id} entry={e} />)
        )}
      </div>
    </Layout>
  );
}
