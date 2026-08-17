import { useState } from "react";
import { PRICING_PLANS } from "../lib/pricingPlans";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

export function PricingPage({ onNavigate, showToast }) {
  const [loading, setLoading] = useState(false);

  // Pre-signup checkout (api/start-checkout.js) — no memorial/account exists
  // yet, so payment happens first and gets attached to the memorial once one
  // is created via the normal magic-link onboarding flow (see app.jsx's
  // finishSignIn + attachPendingPaymentIfAny).
  const startCheckout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: BUILD.tier }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; } // off to Stripe Checkout
      showToast?.(data.error || "Couldn't start checkout. Please try again.", "error");
    } catch {
      showToast?.("Couldn't start checkout. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-hero">
            <div className="hero-tag fade-up">Pricing</div>
            <h1 className="hero-headline fade-up-2">
              Start for free. The rest is simple.
            </h1>
            <p className="hero-body fade-up-3 pricing-hero-body">
              Five memories included, free — no card required. That's five photos, videos, voicemails, or stories, mixed however you like, with every feature unlocked. Start there, and see how it comes together before you pay anything.
            </p>
          </div>
        </div>
      </div>

      {/* One way to pay */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <p className="hiw-paths-sub">When you're ready to keep it, one payment unlocks everything — no plans to choose between, nothing to renew later.</p>
          <div className="pricing-paths pricing-paths-single">
            <button
              type="button"
              className="pricing-path-card pricing-path-card-dark pricing-path-card-clickable"
              onClick={startCheckout}
              disabled={loading}
              aria-label="Pay Once — $49, no renewals ever. Continue to checkout."
            >
              <div className="pricing-path-label pricing-path-label-gold">{BUILD.label}</div>
              <div className="pricing-path-price">{BUILD.price}</div>
              <div className="pricing-path-sub">{BUILD.sub}</div>
              <div className="pricing-path-ring"><span className="pricing-path-ring-dot" /></div>
              <p className="pricing-path-body">{BUILD.body}</p>
            </button>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-closing">
            <p className="pricing-closing-line">That's the whole model — no surprises either way.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start your page, free</button>
            <span className="pricing-cta-note">Five entries, no card required. Upgrade any time.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo"><em>And Then...</em></div>
        <div className="footer-links">
          <button className="footer-link" onClick={() => onNavigate("home")}>Home</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
