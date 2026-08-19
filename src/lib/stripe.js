import { loadStripe } from "@stripe/stripe-js";

// Loaded once, lazily, and shared — same singleton pattern as
// src/lib/supabase.js. Publishable keys are safe to expose client-side by
// design (VITE_ prefix, unlike the server-only STRIPE_SECRET_KEY).
//
// Always resolves (never rejects) even if the key is missing/invalid —
// EmbeddedCheckoutModal checks for a null result and shows its own error
// state instead of leaving an unhandled rejection.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").catch(() => null);
