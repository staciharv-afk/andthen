export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

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
  const date = new Date(d);
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

// Fire-and-forget: ask the server to email the memorial's creator that
// someone has asked for access. Takes the memorial, not the request — a
// fresh pending request isn't readable back by its own inserter under RLS,
// so (like notifyCreator) the server finds the newest un-notified one for
// this memorial itself. No-ops locally.
export const notifyAccessRequest = (memorialId) => {
  if (!memorialId) return;
  fetch("/api/notify-access-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memorialId }),
  }).catch(() => {});
};

// Fire-and-forget: ask the server to email a requester their personal
// contribute link after the creator approves their access request. No-ops
// locally.
export const notifyAccessApproved = (requestId) => {
  if (!requestId) return;
  fetch("/api/notify-access-approved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  }).catch(() => {});
};

// Fire-and-forget: ask the server to email a personal invite to add a
// memory, for someone the steward is proactively inviting (as opposed to
// notifyAccessApproved, for someone who asked first). No-ops locally.
export const notifyInvite = (requestId) => {
  if (!requestId) return;
  fetch("/api/notify-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
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
