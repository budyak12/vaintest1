import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Moon, Sun, Bookmark, Home, LogIn, LogOut, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useMyProfile } from "@/lib/profile-queries";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme, toggle } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { data: myProfile } = useMyProfile();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim() } });
  }

  const navItems = [
    { to: "/" as const, label: "Feed", icon: Home, exact: true },
    { to: "/bookmarks" as const, label: "Bookmarks", icon: Bookmark, exact: false },
  ];

  return (
    <header className="sticky top-0 z-40 hairline-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link to="/" className="font-serif text-base font-semibold tracking-tight text-foreground sm:text-lg">
          ⏤ vain
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
          {navItems.map((it) => {
            const active = it.exact ? location === it.to : location.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "group relative overflow-hidden rounded-md px-2.5 py-1.5 transition-all duration-[600ms] ease-out",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:-translate-y-[1px]",
                )}
              >
                {!active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 scale-90 rounded-md bg-subtle opacity-0 transition-all duration-[600ms] ease-out group-hover:scale-100 group-hover:opacity-100"
                  />
                )}
                <span className="relative">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <form onSubmit={submit} className="ml-auto min-w-0 flex-1 sm:max-w-xs">
          <label className="group flex items-center gap-2 rounded-md border border-border bg-subtle px-2 py-1.5 text-sm transition-colors focus-within:border-foreground/60 sm:px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden rounded border border-border px-1 text-[10px] font-mono text-muted-foreground sm:inline">
              ⌘K
            </kbd>
          </label>
        </form>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {isAdmin && (
          <Link
            to="/admin"
            aria-label="Admin"
            className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border text-muted-foreground transition-all duration-[600ms] ease-out hover:-translate-y-[1px] hover:text-foreground sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 scale-90 rounded-md bg-subtle opacity-0 transition-all duration-[600ms] ease-out group-hover:scale-100 group-hover:opacity-100"
            />
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        {user ? (
          <>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border text-muted-foreground transition-all duration-[600ms] ease-out hover:-translate-y-[1px] hover:text-foreground sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 scale-90 rounded-md bg-subtle opacity-0 transition-all duration-[600ms] ease-out group-hover:scale-100 group-hover:opacity-100"
              />
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <Link
              to="/profile"
              aria-label="Your profile"
              title="Your profile"
              className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-subtle text-xs font-medium text-foreground hover:opacity-90"
            >
              {myProfile?.avatarUrl ? (
                <img src={myProfile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span>
                  {(myProfile?.displayName || myProfile?.username || "u").slice(0, 1).toUpperCase()}
                </span>
              )}
            </Link>
          </>
        ) : (
          <Link
            to="/auth"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 sm:px-3"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">Sign in</span>
          </Link>
        )}
      </div>

      <div className="hairline-t flex items-center justify-around px-4 py-1.5 sm:hidden">
        {navItems.map((it) => {
          const Icon = it.icon;
          const active = it.exact ? location === it.to : location.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
