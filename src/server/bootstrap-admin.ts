import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const USERNAME = "vainadminka";
const EMAIL = `${USERNAME}@vain.local`;

// Idempotent: ensures vainadminka exists with the configured password,
// has admin role, and seeds a few demo entries if the table is empty.
// Re-runs are cheap (early-returns once everything is in place).
export const bootstrapAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const password = process.env.VAINADMINKA_PASSWORD;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // In dev/preview the runtime secrets are not injected — skip silently.
  if (!password || !serviceKey) return { ok: false, reason: "no-secrets" as const };


  // Quick check: is there already a user_role admin? Skip work if yes AND entries exist.
  const { data: existingAdmin } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  const { count: entryCount } = await supabaseAdmin
    .from("entries")
    .select("id", { count: "exact", head: true });

  if (existingAdmin && (entryCount ?? 0) > 0) {
    return { ok: true, skipped: true as const };
  }

  // 1. find or create the auth user
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) return { ok: false, step: "list", error: listErr.message };

  let userId: string;
  const existing = list.users.find((u) => u.email === EMAIL);
  if (existing) {
    userId = existing.id;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { username: USERNAME },
    });
    if (error) return { ok: false, step: "update", error: error.message };
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { username: USERNAME },
    });
    if (error) return { ok: false, step: "create", error: error.message };
    userId = data.user.id;
  }

  // 2. profile
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, username: USERNAME, display_name: USERNAME }, { onConflict: "id" });

  // 3. admin role
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r) => r.role === "admin")) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
  }

  // 4. seed demo entries if empty
  let seeded = 0;
  if ((entryCount ?? 0) === 0) {
    const demo = [
      {
        author_id: userId,
        type: "post" as const,
        body: "first signal — testing the wire. short, raw, low-fi.",
        tags: ["meta", "intro"],
        media: [],
        draft: false,
      },
      {
        author_id: userId,
        type: "post" as const,
        body: "notes from a quiet morning. coffee, grey light, the hum of the fridge.",
        tags: ["mood"],
        media: [],
        draft: false,
      },
      {
        author_id: userId,
        type: "article" as const,
        title: "On building small things",
        subtitle: "A short manifesto for low-noise software.",
        content_html:
          "<p>Most software is too loud. It blinks, it nags, it fills your day with notifications you never asked for.</p><p>This is a small space — a personal media log. Posts are short. Articles are slow. Nothing here demands your attention.</p><p>That is the whole feature.</p>",
        reading_minutes: 2,
        tags: ["essay", "design"],
        media: [],
        draft: false,
      },
      {
        author_id: userId,
        type: "article" as const,
        title: "Draft: ideas for next week",
        subtitle: "Not ready yet.",
        content_html: "<p>Outline only. Do not publish.</p>",
        reading_minutes: 1,
        tags: ["draft"],
        media: [],
        draft: true,
      },
    ];
    const { error } = await supabaseAdmin.from("entries").insert(demo);
    if (error) return { ok: false, step: "seed", error: error.message };
    seeded = demo.length;
  }

  return { ok: true, userId, seeded };
});
