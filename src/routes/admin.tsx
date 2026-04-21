import { createFileRoute, Outlet, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, LayoutDashboard, FileText, MessageSquare, Image as ImageIcon, Tag, PenLine } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate({ to: "/auth" });
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  const items = [
    { to: "/admin" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/entries" as const, label: "Entries", icon: FileText },
    { to: "/admin/write" as const, label: "Write", icon: PenLine },
    { to: "/admin/comments" as const, label: "Comments", icon: MessageSquare },
    { to: "/admin/media" as const, label: "Media", icon: ImageIcon },
    { to: "/admin/tags" as const, label: "Tags", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="hairline-b sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-3 sm:gap-4 sm:px-4">
          <Link to="/admin" className="shrink-0 font-serif text-base font-semibold tracking-tight sm:text-lg">
            ⏤ vain · admin
          </Link>
          <nav className="ml-2 hidden items-center gap-1 text-xs sm:flex">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  activeOptions={{ exact: !!it.exact }}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-subtle" }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
            >
              View site →
            </Link>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground sm:px-2.5 sm:py-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        {/* Mobile sub-nav */}
        <nav className="hairline-t -mx-px flex items-center gap-1 overflow-x-auto px-3 py-1.5 text-[11px] sm:hidden">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                activeOptions={{ exact: !!it.exact }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-subtle hover:text-foreground"
                activeProps={{ className: "text-foreground bg-subtle" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
