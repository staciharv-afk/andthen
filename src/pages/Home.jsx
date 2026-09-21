import { useState, useEffect, useRef } from "react";
import { fmtTime } from "../lib/utils";
import { PRICING_PLANS } from "../lib/pricingPlans";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

// Condensed 3-step version of the real How It Works page's 4-step
// walkthrough — own copy, not sourced from HowItWorksPage's STEPS, since
// both the count and the wording differ here.
const HOME_STEPS = [
  { lead: "Start their page, free", rest: "the whole product, up to five memories. Upgrade when you're ready to share it and start collecting." },
  { lead: "Invite the people who knew them", rest: "one link, no account needed for them." },
  { lead: "Watch it fill in", rest: "photos, voicemails, stories arrive from everyone invited." },
];

// The emphasized lost/celebrate line — reused verbatim in the hero (as a
// visually distinct callout) and again below the closing CTA's button, per
// the brand spec. One string, two render spots, so the wording can't drift.
const SCOPE_LINE = "For someone you've lost — or someone you want to celebrate while they're still here to see it.";

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
    <div className={`sticky-cta mkt-sticky-cta${show ? " show" : ""}`}>
      <button type="button" onClick={() => onNavigate("onboarding")}>Try it free</button>
    </div>
  );
}

// Hero collage — a 2x2 grid of small square tiles, each carrying the real
// content already established as live on the homepage (real photos/video/
// audio), gently rotated per the brand spec, with a dark gradient caption
// bar (type + name) always visible and the fuller quote revealed on
// hover/tap. Purely illustrative — no click-through to anything.
const HERO_COLLAGE_TILES = [
  {
    id: "video",
    kind: "video",
    typeLabel: "Video + story",
    name: "Staci",
    avatarColor: "#B85C2C",
    video: "/home/hero-video.mp4",
    poster: "/home/hero-video-poster.jpg",
    caption: "Mom and Dad still held hands on every walk, forty-some years in.",
  },
  {
    id: "voicemail",
    kind: "voicemail",
    typeLabel: "Voicemail",
    name: "Meredith",
    avatarColor: "#8A5A34",
    audio: "/home/mom-voicemail.m4a",
    caption: "“Mom always said ‘hey kiddo’ — I’m so glad I kept this voicemail.”",
  },
  {
    id: "recipe",
    kind: "recipe",
    typeLabel: "Recipe + story",
    name: "Cheri",
    avatarColor: "#C97040",
    image: "/home/hero-deb-recipe.jpg",
    caption: "Her first “Best Blueberry Cake” came out gray — she hadn’t thawed the blueberries.",
  },
  {
    id: "photo",
    kind: "photo",
    typeLabel: "Photo + story",
    name: "Staci",
    avatarColor: "#9C6B3F",
    image: "/home/hero-deb-christmas.jpg",
    caption: "Mom made sure the money she spent on us at Christmas was always exactly equal.",
  },
];

// Waveform bars — heights are fixed/decorative (not derived from the real
// audio), but which ones read as "played" reflects real playback progress.
function HeroTileWave({ progress = 0 }) {
  const heights = [5, 9, 14, 7, 11, 16, 8, 12, 6, 10, 15, 7];
  return (
    <div className="mkt-tile-wave" aria-hidden="true">
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
    <div className="mkt-tile-body voicemail">
      <div className="mkt-tile-scrim" aria-hidden="true" />
      <audio
        ref={audioRef}
        src={tile.audio}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setProgress(e.target.duration ? e.target.currentTime / e.target.duration : 0)}
        onEnded={() => setProgress(0)}
      />
      <div className="mkt-tile-voice-inner">
        <div className="mkt-tile-play mkt-tile-play-voice" aria-hidden="true" />
        <HeroTileWave progress={progress} />
        {duration != null && <span className="mkt-tile-duration">{fmtTime(duration)}</span>}
      </div>
    </div>
  );
}

