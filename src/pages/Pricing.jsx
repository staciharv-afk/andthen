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

// `intent` is the nav param — "gift" (from the homepage "Give it as a gift"
// row) opens the gift modal straight away.
export function PricingPage({ onNavigate, intent }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(intent === "gift");
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
    <div className="mkt-page">
      {giftSent && (
        <div className="mkt-gift-banner page-wrap" role="status" style={{ marginTop: 24 }}>
          <h2 className="mkt-gift-banner-title">Your gift is on its way.</h2>
          <p className="mkt-gift-banner-body">
            We've emailed them a link to open it whenever they're ready — the page is paid for and waiting, with nothing for you to forward or track. If you added your email, there's a confirmation in your inbox too.
          </p>
          <button type="button" className="mkt-btn mkt-btn-ghost" onClick={() => setGiftSent(false)}>
            Close
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-page-hero">
            <div className="mkt-eyebrow fade-up"><span className="mkt-eyebrow-line" aria-hidden="true" />Pricing</div>
            <h1 className="mkt-h1 fade-up-2">Start for free. The rest is simple.</h1>
            <p className="mkt-page-hero-sub fade-up-3">
              Five memories included, free — no card required. That's five photos, videos, voicemails, or stories, mixed however you like, with every feature unlocked. Start there, and see how it comes together before you pay anything.
            </p>
          </div>
        </div>
      </div>

      {/* One way to pay */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-section-inner" style={{ paddingTop: 24 }}>
            <p className="mkt-body mkt-narrow">When you're ready to keep it, one payment unlocks everything — no plans to choose between, and nothing to guess about what you're getting.</p>

            <button
              type="button"
              className="mkt-pay-card"
              onClick={() => setShowCheckout(true)}
              aria-label="Pay Once — $49, no renewals ever. Continue to checkout."
              style={{ marginTop: 28 }}
            >
              <div className="mkt-pay-card-label">{BUILD.label}</div>
              <div className="mkt-pay-card-price">{BUILD.price}</div>
              <div className="mkt-pay-card-sub">{BUILD.sub}</div>
              <p className="mkt-pay-card-body">{CARD_BODY}</p>
            </button>
            <button type="button" className="mkt-gift-pill" onClick={() => setShowGiftModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M12 8v13" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
                <path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
              </svg>
              Buying this for someone else? Send it as a gift
            </button>

            <div className="mkt-eyebrow" style={{ marginTop: 56 }}><span className="mkt-eyebrow-line" aria-hidden="true" />What $49 unlocks</div>
            <div className="mkt-unlocks">
              {UNLOCKS.map(({ label, body }, i) => (
                <div className={i === UNLOCKS.length - 1 ? "mkt-unlock-full" : undefined} key={label}>
                  <h3 className="mkt-unlock-label">{label}</h3>
                  <p className="mkt-unlock-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-closing-block">
            <button className="mkt-btn mkt-btn-solid" onClick={() => onNavigate("onboarding")}>Start your page, free</button>
            <span className="mkt-closing-note">Five entries, no card required. Upgrade any time.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mkt-footer page-wrap">
        <span className="mkt-wordmark" style={{ cursor: "default" }}>
          <span className="mkt-wordmark-line" aria-hidden="true" />
          <span className="mkt-wordmark-text">And Then</span>
          <span className="mkt-wordmark-dots" aria-hidden="true">…</span>
        </span>
        <div className="mkt-footer-links">
          <button className="mkt-footer-link" onClick={() => onNavigate("home")}>Home</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("our-promise")}>Our Promise</button>
          <button className="mkt-footer-link">Privacy</button>
          <button className="mkt-footer-link">Contact</button>
        </div>
        <div className="mkt-footer-copy">© 2026 And Then</div>
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
        <GiftModal onClose={() => setShowGiftModal(false)} />
      )}
    </div>
  );
}
