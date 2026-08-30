import { useState } from "react";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { FREE_MEMORY_LIMIT } from "../lib/utils";
import { useScrollLock } from "../lib/useScrollLock";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

// Shown the moment a free-tier page's owner runs into the 5-memory cap —
// from Dashboard.jsx's "+ Add a memory" and Memorial.jsx's own "Upgrade to
// add more" CTA, whichever they hit it from. Dismissable like every other
// modal here (there's no reason to trap a grieving steward on this screen),
// but dismissing it doesn't unlock anything — adding a 6th memory stays
// blocked, client- and server-side (can_insert_contribution()), until the
// page actually gets paid for. Reuses Dashboard.jsx's handleUpgrade
// redirect flow rather than the embedded-checkout modal (EmbeddedCheckoutModal
// / api/start-checkout.js) — that one's specifically for a memorial that
// doesn't exist yet; this is always an existing, already-identified page,
// same as the Dashboard's own inline "Upgrade" button (api/create-checkout.js).
export function MemoryLimitModal({ memorial, onClose }) {
  useScrollLock();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setUpgrading(true);
    setError("");
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId: memorial.id, tier: BUILD.tier }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; } // off to Stripe Checkout
      setError(data.error || "Couldn't start checkout. Please try again.");
    } catch {
      setError("Couldn't start checkout. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crop-adjust-card" role="dialog" aria-label="Upgrade to add more memories">
        <h3 className="crop-adjust-title">You've used your {FREE_MEMORY_LIMIT} free memories</h3>
        <p className="crop-adjust-sub">
          {memorial.name}'s page is full for now — the free plan holds {FREE_MEMORY_LIMIT} memories. Upgrade for {BUILD.price} (one-time) to add more, and unlock photo, video &amp; voice contributions plus inviting others to add their own.
        </p>
        {error && <p className="form-error">{error}</p>}
        <div className="crop-adjust-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={upgrading}>Not right now</button>
          <button type="button" className="btn btn-rust" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? <><span className="spinner" /> Starting...</> : `Upgrade — ${BUILD.price}`}
          </button>
        </div>
      </div>
    </div>
  );
}
