// Trust/reassurance page — permanence, ownership, and support. Static
// content, no data fetching. Reuses the homepage's hero eyebrow/headline
// classes (.hero-tag, .hero-headline) for the mixed-emphasis H1 pattern,
// same as OurStory.jsx already does for its own header.
const CARDS = [
  {
    title: "It doesn't disappear.",
    body: "Once a page is created, it stays right where you left it — growing if you keep adding to it, or simply staying still. Nothing is ever deleted, archived, or taken down unless you decide it's time.",
  },
  {
    title: "You own everything on it.",
    body: "Every photo, story, voicemail, and note belongs to you and the people you've shared it with — not to us. As the page's creator or steward, you can export everything on it, in full, at any point. No waiting, no gatekeeping.",
  },
  {
    title: "A real person is always reachable.",
    body: "If you ever have a question — about a memory, a setting, or anything else — email us. A person will write back, not a bot.",
  },
];

export function OurPromisePage({ onNavigate }) {
  return (
    <div className="story-page">
      <div className="page-wrap story-wrap">
        <header className="story-hero">
          <div className="hero-tag fade-up">Our Promise</div>
          <h1 className="hero-headline fade-up-2">
            We keep every memory safe — for as long as <em>you</em> want it here.
          </h1>
          <p className="story-byline fade-up-3">
            A page like this holds something irreplaceable. We don't take that lightly. Here's exactly how we care for it.
          </p>
        </header>

        <div className="promise-cards fade-up-3">
          {CARDS.map((c) => (
            <div className="promise-card" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="promise-closing">
        <p className="promise-closing-line">
          However you choose to use <em>And Then</em>, this much is a promise: what you build here is <em>yours</em>, and it's not going anywhere.
        </p>
        <p className="promise-closing-note">
          Questions, anytime: <a href="mailto:hello@myandthen.com">hello@myandthen.com</a>
        </p>
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
