export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// "Five memories included, free" — the number of memories a free-tier
// memorial can hold before its owner has to upgrade to add more or invite
// anyone else. Mirrored server-side in the contributions INSERT policy
// (20260812_free_tier_limit.sql / can_insert_contribution()) — keep both in
// sync if this ever changes.
export const FREE_MEMORY_LIMIT = 5;

// Short, human-typeable access code for a private page or code-required
// contribution — unlike uid(), this needs to be readable off a printed card
// and retyped by hand, so it avoids visually ambiguous characters (0/O,
// 1/I/L) and stays short (8 chars, ~41 bits — plenty for a secret that's
// rate-limited by RLS, not brute-forceable over the network at any real rate).
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const genAccessCode = () =>
  Array.from({ length: 8 }, () => ACCESS_CODE_ALPHABET[Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)]).join("");

// m:ss, for audio/video playback elapsed/duration displays.
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Normalize free text into a URL-safe slug: lowercase, alphanumeric words
// joined by single hyphens, no leading/trailing/doubled hyphens. Matches the
// memorials_slug_format DB constraint.
export const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const fmtDate = (d) => {
  if (!d) return "";
  // Date-only values (born/passed, "YYYY-MM-DD") have no timezone info, so
  // `new Date(d)` parses them as UTC midnight — which `toLocaleDateString`
  // then renders a day early in any timezone behind UTC. Parse the parts
  // directly as a local date to sidestep that. Full timestamps (created_at)
  // already carry an actual instant, so `new Date(d)` is correct for those.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(d);
  const date = dateOnly ? new Date(...d.split("-").map((n, i) => i === 1 ? Number(n) - 1 : Number(n))) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

export const timeAgo = (d) => {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
};

export const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });

// Fire-and-forget: ask the server to email a contributor a thank-you.
// Safe to call anywhere — it never throws, and the server decides whether to
// actually send (approved + has email + not already thanked). No-ops locally,
// where the /api function isn't served by Vite.
export const sendThankYou = (contributionId) => {
  if (!contributionId) return;
  fetch("/api/thank-you", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contributionId }),
  }).catch(() => {});
};

// Fire-and-forget: ask the server to email the memorial's creator that a new
// memory arrived. The server enforces a 5/day cap and dedupes per contribution,
// so it's safe to call on every submission. No-ops locally.
export const notifyCreator = (memorialId) => {
  if (!memorialId) return;
  fetch("/api/notify-creator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memorialId }),
  }).catch(() => {});
};

// Fire-and-forget: ask the server to email a newly-invited co-steward their
// accept link. No-ops locally.
export const notifyStewardInvite = (inviteId) => {
  if (!inviteId) return;
  fetch("/api/notify-steward-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteId }),
  }).catch(() => {});
};
