import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export const Route = createFileRoute("/api/public/log-visit")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const xff = request.headers.get("x-forwarded-for") ?? "";
          const ip =
            xff.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";

          let path = "/";
          try {
            const body = (await request.json()) as { path?: unknown };
            if (typeof body?.path === "string" && body.path.length <= 2048) {
              path = body.path;
            }
          } catch {
            /* empty body is fine */
          }

          const ip_hash = hashIp(ip);

          await supabaseAdmin.from("visit_logs").insert({ path, ip_hash });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: corsHeaders({ "Content-Type": "application/json" }),
          });
        } catch (e) {
          console.error("log-visit error", e);
          return new Response(JSON.stringify({ ok: false }), {
            status: 200, // never break the page
            headers: corsHeaders({ "Content-Type": "application/json" }),
          });
        }
      },
    },
  },
});
