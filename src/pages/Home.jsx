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
              <div className="hero-media-grid">
                <div className="hero-media-large">
                  <img src="/home/hero-deb-cinnamon-rolls.jpg" alt="Deb Hausch holding her Christmas cinnamon rolls" />
                  <div className="memory-card-caption">
                    <p className="memory-card-quote">"Mom made her grandma's cinnamon roll recipe every Christmas, and she put cherries on top just like her grandma did."</p>
                    <span className="memory-card-attr">— Staci, her daughter</span>
                  </div>
                </div>
                <div className="hero-media-col">
                  <div className="hero-media-small">
                    <img src="/home/hero-deb-motorcycle.jpg" alt="Deb Hausch riding on the back of a motorcycle" />
                    <div className="memory-card-caption">
                      <p className="memory-card-quote">"Before she was known as reliable and conservative, she rode on the back of my 1978 Honda 750."</p>
                      <span className="memory-card-attr">— Dan, her husband</span>
                    </div>
                  </div>
                  <div className="hero-media-small">
                    <video src="/home/hero-video.mp4" poster="/home/hero-video-poster.jpg" muted loop autoPlay playsInline />
                    <div className="media-play-btn" />
                    <div className="memory-card-caption">
                      <p className="memory-card-quote">"Mom leaned on Dad so much, figuratively and literally — he always had an arm ready for her."</p>
                      <span className="memory-card-attr">— Staci, her daughter</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="hero-media-cta" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
                See a real, living page <span aria-hidden="true">→</span>
              </button>
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

            <div className="browser-mock fade-up-3">
              <div className="browser-mock-bar">
                <span className="browser-mock-dot" />
                <span className="browser-mock-dot" />
                <span className="browser-mock-dot" />
                <span className="browser-mock-url">myandthen.com/their-page</span>
              </div>
              <div className="browser-mock-body">
                <div className="mock-row">
                  <div className="avatar">JM</div>
                  <p className="mock-row-text">"What's something they always said?" — a quick story, typed in.</p>
                </div>
                <div className="mock-row">
                  <div className="avatar">KL</div>
                  <div className="mock-thumb">
                    <img src="/home/mock-kitchen.jpg" alt="A shared photo" />
                  </div>
                  <p className="mock-label">a photo, dropped right in</p>
                </div>
                <div className="mock-row">
                  <div className="avatar">DP</div>
                  <div className="mock-thumb">
                    <video src="/home/mock-video.mp4" poster="/home/mock-video-poster.jpg" muted loop autoPlay playsInline />
                    <div className="play-badge" />
                  </div>
                  <p className="mock-label">a video, right alongside it</p>
                </div>
              </div>
            </div>
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
              Text it. Email it. Send it however you want. Whoever gets it taps it and adds their memory — no account, no app, nothing to set up. One tap, and it's on the page. You're still the one in control — anything added can be reviewed or removed by you, anytime.
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
