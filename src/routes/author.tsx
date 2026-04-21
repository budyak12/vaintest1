import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { EntryCard } from "@/components/EntryCard";
import { useAuthor, useEntries } from "@/lib/queries";

export const Route = createFileRoute("/author")({
  head: () => ({ meta: [{ title: "Author — vain" }] }),
  component: AuthorPage,
});

function AuthorPage() {
  const { data: author } = useAuthor();
  const { data: entries = [] } = useEntries();

  return (
    <Layout>
      <section className="hairline-b pb-8">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-border bg-subtle text-xl font-medium">
            {(author?.displayName ?? "v").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              {author?.displayName ?? "vain"}
            </h1>
            <div className="text-sm text-muted-foreground">@{author?.username ?? "vain"}</div>
            {author?.bio && <p className="mt-3 text-sm text-foreground/90">{author.bio}</p>}
            {author?.links && author.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {author.links.map((l) => (
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
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </Layout>
  );
}