function HeroTileBody({ tile, revealed }) {
  if (tile.kind === "video") {
    return (
      <div className="mkt-tile-body video">
        <video src={tile.video} poster={tile.poster} muted loop autoPlay playsInline />
        <div className="mkt-tile-scrim" aria-hidden="true" />
      </div>
    );
  }
  if (tile.kind === "voicemail") {
    return <HeroVoicemailTile tile={tile} revealed={revealed} />;
  }
  return (
    <div className={`mkt-tile-body ${tile.kind}`}>
      <img src={tile.image} alt="" />
      <div className="mkt-tile-scrim" aria-hidden="true" />
    </div>
  );
}

// Hover reveals the fuller quote on pointer devices via CSS; touch devices
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
    <div className="mkt-collage-grid" ref={collageRef}>
      {HERO_COLLAGE_TILES.map((tile) => (
        <button
          type="button"
          key={tile.id}
          className={`mkt-tile${revealedId === tile.id ? " revealed" : ""}`}
          onClick={() => setRevealedId((cur) => (cur === tile.id ? null : tile.id))}
        >
          <HeroTileBody tile={tile} revealed={revealedId === tile.id} />
          <div className="mkt-tile-bar">
            <span className="mkt-tile-type">{tile.typeLabel}</span>
            <span className="mkt-tile-cred">
              <span className="mkt-tile-avatar" style={{ background: tile.avatarColor }} aria-hidden="true">
                {tile.name.charAt(0)}
              </span>
              {tile.name}
            </span>
          </div>
          <div className="mkt-tile-caption"><p>{tile.caption}</p></div>
        </button>
      ))}
    </div>
  );
}

// Simple hand-drawn line icons for the content-type pills — kept as plain
// inline SVGs (not a stock icon library) per the brand spec.
const PILL_ICONS = {
  camera: <svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13.5" r="3.4" /></svg>,
  video: <svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" /></svg>,
  voicemail: <svg viewBox="0 0 24 24"><path d="M3 12h2l2-6 3 12 3-9 2 5h6" strokeLinejoin="round" strokeLinecap="round" /></svg>,
  mic: <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" strokeLinecap="round" /></svg>,
  pen: <svg viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" strokeLinejoin="round" /><path d="M13.5 6.5L17.5 10.5" /></svg>,
  document: <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" /><path d="M15 3v4h4M9 12h6M9 16h6" strokeLinecap="round" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l2.6-2.6a4 4 0 00-5.7-5.7L11 7" strokeLinecap="round" /><path d="M14 10a4 4 0 00-5.7 0L5.7 12.6a4 4 0 005.7 5.7L13 17" strokeLinecap="round" /></svg>,
};

// "Every way a memory can live" — the seven content types And Then accepts.
const CONTENT_TYPES = [
  { label: "Photos", icon: "camera" },
  { label: "Videos", icon: "video" },
  { label: "Voicemails", icon: "voicemail" },
  { label: "Spoken stories", icon: "mic" },
  { label: "Written stories", icon: "pen" },
  { label: "Recipes & documents", icon: "document" },
  { label: "Links", icon: "link" },
];

function ContentTypePills() {
  return (
    <div className="mkt-pills">
      {CONTENT_TYPES.map(({ label, icon }) => (
        <span className="mkt-pill" key={label}>
          <span className="mkt-pill-icon" aria-hidden="true">{PILL_ICONS[icon]}</span>
          {label}
        </span>
      ))}
    </div>
  );
}

// Four larger, icon-free feature blocks explaining how the page actually
// works, below the plain list of content types it accepts.
const CONTENT_FEATURES = [
  { label: "Never a blank page", body: "The questions help gather memories from everyone who knew them. You don't need the exact right words — just an answer." },
  { label: "Keeps growing, on your terms", body: "The page keeps collecting new memories, whenever they come in. You decide who can add — people you invite, or anyone with the link." },
  { label: "Nothing's locked away", body: "Export everything you've collected, in full, any time you want it." },
  { label: "No account, no friction", body: "Anyone invited can add a memory without creating a login or downloading anything. Text it, email it, drop it in a group chat — they're in." },
];

