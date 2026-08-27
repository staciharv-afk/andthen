import { useEffect, useState } from "react";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { EmbeddedCheckoutModal } from "../components/EmbeddedCheckoutModal";
import { GiftModal } from "../components/GiftModal";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

// The card's own body is short now — everything it used to spell out lives
// in UNLOCKS below instead. Deliberately not BUILD.body: How It Works still
// shows the fuller one-paragraph version, since it doesn't have this grid.
const CARD_BODY = "One payment. No bill after that. Nothing to renew, nothing to miss.";

const UNLOCKS = [
  { label: "Never a blank page", body: "Each person you invite gets asked the right question for who your loved one was to them — nobody has to stare at an empty box wondering what to write." },
  { label: "Every kind of memory, no cap", body: "Photos, videos, voicemails, spoken stories, written stories, recipes, documents, links — upload as many as you want, from as many people as you want." },
  { label: "You decide what stays", body: "Keep every memory that comes in, or curate what shows up on the page — it's yours to manage, any time you want to." },
  { label: "Nothing's locked away", body: "Export everything you've collected, in full, whenever you want it — yours to keep, print, or share however you like." },
  { label: "A page that keeps living", body: "Come back to it next year, or ten years from now. New memories can keep arriving, so everyone who visits — today or a decade from now — gets to know your loved one a little better." },
];

export function PricingPage({ onNavigate }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  // Set by create-gift-checkout.js's success_url after a gift is paid for.
  // Read once, then strip from the URL so a refresh or a later visit doesn't
  // resurface it (Stripe redirects the whole tab here, so there's no in-app
  // state to carry the confirmation any other way).
  const [giftSent, setGiftSent] = useState(
    () => new URLSearchParams(window.location.search).get("gift_sent") === "1"
  );

  useEffect(() => {
    if (!giftSent) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("gift_sent");
    window.history.replaceState({}, "", url);
  }, [giftSent]);

  return (
    <div className="pricing-page">
      {giftSent && (
        <div className="gift-sent-banner fade-up" role="status">
          <div className="gift-sent-banner-inner">
            <h2 className="gift-sent-banner-title">Your gift is on its way.</h2>
            <p className="gift-sent-banner-body">
              We've emailed them a link to open it whenever they're ready — the page is paid for and waiting, with nothing for you to forward or track. If you added your email, there's a confirmation in your inbox too.
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => setGiftSent(false)}>
              Close
            </button>
          </div>
        </div>
      )}

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
          <p className="hiw-paths-sub">When you're ready to keep it, one payment unlocks everything — no plans to choose between, and nothing to guess about what you're getting.</p>
          <div className="pricing-paths pricing-paths-single">
            <button
              type="button"
              className="pricing-path-card pricing-path-card-dark pricing-path-card-clickable"
              onClick={() => setShowCheckout(true)}
              aria-label="Pay Once — $49, no renewals ever. Continue to checkout."
            >
              <div className="pricing-path-label pricing-path-label-gold">{BUILD.label}</div>
              <div className="pricing-path-price">{BUILD.price}</div>
              <div className="pricing-path-sub">{BUILD.sub}</div>
              <div className="pricing-path-ring"><span className="pricing-path-ring-dot" /></div>
              <p className="pricing-path-body">{CARD_BODY}</p>
            </button>
            <button type="button" className="gift-pill" onClick={() => setShowGiftModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M12 8v13" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
                <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
              </svg>
              Buying this for someone else? Send it as a gift
            </button>
          </div>

          <div className="section-label" style={{ marginTop: 56 }}>What $49 unlocks</div>
          <div className="wyg2-grid">
            {UNLOCKS.map(({ label, body }, i) => (
              <div className="wyg2-item" key={label} style={i === UNLOCKS.length - 1 ? { gridColumn: "1 / -1" } : undefined}>
                <h3 className="wyg2-label">{label}</h3>
                <p className="wyg2-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-closing">
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
          <button className="footer-link" onClick={() => onNavigate("our-promise")}>Our Promise</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>

      {showCheckout && (
        <EmbeddedCheckoutModal
          tier={BUILD.tier}
          returnView="onboarding"
          title={`Pay Once — ${BUILD.price}`}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {showGiftModal && (
        <GiftModal
          onClose={() => setShowGiftModal(false)}
          onContinueForMe={() => { setShowGiftModal(false); setShowCheckout(true); }}
        />
      )}
    </div>
  );
}
