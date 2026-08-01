export function HomePage({ onNavigate }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="hero">
            <div>
              <div className="hero-tag fade-up">And Then...</div>
              <h1 className="hero-headline fade-up-2">
                A living story <em>for<br />someone you love</em>.
              </h1>
              <p className="hero-body fade-up-3">
                Stories about someone live in a hundred different people. And Then gathers what everyone remembers — family, friends, the people who've known them for years — into one page that keeps filling in.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start their page</button>
                <button className="btn btn-ghost" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</button>
              </div>
            </div>

            <div className="fade-up-3">
              <div className="hero-photo">
                <div className="hero-photo-placeholder">real photos here</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div style={{ background: "var(--white)" }} id="how">
        <div className="page-wrap">
          <div className="narrative">
            <div className="section-label">What you get</div>
            <h2 className="narrative-headline">The photos and voicemails already exist. They're just scattered across a hundred phones.</h2>
            <p className="narrative-body">
              Somebody has a video you've never seen. Somebody else has a voicemail they left. Without a place for it to go, you never will. And Then is that place — one page everyone can add to, for as long as they have something left to give it.
            </p>
          </div>
        </div>
      </div>

      {/* Collecting is the easy part */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="narrative">
            <div className="section-label">Collecting is the easy part</div>
            <h2 className="narrative-headline">One link does all the work.</h2>
            <p className="narrative-body">
              Text it. Email it. Send it however you want. Whoever gets it taps it and adds their memory — no account, no app, nothing to set up. One tap, and it's on the page.
            </p>
          </div>
        </div>
      </div>

      {/* Everyone has a story */}
      <div style={{ background: "var(--bark)" }}>
        <div className="page-wrap">
          <div className="narrative">
            <h2 className="narrative-headline on-dark">Everyone has a story. Most people need a better question to tell it.</h2>
            <p className="narrative-body on-dark">
              "Share a memory" is a hard sentence to start with. And Then lets you write prompts made for them specifically — a habit, a phrase, the thing they always say — so people tell you the real version, not the one-liner.
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: "var(--bark-light)" }}>
        <div className="page-wrap">
          <div className="final-cta">
            <h2>Everyone has a story about them.</h2>
            <p>Start gathering them. Free to start. It only grows from here.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start their page</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">And Then<em>...</em></div>
        <div className="footer-links">
          <button className="footer-link" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>How it works</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
