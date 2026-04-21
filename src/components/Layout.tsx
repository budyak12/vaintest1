import type { ReactNode } from "react";
import { Header } from "./Header";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-4 sm:py-10">{children}</main>
      <footer className="mx-auto mt-12 w-full max-w-3xl px-3 pb-10 text-xs text-muted-foreground sm:px-4 sm:pb-12">
        <div className="hairline-t flex flex-wrap items-center justify-between gap-2 pt-6">
          <span>© vain — a personal media space</span>
          <span className="font-mono">v1</span>
        </div>
      </footer>
    </div>
  );
}
