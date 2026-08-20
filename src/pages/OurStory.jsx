// Founder's-note page. Static content — no data fetching, no forms. Copy
// is Staci's own story, verbatim from the source mockup; don't edit it.
export function OurStoryPage({ onNavigate }) {
  return (
    <div className="story-page">
      <div className="page-wrap story-wrap">
        <header className="story-hero">
          <div className="hero-tag fade-up">Our Story</div>
          <h1 className="story-headline fade-up-2">Why I built <em>And Then</em></h1>
          <p className="story-byline fade-up-3">A note from our founder, Staci Harvey</p>
        </header>

        {/* Real <img> so a photo dropped in later at this exact path shows
            up with no code change — but the dashed-border placeholder stays
            visible (via onError hiding the broken image) until that file
            actually exists. */}
        <div className="story-photo-placeholder fade-up-3">
          <img
            src="/assets/founder-photo.jpg"
            alt="Staci and her mom"
            className="story-photo-img"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <span className="story-photo-label">[ PHOTO PLACEHOLDER &mdash; Staci and her mom ]</span>
        </div>

        <article className="story-article">
          <p className="story-lede">My mom asked me to give her eulogy, years before she died.</p>

          <p>I said yes without really picturing the day it would matter. When it came, I knew what I didn't want: a eulogy that was just a daughter's point of view. I wanted her whole life in there — who she was to everyone, not just to me.</p>

          <p>So I found people. I interviewed everyone I could track down who had known her, at every stage of her life — old friends, coworkers, neighbors, family. Photos. Voicemails still sitting on people's phones. Videos nobody had thought to share. Piece by piece, I built a version of my mom made from dozens of people's memories, not just mine.</p>

          <p className="story-pull">Asking someone to just "share a memory" is hard. Ask something specific, and a real story comes out.</p>

          <p>That was the biggest thing I learned. And the second thing was harder to sit with: there were stories about my mom I'd never heard, photos and videos I'd never seen. People had been holding pieces of her my whole life. I only found them because I went looking.</p>

          <hr className="story-divider" />

          <p>The name comes from a feeling I kept coming back to: everyone who loved her around one table, wine, low light, nobody wanting to leave — every story starting with <em>and then this happened. And then she did this.</em> Not a memorial. A living story that keeps building, and never has to end.</p>

          <p>I have kids now who will never meet their grandma. That's what made this urgent — I wanted them to actually know who Deb was. Not an obituary. Not a box of photos gathering dust.</p>

          <hr className="story-divider" />

          <p>That process was one of the most healing things I've ever done. It's why I built <em>And Then</em> this way — a way to gather everyone's memories, guided by the right questions, without months of manual work and a hundred phone calls.</p>

          <p>If you've ever wished you could sit everyone who loved someone down at the same table and just listen — this is that table. I hope you love building yours.</p>

          <p className="story-signature">— Staci</p>
        </article>
      </div>

      <div className="story-closing">
        <div className="page-wrap">
          <p className="story-closing-line">Build your table.</p>
          <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
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
