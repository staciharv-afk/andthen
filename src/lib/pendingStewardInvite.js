// Holds a co-steward invite token between the emailed accept link
// (?steward_invite=<token> landing on the home view, see app.jsx's load
// effect) and the magic-link click that actually signs the invitee in —
// same shape of problem, same localStorage bridge, as pendingPayment.js.
// See app.jsx's tryAcceptPendingStewardInvite for where this gets consumed
// and cleared.
const KEY = "andthen_pending_steward_invite";

export const savePendingStewardInvite = (token) => {
  try { localStorage.setItem(KEY, token); } catch {}
};

export const readPendingStewardInvite = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const clearPendingStewardInvite = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
