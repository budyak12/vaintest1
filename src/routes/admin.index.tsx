import { createFileRoute } from "@tanstack/react-router";
import { useAdminStats } from "@/lib/queries";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — vain admin" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useAdminStats();
  if (isLoading || !stats) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Entries", value: stats.totalEntries },
    { label: "Posts", value: stats.totalPosts },
    { label: "Articles", value: stats.totalArticles },
    { label: "Drafts", value: stats.totalDrafts },
    { label: "Views", value: stats.totalViews },
    { label: "Likes", value: stats.totalLikes },
    { label: "Comments", value: stats.totalComments },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Quick overview of your blog.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-subtle/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="mt-1 font-serif text-3xl tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
