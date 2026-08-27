// Holds a gift being claimed between the "Get started" click on
// /claim-gift (src/pages/ClaimGift.jsx) and the magic-link click that
// actually creates the recipient's memorial — same shape of problem, same
// localStorage bridge, as pendingPayment.js. See app.jsx's finishSignIn for
// where this gets consumed (api/claim-gift.js) and cleared.
const KEY = "andthen_pending_gift_claim";

export const savePendingGiftClaim = (claim) => {
  try { localStorage.setItem(KEY, JSON.stringify(claim)); } catch {}
};

export const readPendingGiftClaim = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingGiftClaim = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
