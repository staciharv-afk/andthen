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
    <div className="hiw-page">
      <div className="page-wrap story-wrap">
        <div className="hero-tag fade-up">How it works</div>
        <h1 className="story-headline fade-up-2">Here's what happens when you start.</h1>
        <p className="hiw-sub fade-up-3">No card, no commitment — just enough to see what their page could become.</p>

        {STEPS.map((step, i) => (
          <div className="hiw-step" key={step.heading}>
            <div className="hiw-step-num">{i + 1}</div>
            <div className="hiw-step-body">
              <h3>{step.heading}</h3>
              <p>{step.body}</p>
            </div>
          </div>
        ))}

        <hr className="story-divider" />

        <p className="hiw-paths-heading">One way to pay, whenever you're ready</p>
        <p className="hiw-paths-sub">Nothing is charged until you decide to move past the free five.</p>

        <div className="pricing-paths hiw-paths pricing-paths-single">
          <div className="pricing-path-card pricing-path-card-dark">
            <div className="pricing-path-label pricing-path-label-gold">{BUILD.label}</div>
            <div className="pricing-path-price">{BUILD.price}</div>
            <div className="pricing-path-sub">{BUILD.sub}</div>
            <p className="pricing-path-body">{BUILD.body}</p>
          </div>
        </div>

        <div className="hiw-cta-block">
          <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
          <span className="pricing-cta-note">Takes about two minutes. Nothing to pay yet.</span>
        </div>
      </div>

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
    </div>
  );
}
