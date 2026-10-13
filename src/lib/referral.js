// Remembers which partner page sent a visitor here (a funeral home's
// landing page at public/partners/<slug>/ links to /?ref=<slug>), so the
// memorial they go on to create can be tagged with it — same localStorage
// bridge as onboardingDraft.js, since the magic-link round trip sits between
// landing and the insert. Saved on memorials.referral_source
// (supabase/migrations/20261013_referral_source.sql).
const KEY = "andthen_referral_source";

// Call once, on app mount. Last partner link clicked wins.
export const captureReferral = () => {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    const clean = (ref || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
    if (clean) localStorage.setItem(KEY, clean);
  } catch {}
};

export const readReferral = () => {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
};

// Spread into a memorials insert. Adds nothing for an ordinary visitor, so
// only a referred signup ever sends the column.
export const referralFields = () => {
  const ref = readReferral();
  return ref ? { referral_source: ref } : {};
};
