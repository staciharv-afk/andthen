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
    title: "We never sell it.",
    body: "What's shared here is never sold, licensed, or used to train anything, ours or anyone else's. We don't run ads on this page, and we don't pass your data to anyone who does. It belongs to you and the people you've invited, and it exists for exactly one reason: so it can be found by the people who loved them.",
  },
  {
    title: "A real person is always reachable.",
    body: "If you ever have a question — about a memory, a setting, or anything else — email us. A person will write back, not a bot.",
  },
  {
    title: "You decide who's part of it.",
    body: "Every page can be as open or as closed as you need — public, invite-only, or fully private with an access code to view and to contribute. Turn on approval so nothing appears until you've seen it, share moderation with someone you trust when you need the help, and lock the page to new additions whenever you're ready. It's your call, and you can change it anytime.",
  },
];

export function OurPromisePage({ onNavigate }) {
  return (
    <div className="mkt-page">
      <div className="page-wrap mkt-page-hero">
        <header>
          <div className="mkt-eyebrow fade-up"><span className="mkt-eyebrow-line" aria-hidden="true" />Our Promise</div>
          <h1 className="mkt-h1 fade-up-2">
            We keep every memory safe — for as long as <em>you</em> want it here.
          </h1>
          <p className="mkt-page-hero-sub fade-up-3">
            A page like this holds something irreplaceable. We don't take that lightly. Here's exactly how we care for it.
          </p>
        </header>

        <div className="mkt-promise-cards fade-up-3">
          {CARDS.map((c) => (
            <div className="mkt-promise-card" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mkt-promise-closing">
        <p className="mkt-promise-closing-line">
          However you choose to use <em>And Then</em>, this much is a promise: what you build here is <em>yours</em>, and it's not going anywhere.
        </p>
        <p className="mkt-promise-closing-note">
          Questions, anytime: <a href="mailto:hello@myandthen.com">hello@myandthen.com</a>
        </p>
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
          <button className="mkt-footer-link">Privacy</button>
          <button className="mkt-footer-link">Contact</button>
        </div>
        <div className="mkt-footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
