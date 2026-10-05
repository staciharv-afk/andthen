import { supabase } from "./supabase";
import { FREE_MEMORY_LIMIT } from "./utils";

// Saving memories, shared by the share-a-memory flow (ShareMemoryModal) and
// the creator's multi-photo uploader (MediaBatchUploader).

// Turns a contributor-typed string into a real absolute URL, defaulting to
// https:// when no scheme was typed (e.g. "site.com/obituary") — the same
// forgiving parse a browser address bar does, so "That doesn't look like a
// link" only fires on genuinely malformed input, not a missing "https://".
export function normalizeShareUrl(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null; // rejects e.g. "https://asdf"
    return url;
  } catch { return null; }
}

// `taken_on` arrived with 20261004_batch_upload.sql. If the app is ever
// ahead of the database, save the memories without it rather than not at all.
async function insertRows(rows, wantIds) {
  const run = (rs) => (wantIds ? supabase.from("contributions").insert(rs).select("id") : supabase.from("contributions").insert(rs));
  let res = await run(rows);
  if (res.error && /taken_on/.test(res.error.message || "")) res = await run(rows.map(({ taken_on, ...rest }) => rest));
  if (res.error) throw res.error;
  return res.data || [];
}

// Inserts one contributions row per entry of `rows` (each without `status`
// — that's decided here), in order. Resolves to how many landed where:
//   { added, held, unsaved, moderated, lastId }
//
// - Status follows the page's moderation setting. The insert policy only
//   accepts that status (can_insert_contribution), creators included, so a
//   creator's own rows on a moderated page are approved in a second step —
//   moderation is for other people's memories.
// - On a free page, rows past the free limit are saved as 'held' (creators
//   only — nobody else can add to a free page) and published by the database
//   when the page is paid for. `unsaved` counts any that couldn't even be
//   held.
// - `moderated` is true when what was added is waiting on the family.
// Throws if the main insert fails.
export async function publishContributions({ memorial, rows, isCreator }) {
  const pageStatus = memorial.require_approval ? "pending" : "approved";

  let live = rows, extra = [];
  if (!memorial.is_paid) {
    const { count } = await supabase.from("contributions").select("id", { count: "exact", head: true })
      .eq("memorial_id", memorial.id).not("status", "in", "(rejected,held)");
    const slots = Math.max(0, FREE_MEMORY_LIMIT - (count || 0));
    live = rows.slice(0, slots);
    extra = rows.slice(slots);
  }

  let lastId = null;
  if (live.length) {
    // A moderated page hides pending rows from the contributor who just sent
    // them, so only ask for ids back when they'll be readable.
    const wantIds = isCreator || !memorial.require_approval;
    const inserted = await insertRows(live.map((r) => ({ ...r, status: pageStatus })), wantIds);
    lastId = inserted[inserted.length - 1]?.id || null;
    if (isCreator && memorial.require_approval && inserted.length) {
      const { error } = await supabase.from("contributions").update({ status: "approved" }).in("id", inserted.map((r) => r.id));
      if (error) throw error;
    }
  }

  let held = 0, unsaved = 0;
  if (extra.length) {
    try { await insertRows(extra.map((r) => ({ ...r, status: "held" })), false); held = extra.length; }
    catch { unsaved = extra.length; }
  }

  return { added: live.length, held, unsaved, moderated: !isCreator && !!memorial.require_approval, lastId };
}

// "We'll remember you on this device" — name and email carry across every
// page; how they knew someone is remembered per page, since it's a different
// answer for each person.
const IDENTITY_KEY = "andthen_contributor";
const readIdentityStore = () => {
  try { return JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null") || {}; }
  catch { return {}; }
};
export function loadContributorIdentity(memorialId) {
  const store = readIdentityStore();
  const rel = store.relationships?.[memorialId] || {};
  return { name: store.name || "", email: store.email || "", relationship: rel.id || null, otherRelationshipText: rel.other || "" };
}
export function saveContributorIdentity(memorialId, { name, email, relationship, otherRelationshipText }) {
  try {
    const store = readIdentityStore();
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({
      name, email,
      relationships: { ...store.relationships, [memorialId]: { id: relationship, other: otherRelationshipText || "" } },
    }));
  } catch { /* storage unavailable — they'll just be asked again */ }
}
