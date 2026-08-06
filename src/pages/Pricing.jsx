const TIMELINE = [
  { yr: "Year 1", amt: "$49", tag: "once — everything unlocked", origin: true },
  { yr: "Year 2", amt: "$19.99", tag: "keeps the page live" },
  { yr: "Year 3", amt: "$19.99", tag: "same, every year" },
  { yr: "Year 4", amt: "$19.99", tag: "nothing changes" },
  { yr: "Year 5", amt: "$19.99", tag: "and onward" },
];

export function PricingPage({ onNavigate }) {
  return (
    <div className="pricing-page">
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-hero">
            <div className="hero-tag fade-up">Pricing</div>
            <h1 className="hero-headline fade-up-2">
              Try it free.<br />Build it for <em>$49</em>.<br />$19.99 a year after that.
            </h1>
            <p className="hero-body fade-up-3 pricing-hero-body">
              Five entries, no card required. Other memorial platforms charge $150 or more — we don't think permanence should cost that much.
            </p>
          </div>
        </div>
      </div>

      {/* Free tier */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-free">
            <div className="pricing-free-row">
              <h2 className="pricing-free-heading">Start free</h2>
              <span className="pricing-price-tag">$0</span>
            </div>
            <p className="pricing-free-body">Five entries, free — see how the page comes together before you commit.</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="pricing-timeline-section">
            <h2 className="pricing-section-heading">How the cost works over time</h2>
            <p className="pricing-section-sub">One fee to build it. A small yearly fee to keep it standing.</p>

            <div className="pricing-timeline">
              <div className="pricing-timeline-track">
                <span className="pricing-timeline-fade-dots" aria-hidden="true">···</span>
              </div>
              <div className="pricing-timeline-points">
                {TIMELINE.map((point) => (
                  <div className={`pricing-point${point.origin ? " pricing-point-origin" : ""}`} key={point.yr}>
                    <span className="pricing-point-yr">{point.yr}</span>
                    <span className="pricing-point-amt">{point.amt}</span>
                    <span className="pricing-point-tag">{point.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column detail */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-detail-grid">
            <div className="pricing-detail-col">
              <div className="pricing-kicker">The one-time part</div>
              <h3 className="pricing-detail-heading">$49, paid once</h3>
              <ul className="pricing-detail-list">
                <li><strong>Unlimited entries</strong> — any format, past the free five</li>
                <li><strong>Unlimited contributors</strong> — no account needed to add a memory</li>
                <li><strong>First year hosting</strong> — included</li>
              </ul>
            </div>
            <div className="pricing-detail-col">
              <div className="pricing-kicker">The yearly part</div>
              <h3 className="pricing-detail-heading">$19.99, starting year two</h3>
              <ul className="pricing-detail-list">
                <li><strong>Keeps the page online</strong> — hosting, backups, the domain</li>
                <li><strong>Flat rate</strong> — never increases, never charged in year one</li>
                <li><strong>If it's ever missed</strong> — the page pauses, it doesn't disappear</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Prepay callout */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-prepay-box">
            {/*
              Billing not implemented yet — marketing copy only.
              When Stripe is wired up, this is where the $149/10-year prepay
              purchase option gets hooked in, alongside the $49 one-time charge,
              the $19.99/yr renewal, and the pause-(don't-delete)-on-missed-renewal
              behavior described in the detail columns above.
            */}
            <span className="pricing-prepay-label">Prefer fewer renewals?</span>
            <span className="pricing-prepay-price">$149 covers 10 years</span>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="pricing-closing">
            <p className="pricing-closing-quote">Every great story starts with and then they&hellip;</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start your page, free</button>
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
