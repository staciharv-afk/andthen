import { useState, useEffect, useRef } from "react";

// Hero collage — a 2x2 grid of small square tiles matching the memorial
// page's own tile system, using the same four pieces of content already
// established as live on the homepage (real photos/video/audio, just
// re-captioned to fit the tile's small hover caption instead of a full
// pull-quote). Purely illustrative, same as WhatYouGetGrid below — no
// click-through to anything, hover/tap only reveals the caption.
const HERO_COLLAGE_TILES = [
  {
    id: "video",
    kind: "video",
    typeLabel: "Video + story",
    name: "Staci",
    video: "/home/hero-video.mp4",
    poster: "/home/hero-video-poster.jpg",
    caption: "Mom and Dad still held hands on every walk, forty-some years in.",
  },
  {
    id: "voicemail",
    kind: "voicemail",
    typeLabel: "Voicemail",
    name: "Meredith",
    caption: "“Mom always said ‘hey kiddo’ — I’m so glad I kept this voicemail.”",
  },
  {
    id: "recipe",
    kind: "recipe",
    typeLabel: "Recipe + story",
    name: "Cheri",
    caption: "Her first “Best Blueberry Cake” came out gray — she hadn’t thawed the blueberries.",
  },
  {
    id: "photo",
    kind: "photo",
    typeLabel: "Photo + story",
    name: "Staci",
    image: "/home/hero-deb-christmas.jpg",
    caption: "Mom made sure the money she spent on us at Christmas was always exactly equal.",
  },
];

// Decorative-only waveform bars, seeded per tile so they're stable across
// re-renders but still look organic rather than uniform.
function HeroTileWave() {
  const heights = [5, 9, 14, 7, 11, 16, 8, 12, 6, 10, 15, 7];
  return (
    <div className="hero-tile-wave" aria-hidden="true">
      {heights.map((h, i) => <span key={i} style={{ height: `${h}px` }} />)}
    </div>
  );
}

function HeroTileBody({ tile }) {
  if (tile.kind === "video") {
    return (
      <div className="hero-tile-body video">
        <video src={tile.video} poster={tile.poster} muted loop autoPlay playsInline />
        <div className="hero-tile-play" aria-hidden="true" />
      </div>
    );
  }
  if (tile.kind === "voicemail") {
    return (
      <div className="hero-tile-body voicemail">
        <HeroTileWave />
      </div>
    );
  }
  if (tile.kind === "recipe") {
    return <div className="hero-tile-body recipe" />;
  }
  return (
    <div className="hero-tile-body photo">
      <img src={tile.image} alt="" />
    </div>
  );
}

// Hover reveals the caption on pointer devices via CSS; touch devices
// don't get :hover at all, so tapping a tile toggles the same caption via
// the .revealed class instead — tap again, tap a different tile, or tap
// outside the collage to dismiss.
function HeroCollage() {
  const [revealedId, setRevealedId] = useState(null);
  const collageRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (collageRef.current && !collageRef.current.contains(e.target)) setRevealedId(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="hero-collage-grid" ref={collageRef}>
      {HERO_COLLAGE_TILES.map((tile) => (
        <button
          type="button"
          key={tile.id}
          className={`hero-tile${revealedId === tile.id ? " revealed" : ""}`}
          onClick={() => setRevealedId((cur) => (cur === tile.id ? null : tile.id))}
        >
          <HeroTileBody tile={tile} />
          <div className="hero-tile-bar">
            <span className="hero-tile-type">{tile.typeLabel}</span>
            <span className="hero-tile-meta">{tile.name}</span>
          </div>
          <div className="hero-tile-caption"><p>{tile.caption}</p></div>
        </button>
      ))}
    </div>
  );
}

// "What you get" — a static demonstration that different people get asked
// different questions. Four hardcoded examples for now; `image` is null on
// all of them so each card falls back to its placeholder gradient
// (placeholderClass) until real photos/video thumbnails replace it — set
// `image` to a real src and the gradient stops being used, no other change
// needed. Purely illustrative — no state, no interaction beyond layout.
const WHAT_YOU_GET_EXAMPLES = [
  {
    id: "daughter",
    relation: "Her daughter",
    question: "What's something they always said?",
    mediaType: "photo",
    image: "/home/wyg-daughter.jpg",
    placeholderClass: "m1",
    caption: "Mom always told us how beautiful we were, inside and out. That has stuck with me all these years later, now that I'm raising my own daughters.",
    credit: "Staci",
  },
  {
    id: "spouse",
    relation: "Her spouse",
    question: "What's something about them most people never got to see?",
    // Video, using the real photo as its poster frame — same pattern the
    // real memorial page's video tiles already use (a still image behind
    // the play button until it's actually played).
    mediaType: "video",
    image: "/home/wyg-spouse.jpg",
    placeholderClass: "m2",
    caption: "Before she was known as reliable and conservative, she rode on the back of my 1978 Honda 750.",
    credit: "Dan · 0:38",
  },
  {
    id: "roommate",
    relation: "Her college roommate",
    question: "What's the most \"them\" thing they ever did?",
    mediaType: "photo",
    image: "/home/wyg-roommate.jpg",
    placeholderClass: "m3",
    // Shortened from the original memory at Staci's OK — the full version:
    // "Deb went on a date one night and we all got ready together. She had
    // bought a new sweater and tried to wash it in time, but it was still
    // too wet. So all of us roommates sat with our blowdryers and got it
    // dry just in time!"
    caption: "She bought a new sweater for a date and tried to wash it in time — but it was still too wet, so all of us roommates sat there with our blow dryers to get it dry just in time!",
    credit: "Jayne",
  },
  {
    id: "coworker",
    relation: "A coworker",
    question: "What were they like under pressure?",
    mediaType: "video",
    image: "/home/wyg-coworker.jpg",
    placeholderClass: "m4",
    caption: "Deb was the heart and soul of Bluffsview, and she knew every single one of the kids' names. Even years after they had graduated!",
    credit: "Ellen · 0:29",
  },
];

