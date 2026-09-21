import { PRICING_PLANS } from "../lib/pricingPlans";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

const STEPS = [
  {
    heading: "Start their page, free",
    body: "Add their name and a photo, and you're in — five memories included, every feature unlocked, no card required.",
  },
  {
    heading: "Invite the people who knew them",
    body: <>Send one link. <em>And Then</em> asks each person the right question for who they were to your loved one — no account needed for them to answer.</>,
  },
  {
    heading: "Watch it fill in",
    body: "Photos, voicemails, videos, and stories start arriving from everyone you invited — each one landing in the same page, building a fuller picture than any one person could on their own.",
  },
  {
    heading: "When you're ready, keep it",
    body: "Once you've seen it come together, one payment unlocks everything — for good.",
  },
];

// This is the page "Start their page" routes to instead of jumping straight
// into signup — it's the orientation screen from the onboarding spec (hero
// -> orientation screen -> email capture -> intro step), built as a real,
// linkable page rather than a modal. Pricing copy is pulled from
// lib/pricingPlans.js (the same source the real Pricing page reads from)
// so the two numbers can't drift apart.
export function HowItWorksPage({ onNavigate }) {
  return (
    <div className="mkt-page">
      <div className="page-wrap mkt-page-hero">
        <div className="mkt-eyebrow fade-up"><span className="mkt-eyebrow-line" aria-hidden="true" />How it works</div>
        <h1 className="mkt-h1 fade-up-2">Here's what happens when you start.</h1>
        <p className="mkt-page-hero-sub fade-up-3">No card, no commitment — just enough to see what their page could become.</p>

        <div className="mkt-hiw-steps">
          {STEPS.map((step, i) => (
            <div className="mkt-hiw-step" key={step.heading}>
              <div className="mkt-hiw-step-num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3 className="mkt-hiw-step-heading">{step.heading}</h3>
                <p className="mkt-hiw-step-body">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="mkt-divider" />

        <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />One way to pay, whenever you're ready</div>
        <p className="mkt-body mkt-narrow">Nothing is charged until you decide to move past the free five.</p>

        <div className="mkt-pay-card" style={{ marginTop: 24, cursor: "default" }}>
          <div className="mkt-pay-card-label">{BUILD.label}</div>
          <div className="mkt-pay-card-price">{BUILD.price}</div>
          <div className="mkt-pay-card-sub">{BUILD.sub}</div>
          <p className="mkt-pay-card-body">{BUILD.body}</p>
        </div>

        <div className="mkt-closing-block" style={{ marginTop: 48 }}>
          <button className="mkt-btn mkt-btn-solid" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
          <span className="mkt-closing-note">Takes about two minutes. Nothing to pay yet.</span>
        </div>
      </div>

      <footer className="mkt-footer page-wrap">
        <span className="mkt-wordmark" style={{ cursor: "default" }}>
          <span className="mkt-wordmark-line" aria-hidden="true" />
          <span className="mkt-wordmark-text">And Then</span>
          <span className="mkt-wordmark-dots" aria-hidden="true">…</span>
        </span>
        <div className="mkt-footer-links">
          <button className="mkt-footer-link" onClick={() => onNavigate("home")}>Home</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("our-promise")}>Our Promise</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("privacy")}>Privacy</button>
          <button className="mkt-footer-link">Contact</button>
        </div>
        <div className="mkt-footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
