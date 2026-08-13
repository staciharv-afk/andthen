import { useState, useEffect, useRef } from "react";
import { fmtTime } from "../lib/utils";
import { PRICING_PLANS } from "../lib/pricingPlans";

const PAYG = PRICING_PLANS.find((p) => p.tier === "payg");
const FOREVER = PRICING_PLANS.find((p) => p.tier === "forever");

// Condensed 3-step version of the real How It Works page's 4-step
// walkthrough — own copy, not sourced from HowItWorksPage's STEPS, since
// both the count and the wording differ here.
const HOME_STEPS = [
  { lead: "Start their page, free", rest: "the whole product, up to five memories. Upgrade when you're ready to share it and start collecting." },
  { lead: "Invite the people who knew them", rest: "one link, no account needed for them." },
  { lead: "Watch it fill in", rest: "photos, voicemails, stories arrive from everyone invited." },
];

// Watches a sentinel placed at the end of the hero section and shows a
// fixed bottom CTA once it's scrolled out of view — mobile only (CSS hides
// this above the site's existing 768px breakpoint). Same destination/label
// as the hero's own primary CTA.
function StickyBottomCta({ heroEndRef, onNavigate }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = heroEndRef.current;
    if (!el) return;
    // isIntersecting alone can't tell "not yet scrolled to" (sentinel still
    // below the viewport, top > 0) from "scrolled past" (sentinel above the
    // viewport, top < 0) — both report isIntersecting: false. Only the
    // second case should reveal the CTA, or it shows immediately on load.
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [heroEndRef]);

  return (
    <div className={`sticky-cta${show ? " show" : ""}`}>
      <button type="button" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
    </div>
  );
}

// Hero collage — a 2x2 grid of small square tiles matching the memorial
// page's own tile system, using the same four pieces of content already
// established as live on the homepage (real photos/video/audio, just
// re-captioned to fit the tile's small hover caption instead of a full
// pull-quote). Purely illustrative — no click-through to anything,
// hover/tap only reveals the caption.
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
    audio: "/home/mom-voicemail.m4a",
    caption: "“Mom always said ‘hey kiddo’ — I’m so glad I kept this voicemail.”",
  },
  {
    id: "recipe",
    kind: "recipe",
    typeLabel: "Recipe + story",
    name: "Cheri",
    image: "/home/hero-deb-recipe.jpg",
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

// Waveform bars — heights are fixed/decorative (not derived from the real
// audio), but which ones read as "played" reflects real playback progress.
function HeroTileWave({ progress = 0 }) {
  const heights = [5, 9, 14, 7, 11, 16, 8, 12, 6, 10, 15, 7];
  return (
    <div className="hero-tile-wave" aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className={i / heights.length <= progress ? "played" : ""} style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}

// The real voicemail — plays for as long as its tile stays "revealed"
// (tapped/hovered open), pausing and resetting the moment it isn't,
// whether that's tapping the tile again, tapping a different one, or
// tapping outside the collage. Self-contained so the audio element and
// its playback state don't need to live in the parent grid.
function HeroVoicemailTile({ tile, revealed }) {
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (revealed) {
      a.play().catch(() => {});
    } else {
      a.pause();
      a.currentTime = 0;
      setProgress(0);
    }
  }, [revealed]);

  return (
    <div className="hero-tile-body voicemail">
      <audio
        ref={audioRef}
        src={tile.audio}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setProgress(e.target.duration ? e.target.currentTime / e.target.duration : 0)}
        onEnded={() => setProgress(0)}
      />
      <div className="hero-tile-voice-inner">
        <div className="hero-tile-play hero-tile-play-voice" aria-hidden="true" />
        <HeroTileWave progress={progress} />
        {duration != null && <span className="hero-tile-duration">{fmtTime(duration)}</span>}
      </div>
    </div>
  );
}