function WhatYouGetGrid() {
  return (
    <>
      <div className="wyg-grid">
        {WHAT_YOU_GET_EXAMPLES.map((ex) => (
          <div className="wyg-card" key={ex.id}>
            <div className="wyg-card-rel">{ex.relation}</div>
            <p className="wyg-card-question">"{ex.question}"</p>
            <div className="wyg-tile">
              <div className="wyg-tile-body">
                {ex.image ? (
                  <img className="wyg-media-bg" src={ex.image} alt="" />
                ) : (
                  <div className={`wyg-media-bg wyg-media-${ex.placeholderClass}`} />
                )}
                {ex.mediaType === "video" && <div className="wyg-tile-play" aria-hidden="true" />}
                <div className="wyg-caption-scrim"><p>{ex.caption}</p></div>
              </div>
              <div className="wyg-tile-bar">
                <span className="type">{ex.mediaType === "video" ? "Video + story" : "Photo + story"}</span>
                <span className="meta">{ex.credit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="wyg-hint">Four people. Four different questions. Every memory lands in the same page.</p>
    </>
  );
}

// "Every way a memory can live" — the seven content types And Then accepts.
// Static/illustrative, same as WHAT_YOU_GET_EXAMPLES above.
const CONTENT_TYPES = [
  { icon: "📷", name: "Photos", desc: "The pictures already sitting in a hundred different phones." },
  { icon: "🎬", name: "Videos", desc: "The way they moved, laughed, and sounded — not just how they looked." },
  { icon: "📞", name: "Voicemails", desc: "An old message still sitting on someone's phone, saved for years." },
  { icon: "🎙️", name: "Spoken stories", desc: "Told out loud, in a contributor's own voice, no typing required." },
  { icon: "✍️", name: "Written stories", desc: "The specific memory, put into words, guided by the right question." },
  { icon: "📄", name: "Recipes & documents", desc: "A handwritten recipe card, a letter, anything worth scanning in." },
  { icon: "🔗", name: "Links", desc: "A YouTube video or home movie already uploaded somewhere else." },
];

function ContentTypesGrid() {
  return (
    <div className="types-grid">
      {CONTENT_TYPES.map((t) => (
        <div className="type-card" key={t.name}>
          <div className="type-icon" aria-hidden="true">{t.icon}</div>
          <h3 className="type-name">{t.name}</h3>
          <p className="type-desc">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}

// Icons for the "Collecting is the easy part" feature row. No icon library
// is installed (checked — the only existing precedent is the inline SVG in
// CreateMemorial.jsx's photo-upload icon), so these follow that same outline
// style: 24x24 viewBox, currentColor stroke, 1.5 stroke width, round joins.
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </svg>
  );
}

function MailboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20V11a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v9" />
      <path d="M3 20h12" />
      <path d="M9 20v-9" />
      <path d="M14 12h3.5a1.5 1.5 0 0 1 0 3H16" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const COLLECTING_FEATURES = [
  { Icon: LinkIcon, label: "Send it anywhere", body: "Text, email, a group chat. One link reaches everyone who loved them, all at once." },
  { Icon: MailboxIcon, label: "The memories arrive", body: "Some you already know by heart. Others you've never heard before." },
  { Icon: ShieldCheckIcon, label: "You stay in control", body: "Approve, hold, or remove anything, anytime. The page stays up for good, and it's yours to export whenever you want." },
];

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
                Everyone who loved them remembers something different. And Then brings it all together — into one page that keeps growing.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page</button>
                <button className="btn btn-ghost btn-lg hero-cta-secondary" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
                  <span className="pulse-dot" aria-hidden="true" />
                  See a real, living page
                </button>
              </div>
            </div>

            <div className="fade-up-3">
              <HeroCollage />

              <button className="hero-media-cta" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
                See a real, living page <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="narrative">
            <div className="section-label">What you get</div>
            <h2 className="narrative-headline">Not just a page — a way to collect.</h2>
            <p className="narrative-body wyg-intro">
              And Then asks each person the right question for who they were to her — so four different people end up telling four completely different stories.
            </p>

            <WhatYouGetGrid />
          </div>
        </div>
      </div>

      {/* Every way a memory can live */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="narrative" style={{ paddingTop: 0 }}>
            <div className="section-label">Every way a memory can live</div>
            <h2 className="narrative-headline">It's not just photos.</h2>
            <p className="narrative-body">
              Bring your loved one to life in whatever form the memory actually takes — And Then holds all of it, side by side, in the same page.
            </p>

            <ContentTypesGrid />

            <button className="section-cta-link" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
              See a real, living page <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collecting is the easy part */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="narrative">
            <div className="section-label">Collecting is the easy part</div>
            <h2 className="narrative-headline">Create their page, and you get one link.</h2>

            <div className="feature-row">
              {COLLECTING_FEATURES.map(({ Icon, label, body }) => (
                <div className="feature-item" key={label}>
                  <div className="feature-icon"><Icon /></div>
                  <h3 className="feature-label">{label}</h3>
                  <p className="feature-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--bark-light)" }}>
        <div className="page-wrap">
          <div className="final-cta">
            <h2>Every great story starts with and then they&hellip;</h2>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">And Then<em>...</em></div>
        <div className="footer-links">
          <button className="footer-link" onClick={() => onNavigate("how-it-works")}>How it works</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}