export function HomePage({ onNavigate }) {
  const heroEndRef = useRef(null);

  return (
    <div className="mkt-page">
      {/* Hero */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-hero">
            <div>
              <h1 className="mkt-hero-h1 fade-up-2">Every life deserves<br />to be well told.</h1>
              <p className="mkt-hero-body fade-up-3">
                Everyone who loved them remembers something different. <em>And Then</em> brings it all together — into one page that keeps growing.
              </p>
              <p className="mkt-callout fade-up-3">{SCOPE_LINE}</p>
              <div className="mkt-cta-group fade-up-4">
                <button className="mkt-btn mkt-btn-solid" onClick={() => onNavigate("onboarding")}>Try it free</button>
                <button className="mkt-btn mkt-btn-ghost" onClick={() => onNavigate("how-it-works")}>See how it works</button>
              </div>
            </div>

            <div className="fade-up-3">
              <div className="mkt-shared-by">Shared by</div>
              <HeroCollage />

              <button className="mkt-media-link" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
                See a real, living page <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="mkt-continuum" aria-hidden="true">
            <span className="mkt-continuum-line" />
            <span className="mkt-continuum-dot" />
            <span className="mkt-continuum-dot" />
            <span className="mkt-continuum-dot" />
            <span className="mkt-continuum-line" />
          </div>

          {/* 1px, not 0 — a zero-area target has inconsistently-defined
              intersection ratio across browsers, which was causing the
              observer below to miss real threshold crossings on scroll. */}
          <div ref={heroEndRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* What you get */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-section-inner mkt-narrow">
            <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />What you get</div>
            <h2 className="mkt-h2">Not just a page — a way to collect.</h2>
            <p className="mkt-body">
              <em>And Then</em> asks each person the right question for who they were to them — so four different people end up telling four completely different stories.
            </p>
            <p className="mkt-body">
              Whether you're holding onto someone you've lost, or gathering these while there's still time to add more — the collecting is the whole point.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mkt-section mkt-section-sand">
        <div className="page-wrap">
          <div className="mkt-section-inner">
            <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />How it works</div>
            <h2 className="mkt-h2">Here's what happens when you start.</h2>

            <div className="mkt-steps">
              {HOME_STEPS.map((step, i) => (
                <div className="mkt-step" key={step.lead}>
                  <div className="mkt-step-num">{String(i + 1).padStart(2, "0")}</div>
                  <p className="mkt-step-text"><strong>{step.lead}</strong> — {step.rest}</p>
                </div>
              ))}
            </div>

            <button className="mkt-link" onClick={() => onNavigate("how-it-works")}>
              See the full walkthrough <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Every way a memory can live */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-section-inner">
            <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />Every way a memory can live</div>
            <h2 className="mkt-h2">It's not just photos.</h2>
            <p className="mkt-body mkt-narrow">
              Bring your loved one to life in whatever form the memory actually takes — <em>And Then</em> holds all of it, side by side, in the same page.
            </p>

            <ContentTypePills />

            <hr className="mkt-caveat-rule" />
            <p className="mkt-caveat">If it brings them to life, it belongs here. The collecting is what makes it work.</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mkt-section mkt-section-sand">
        <div className="page-wrap">
          <div className="mkt-section-inner">
            <div className="mkt-feature-grid">
              {CONTENT_FEATURES.map(({ label, body }) => (
                <div className="mkt-feature-card" key={label}>
                  <h3 className="mkt-feature-label">{label}</h3>
                  <p className="mkt-feature-body">{body}</p>
                </div>
              ))}
            </div>

            <button className="mkt-link" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
              See a real, living page <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="mkt-section">
        <div className="page-wrap">
          <div className="mkt-section-inner">
            <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />Pricing</div>
            <h2 className="mkt-h2">Start for free. The rest is simple.</h2>
            <p className="mkt-body mkt-narrow">
              Nothing is charged until you move past the free five. Each page is priced on its own, so you're free to create one for every person you want to honor.
            </p>

            <div className="mkt-pricing-grid">
              <button type="button" className="mkt-price-card" onClick={() => onNavigate("onboarding")}>
                <div className="mkt-price-headline">Start free</div>
                <p className="mkt-price-detail">Five memories, every feature unlocked. No card needed.</p>
                <span className="mkt-price-arrow">Get started <span aria-hidden="true">→</span></span>
              </button>

              <button type="button" className="mkt-price-card mkt-price-card-dark" onClick={() => onNavigate("pricing")}>
                <div className="mkt-price-headline">{BUILD.price}</div>
                <p className="mkt-price-detail">Unlimited memories and people. One payment, no renewals.</p>
                <span className="mkt-price-arrow">Unlock the full page <span aria-hidden="true">→</span></span>
              </button>

              <button type="button" className="mkt-price-card" onClick={() => onNavigate("pricing", "gift")}>
                <div className="mkt-price-headline">Give it as a gift</div>
                <div className="mkt-price-tag">{BUILD.price} · one-time</div>
                <p className="mkt-price-detail">For someone who isn't ready to start it themselves yet.</p>
                <span className="mkt-price-arrow">Start a gift page <span aria-hidden="true">→</span></span>
              </button>
            </div>

            <button className="mkt-link" onClick={() => onNavigate("pricing")}>
              See full pricing details <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Why And Then */}
      <div className="mkt-section mkt-section-sand">
        <div className="page-wrap">
          <div className="mkt-section-inner mkt-narrow">
            <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />Why And Then</div>
            <h2 className="mkt-h2">No one person remembers all of them.</h2>
            <p className="mkt-body">
              She wasn't just your mother — she was a coworker's mentor, a neighbor's confidant, a best friend's whole world. Each of those people holds a piece nobody else has. <em>And Then</em> exists to gather all of it, so she gets remembered as the whole person she was — not one version of her.
            </p>
            <p className="mkt-body">
              It's not one memory that keeps her with us. It's all of them, together — which is why every story matters, and why the page is never really finished.
            </p>

            <button className="mkt-link" onClick={() => onNavigate("story")}>
              The story behind <em>And Then</em> <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div className="mkt-section">
        <div className="page-wrap" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div className="mkt-closing" style={{ backgroundImage: "url(/home/closing-deb-family.jpg)" }}>
            <div className="mkt-closing-scrim" aria-hidden="true" />
            <div className="mkt-closing-content">
              <div className="mkt-eyebrow"><span className="mkt-eyebrow-line" aria-hidden="true" />And Then…</div>
              <h2 className="mkt-closing-h2">Start their page today.</h2>
              <p className="mkt-closing-tagline">Start with what you remember. Everyone else fills in the rest.</p>
              <button className="mkt-btn mkt-btn-solid" onClick={() => onNavigate("onboarding")}>Try it free</button>
              <p className="mkt-closing-scope">{SCOPE_LINE}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mkt-footer page-wrap">
        <span className="mkt-wordmark" style={{ cursor: "default" }}>
          <span className="mkt-wordmark-line" aria-hidden="true" />
          <span className="mkt-wordmark-text">And Then</span>
          <span className="mkt-wordmark-dots" aria-hidden="true">…</span>
        </span>
        <div className="mkt-footer-links">
          <button className="mkt-footer-link" onClick={() => onNavigate("how-it-works")}>How it works</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("our-promise")}>Our Promise</button>
          <button className="mkt-footer-link" onClick={() => onNavigate("privacy")}>Privacy</button>
          <button className="mkt-footer-link">Contact</button>
        </div>
        <div className="mkt-footer-copy">© 2026 And Then</div>
      </footer>

      <StickyBottomCta heroEndRef={heroEndRef} onNavigate={onNavigate} />
    </div>
  );
}
