// Holds what a gift buyer just submitted (subject name, recipient's first
// name, and any suggested co-stewards) between GiftModal's redirect to
// Stripe Checkout and the confirmation banner on Pricing.jsx's success_url
// return — Stripe redirects the whole tab, so there's no in-app state to
// carry it any other way. Same shape of bridge as pendingGiftClaim.js.
const KEY = "andthen_pending_gift_confirmation";

export const savePendingGiftConfirmation = (confirmation) => {
  try { localStorage.setItem(KEY, JSON.stringify(confirmation)); } catch {}
};

export const readPendingGiftConfirmation = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingGiftConfirmation = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
