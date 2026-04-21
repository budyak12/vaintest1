import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogsPage,
});

type VisitLog = {
  id: string;
  created_at: string;
  path: string | null;
  ip_hash: string | null;
};

function AdminLogsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["visit_logs"],
    queryFn: async (): Promise<VisitLog[]> => {
      const { data, error } = await supabase
        .from("visit_logs")
        .select("id, created_at, path, ip_hash")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Visit logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 200 page visits. IPs are stored as SHA-256 hashes.
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
      {error && (
        <div className="text-sm text-destructive">Failed to load logs.</div>
      )}

      {data && (
        <div className="hairline overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">IP hash</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No visits recorded yet.
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.path ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {row.ip_hash ? `${row.ip_hash.slice(0, 16)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
