import { useState } from "react";

export function PricingPage({ onNavigate, showToast }) {
  const [loadingTier, setLoadingTier] = useState(null); // "payg" | "forever" | null

  // Pre-signup checkout (api/start-checkout.js) — no memorial/account exists
  // yet, so payment happens first and gets attached to the memorial once one
  // is created via the normal magic-link onboarding flow (see app.jsx's
  // finishSignIn + attachPendingPaymentIfAny).
  const startCheckout = async (tier) => {
    if (loadingTier) return;
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/start-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; } // off to Stripe Checkout
      showToast?.(data.error || "Couldn't start checkout. Please try again.", "error");
    } catch {
      showToast?.("Couldn't start checkout. Please try again.", "error");
    } finally {
      setLoadingTier(null);
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
              Five memories included, free — no card required. That's five photos, videos, voicemails, or stories, mixed however you like, with every feature unlocked. Start there, and see how it comes together before you pay anything. Once you're ready, there are two ways to pay for it.
            </p>
          </div>
        </div>
      </div>

      {/* Two ways to pay */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-paths">
            <button
              type="button"
              className="pricing-path-card pricing-path-card-light pricing-path-card-clickable"
              onClick={() => startCheckout("payg")}
              disabled={!!loadingTier}
              aria-label="Pay as you go — $49 to build, $10 a year to keep it live. Continue to checkout."
            >
              <div className="pricing-path-label pricing-path-label-rust">Pay as you go</div>
              <div className="pricing-path-price">$49 + $10/yr.</div>
              <div className="pricing-path-sub">Build once, renew yearly.</div>
              <div className="pricing-path-dots">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`pricing-path-dot${i === 0 ? " filled" : ""}`} />
                ))}
              </div>
              <span className="pricing-path-dots-caption">year 1 &rarr; onward</span>
              <p className="pricing-path-body">
                $49 unlocks unlimited entries and contributors, first year hosting included. $10/yr after that keeps it online — flat rate, never increases. Miss a payment and the page pauses, it doesn't disappear.
              </p>
            </button>

            <button
              type="button"
              className="pricing-path-card pricing-path-card-dark pricing-path-card-clickable"
              onClick={() => startCheckout("forever")}
              disabled={!!loadingTier}
              aria-label="Pay once — $100 forever, no renewals. Continue to checkout."
            >
              <div className="pricing-path-label pricing-path-label-gold">Pay once</div>
              <div className="pricing-path-price">$100.</div>
              <div className="pricing-path-sub">Forever — no renewals.</div>
              <div className="pricing-path-ring"><span className="pricing-path-ring-dot" /></div>
              <p className="pricing-path-body">
                One payment instead of the build fee. No annual fee, ever. Nothing to renew, nothing to miss, nothing that pauses.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-closing">
            <p className="pricing-closing-line">That's the whole model — pick whichever one means you never have to think about it again.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start your page, free</button>
            <span className="pricing-cta-note">Five entries, no card required. Upgrade any time.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">And Then<em>...</em></div>
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
