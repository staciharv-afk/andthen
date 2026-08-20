// Vercel serverless function — the And Then operator's own view: every
// memorial ever created, its URL, who made it, and when. Exposes every
// user's email address, so this is the one endpoint in the app that
// actually verifies who's calling rather than trusting the client — every
// other api/*.js file in this app runs on the service-role key without an
// identity check (fine for those, since they're scoped to a single row a
// client already proved it controls); this one is different because it
// returns everyone's data at once.
//
// The client sends its own Supabase access token (Authorization: Bearer
// <token>, from supabase.auth.getSession()). This handler asks Supabase to
// verify that token is real and get the account it belongs to, then checks
// that account's email against ADMIN_EMAIL — a server-only env var, never
// exposed to the client build (no VITE_ prefix). Anyone else gets a plain
// 403, no data.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL
// Optional: SUPABASE_URL (falls back to VITE_SUPABASE_URL)
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Admin view is not configured on the server." });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await requireAdmin(req, res, admin))) return;

  const { data: memorials, error: memErr } = await admin
    .from("memorials")
    .select("id, name, slug, invite_code, steward_id, is_paid, created_at")
    .order("created_at", { ascending: false });
  if (memErr) return res.status(500).json({ error: memErr.message });

  // One paginated pass to resolve every steward_id to an email, instead of
  // a getUserById call per memorial — flat cost regardless of how many
  // pages exist, just how many distinct accounts have ever created one.
  const emailById = new Map();
  let page = 1;
  while (true) {
    const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listErr) return res.status(500).json({ error: listErr.message });
    for (const u of pageData.users) emailById.set(u.id, u.email);
    if (pageData.users.length < 1000) break;
    page += 1;
  }

  const rows = (memorials || []).map((m) => ({
    id: m.id,
    name: m.name,
    url: m.slug ? `https://www.myandthen.com/${m.slug}` : `https://www.myandthen.com/?memorial=${m.invite_code}`,
    creator_email: emailById.get(m.steward_id) || null,
    is_paid: m.is_paid,
    created_at: m.created_at,
  }));

  return res.status(200).json({
    total_pages: rows.length,
    total_creators: new Set(rows.map((r) => r.creator_email).filter(Boolean)).size,
    memorials: rows,
  });
}