function HeroTileBody({ tile, revealed }) {
  if (tile.kind === "video") {
    return (
      <div className="hero-tile-body video">
        <video src={tile.video} poster={tile.poster} muted loop autoPlay playsInline />
        <div className="hero-tile-play" aria-hidden="true" />
      </div>
    );
  }
  if (tile.kind === "voicemail") {
    return <HeroVoicemailTile tile={tile} revealed={revealed} />;
  }
  return (
    <div className={`hero-tile-body ${tile.kind}`}>
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
          <HeroTileBody tile={tile} revealed={revealedId === tile.id} />
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

// "Every way a memory can live" — the seven content types And Then accepts.
const CONTENT_TYPES = ["Photos", "Videos", "Voicemails", "Spoken stories", "Written stories", "Recipes & documents", "Links"];

// Four larger, icon-free feature blocks explaining how the page actually
// works, below the plain list of content types it accepts.
const CONTENT_FEATURES = [
  { label: "Never a blank page", body: "The questions help gather memories from everyone who knew them. You don't need the exact right words — just an answer." },
  { label: "Keeps growing, on your terms", body: "The page keeps collecting new memories, whenever they come in. You decide who can add — people you invite, or anyone with the link." },
  { label: "Nothing's locked away", body: "Export everything you've collected, in full, any time you want it." },
  { label: "No account, no friction", body: "Anyone invited can add a memory without creating a login or downloading anything. Text it, email it, drop it in a group chat — they're in." },
];

function ContentTypesShowcase() {
  return (
    <>
      <div className="type-pills">
        {CONTENT_TYPES.map((name) => (
          <span className="type-pill" key={name}>{name}</span>
        ))}
      </div>
      <p className="type-pills-hint">If it brings them to life, it belongs here.</p>

      <div className="wyg2-grid">
        {CONTENT_FEATURES.map(({ label, body }) => (
          <div className="wyg2-item" key={label}>
            <h3 className="wyg2-label">{label}</h3>
            <p className="wyg2-body">{body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function HomePage({ onNavigate }) {
  const heroEndRef = useRef(null);

  return (
    <div>
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="hero">
            <div>
              <div className="hero-tag fade-up"><em>And Then...</em></div>
              <h1 className="hero-headline fade-up-2">
                A living story <em>for<br />someone you love</em>.
              </h1>
              <p className="hero-body fade-up-3">
                Everyone who loved them remembers something different. <em>And Then</em> brings it all together — into one page that keeps growing.
              </p>
              <p className="hero-scope-note fade-up-3">
                For someone you've lost — or someone you want to celebrate while they're still here to see it.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page</button>
                <button className="btn btn-ghost btn-lg hero-cta-secondary" onClick={() => onNavigate("how-it-works")}>
                  <span className="pulse-dot" aria-hidden="true" />
                  See how it works
                </button>
              </div>
            </div>

            <div className="fade-up-3">
              <HeroCollage />

              <button className="hero-media-cta" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
                See a real, living page <span aria-hidden="true">→</span>
              </button>

              <div className="hero-wyg-card">
                <div className="section-label">What you get</div>
                <h2 className="hero-wyg-headline">Not just a page — a way to collect.</h2>
                <p className="hero-wyg-body">
                  <em>And Then</em> asks each person the right question for who they were to them — so four different people end up telling four completely different stories.
                </p>
              </div>
            </div>
          </div>
          {/* 1px, not 0 — a zero-area target has inconsistently-defined
              intersection ratio across browsers, which was causing the
              observer below to miss real threshold crossings on scroll. */}
          <div ref={heroEndRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="narrative">
            <div className="section-label">How it works</div>
            <h2 className="narrative-headline">Here's what happens when you start.</h2>

            <div className="home-steps">
              {HOME_STEPS.map((step, i) => (
                <div className="hiw-step" key={step.lead}>
                  <div className="hiw-step-num">{i + 1}</div>
                  <p className="home-step-text"><strong>{step.lead}</strong> — {step.rest}</p>
                </div>
              ))}
            </div>

            <button className="section-cta-link" onClick={() => onNavigate("how-it-works")}>
              See the full walkthrough <span aria-hidden="true">→</span>
            </button>
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
              Bring your loved one to life in whatever form the memory actually takes — <em>And Then</em> holds all of it, side by side, in the same page.
            </p>

            <ContentTypesShowcase />

            <button className="section-cta-link" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
              See a real, living page <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="narrative" style={{ paddingTop: 0 }}>
            <div className="section-label">Pricing</div>
            <h2 className="narrative-headline">Two ways to pay, whenever you're ready.</h2>
            <p className="narrative-body">
              Nothing is charged until you move past the free five. Each page is priced on its own, so you're free to create one for every person you want to honor.
            </p>

            <div className="pricing-teaser-cards">
              <div className="pricing-teaser-card pricing-teaser-card-light">
                <div className="pricing-teaser-label">{PAYG.label}</div>
                <p className="pricing-teaser-price">{PAYG.price}</p>
                <p className="pricing-teaser-sub">{PAYG.sub}</p>
              </div>
              <div className="pricing-teaser-card pricing-teaser-card-dark">
                <div className="pricing-teaser-label">{FOREVER.label}</div>
                <p className="pricing-teaser-price">{FOREVER.price}</p>
                <p className="pricing-teaser-sub">{FOREVER.sub}</p>
              </div>
            </div>

            <button className="section-cta-link" onClick={() => onNavigate("pricing")}>
              See full pricing details <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Why And Then */}
      <div style={{ background: "var(--white)" }}>
        <div className="page-wrap">
          <div className="narrative" style={{ paddingTop: 0 }}>
            <div className="section-label">Why And Then</div>
            <h2 className="narrative-headline">No one person remembers all of them.</h2>
            <p className="narrative-body">
              She wasn't just your mother — she was a coworker's mentor, a neighbor's confidant, a best friend's whole world. Each of those people holds a piece nobody else has. <em>And Then</em> exists to gather all of it, so she gets remembered as the whole person she was — not one version of her.
            </p>

            <button className="section-cta-link" onClick={() => onNavigate("story")}>
              The story behind <em>And Then</em> <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background: "var(--bark-light)" }}>
        <div className="page-wrap">
          <div className="final-cta">
            <h2>Start their page today.</h2>
            <p>The whole product, free for five memories. Upgrade when you're ready to share it and start collecting.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page, free</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo"><em>And Then...</em></div>
        <div className="footer-links">
          <button className="footer-link" onClick={() => onNavigate("how-it-works")}>How it works</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>

      <StickyBottomCta heroEndRef={heroEndRef} onNavigate={onNavigate} />
    </div>
  );
}
