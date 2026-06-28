export function HomePage({ onNavigate }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="hero">
            <div>
              <div className="hero-tag fade-up">A living story for someone you loved</div>
              <h1 className="hero-headline fade-up-2">
                Every great story<br />starts with <em>"And<br />then they..."</em>
              </h1>
              <p className="hero-body fade-up-3">
                The best stories about someone never get written down — they live in the people who loved them. Send a link, and let those people share. <strong>You decide what stays.</strong> Over time, it becomes something that actually sounds like them.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start gathering their stories</button>
                <button className="btn btn-ghost" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</button>
              </div>
              <div className="hero-trust fade-up-4">
                <span className="hero-trust-dot" />
                No account needed for contributors &nbsp;·&nbsp; Free to start
              </div>
            </div>

            <div className="fade-up-3">
              <div className="story-card">
                <div className="story-card-header">
                  <span className="story-card-label">Stories for Deb Hausch</span>
                  <span className="story-card-count">12 memories</span>
                </div>
                {[
                  { init: "S", text: ["And then she", " showed up at the door with her famous blueberry cake — even when we told her not to bring a thing. She always brought a thing."], meta: "Sandra · Deb's neighbor of 30 years" },
                  { init: "M", text: ["Found this", " from Christmas of 2004. Deb's famous cinnamon rolls with cherries on top, just like our grandmother did."], meta: "Mike · Deb's brother" },
                  { init: "M", text: ["And then she'd", " laugh, even when she didn't get the joke. She never understood sarcasm!"], meta: "Meredith · Deb's daughter" },
                ].map((s, i) => (
                  <div key={i} className="story-item">
                    <div className="avatar">{s.init}</div>
                    <div>
                      <div className="story-text"><span className="story-starter">{s.text[0]}</span>{s.text[1]}</div>
                      <div className="story-meta">{s.meta}</div>
                    </div>
                  </div>
                ))}
                <div className="story-card-footer">
                  <input className="story-footer-input" placeholder="And then she..." readOnly />
                  <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("login")}>Share a memory</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ borderTop: "1px solid var(--warm-faint)", background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="features">
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: "Pull up a chair",
                body: "Send a link — anyone can share a story, a photo, or a video. No account needed. Just the people who loved them most, all in one place.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: "You're the keeper",
                body: "Every story comes to you first. A gentle moderation queue puts you in charge of what goes in the archive — nothing stays without your say.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                title: "A portrait, not an obituary",
                body: "Stories weave together into a warm, living record of who they really were — one that grows richer every time someone new shares a memory.",
              },
            ].map((f, i) => (
              <div key={i}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote strip */}
      <div style={{ background: "var(--bark)" }}>
        <div className="page-wrap">
          <div className="quote-strip">
            <div>
              <div className="quote-strip-headline">"And then they..."</div>
              <p className="quote-strip-sub">That's how every great story starts. Someone leans in, and you remember. This is the place to gather all of them.</p>
            </div>
            <div>
              {[
                { text: "And then he'd whistle that same song every single morning. Always off-key, always happy. I still catch myself listening for it.", attr: "— Frank's youngest daughter" },
                { text: "And then she said \"let's just go\" — and we drove all night to see the sunrise from that bridge. We never talked about it again. We never had to.", attr: "— Rose's college roommate" },
              ].map((q, i) => (
                <div key={i} className="quote-card">
                  <span className="quote-mark">"</span>
                  <p className="quote-text">{q.text}</p>
                  <div className="quote-attr">{q.attr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: "var(--cream)" }} id="how">
        <div className="page-wrap">
          <div className="how">
            <div className="section-label">How it works</div>
            <h2 className="how-headline">Three steps to something that <em>lasts</em></h2>
            <div className="how-steps">
              {[
                { n: "01", title: "Create their story", body: "Add their name, a photo, and a few words about who they were. Takes about two minutes." },
                { n: "02", title: "Invite everyone", body: "Share a link with family and friends. Anyone can contribute a story, photo, or video — no account needed." },
                { n: "03", title: "Watch it come alive", body: "Stories gather into a living portrait. You approve what goes in. It stays there — growing richer — for as long as you need it." },
              ].map((s) => (
                <div key={s.n} className="how-step">
                  <div className="how-step-num">{s.n}</div>
                  <div className="how-step-title">{s.title}</div>
                  <p className="how-step-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: "var(--bark)" }}>
        <div className="page-wrap">
          <div className="final-cta">
            <div className="final-cta-eyebrow">A living story for someone you loved</div>
            <h2>"And then they..."</h2>
            <p>That's how every great story starts. Someone leans in, and you remember. Let's gather them all.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start gathering their stories</button>
            <div className="final-cta-sub">Free to start &nbsp;·&nbsp; No account needed for contributors</div>
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
