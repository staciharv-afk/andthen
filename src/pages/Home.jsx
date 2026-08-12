import { useState, useEffect, useRef } from "react";
import { fmtTime } from "../lib/utils";

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
const CONTENT_TYPES = ["Photos", "Videos", "Voicemails", "Spoken stories", "Written stories", "Recipes & documents", "Links"];

// Four larger, icon-free feature blocks explaining how the page actually
// works, below the plain list of content types it accepts.
const CONTENT_FEATURES = [
  { label: "Share it your way", body: "Freeform, if they already know what to say. Tailored questions, matched to how they knew your person, if they don't." },
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
              <em>And Then</em> asks each person the right question for who they were to her — so four different people end up telling four completely different stories.
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
              Bring your loved one to life in whatever form the memory actually takes — <em>And Then</em> holds all of it, side by side, in the same page.
            </p>

            <ContentTypesShowcase />

            <button className="section-cta-link" onClick={() => onNavigate("memorial", "x58e5wvtmravmszf")}>
              See a real, living page <span aria-hidden="true">→</span>
            </button>
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
        <div className="footer-logo"><em>And Then...</em></div>
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
