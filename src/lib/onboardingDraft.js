// Holds the intro-step answers (name/relation/description) between "Create
// their page" and the magic-link click that actually authenticates them —
// memorial creation requires an authenticated steward_id, so it can't happen
// until then. See app.jsx's SIGNED_IN handler for where this gets consumed.
const KEY = "andthen_onboarding_draft";

export const saveDraft = (draft) => {
  try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch {}
};

export const readDraft = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearDraft = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
