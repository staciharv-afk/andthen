// Founder's-note page. Static content — no data fetching, no forms. Copy
// is Staci's own story, verbatim from the source mockup; don't edit it.
export function OurStoryPage({ onNavigate }) {
  return (
    <div className="mkt-page">
      <div className="page-wrap mkt-page-hero">
        <header>
          <div className="mkt-eyebrow fade-up"><span className="mkt-eyebrow-line" aria-hidden="true" />Our Story</div>
          <h1 className="mkt-h1 fade-up-2">Why I built <em>And Then</em></h1>
          <p className="mkt-byline fade-up-3">A note from our founder, Staci Harvey</p>
        </header>

        {/* Real <img> so a photo dropped in later at this exact path shows
            up with no code change — but the placeholder stays visible (via
            onError hiding the broken image) until that file actually exists. */}
        <div className="mkt-story-photo fade-up-3">
          <img
            src="/assets/founder-photo.jpg"
            alt="Staci and her mom"
            onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "block"; }}
          />
          <span className="mkt-story-photo-label" style={{ display: "none" }}>[ PHOTO PLACEHOLDER &mdash; Staci and her mom ]</span>
        </div>

        <article className="mkt-story-article">
          <p className="mkt-story-lede">My mom asked me to give her eulogy, years before she died.</p>

          <p>I said yes without really picturing the day it would matter. When it came, I knew what I didn't want: a eulogy that was just a daughter's point of view. I wanted her whole life in there — who she was to everyone, not just to me.</p>

          <p>So I found people. I interviewed everyone I could track down who had known her, at every stage of her life — old friends, coworkers, neighbors, family. Photos. Voicemails still sitting on people's phones. Videos nobody had thought to share. Piece by piece, I built a version of my mom made from dozens of people's memories, not just mine.</p>

          <p className="mkt-story-pull">Asking someone to just "share a memory" is hard. Ask something specific, and a real story comes out.</p>

          <p>That was the biggest thing I learned. And the second thing was harder to sit with: there were stories about my mom I'd never heard, photos and videos I'd never seen. People had been holding pieces of her my whole life. I only found them because I went looking.</p>

          <hr className="mkt-divider" />

          <p>The name comes from a feeling I kept coming back to: everyone who loved her around one table, wine, low light, nobody wanting to leave — every story starting with <em>and then this happened. And then she did this.</em> Not a memorial. A living story that keeps building, and never has to end.</p>

          <p>I have kids now who will never meet their grandma. That's what made this urgent — I wanted them to actually know who Deb was. Not an obituary. Not a box of photos gathering dust.</p>

          <hr className="mkt-divider" />

          <p>That process was one of the most healing things I've ever done. It's why I built <em>And Then</em> this way — a way to gather everyone's memories, guided by the right questions, without months of manual work and a hundred phone calls.</p>

          <p>If you've ever wished you could sit everyone who loved someone down at the same table and just listen — this is that table. I hope you love building yours.</p>

          <p className="mkt-story-signature">— Staci</p>
        </article>
      </div>

      <div className="mkt-story-closing">
        <div className="page-wrap">
          <p className="mkt-story-closing-line">Build your table.</p>
          <button className="mkt-btn mkt-btn-solid" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
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
