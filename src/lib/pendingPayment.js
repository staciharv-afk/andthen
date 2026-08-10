// Holds a completed pre-signup Stripe Checkout session between the payment
// redirect (?paid_session=…&tier=… landing on the onboarding view, see
// app.jsx's load effect) and the magic-link click that actually creates the
// memorial to attach it to — same shape of problem, same localStorage
// bridge, as onboardingDraft.js. See app.jsx's finishSignIn for where this
// gets consumed (api/attach-presignup-payment.js) and cleared.
const KEY = "andthen_pending_payment";

export const savePendingPayment = (payment) => {
  try { localStorage.setItem(KEY, JSON.stringify(payment)); } catch {}
};

export const readPendingPayment = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingPayment = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
