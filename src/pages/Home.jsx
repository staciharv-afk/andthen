import { useState, useEffect, useRef } from "react";

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Real playback for the hero collage's voicemail tile — its own play state
// since it's a standalone instance, not shared with anything else on the page.
function HeroVoicemail() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? elapsed / duration : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
    setPlaying((p) => !p);
  };

  return (
    <div className="hero-voicemail-card">
      <audio
        ref={audioRef}
        src="/home/mom-voicemail.m4a"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <button type="button" className="voice-play-btn hero-voicemail-play" onClick={toggle} aria-label={playing ? "Pause voicemail" : "Play voicemail"}>
        {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
      </button>
      <div className="hero-voicemail-body">
        <span className="hero-voicemail-label">Voicemail</span>
        <div className="voice-waveform hero-voicemail-wave">
          {[8, 15, 20, 11, 18, 22, 9, 16, 13, 19, 10, 15].map((h, i) => (
            <span key={i} className={i / 12 <= progress ? "played" : ""} style={{ height: `${h}px` }} />
          ))}
        </div>
        <span className="hero-voicemail-caption">Left by Meredith · {fmtTime(elapsed)} / {duration ? fmtTime(duration) : "0:17"}</span>
      </div>
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
                Stories about someone live in a hundred different people. And Then gathers what everyone remembers — family, friends, the people who've known them for years — into one page that keeps filling in.
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
              <div className="hero-media-grid">
                <div className="hero-media-large">
                  <div className="memory-card">
                    <div className="memory-card-photo">
                      <img src="/home/hero-deb-recipe.jpg" alt="Deb Hausch's handwritten blueberry cake recipe card" />
                    </div>
                    <div className="memory-card-body">
                      <blockquote className="memory-card-quote">I remember when Deb entered her first baking competition in elementary school with her "My Best Blueberry Cake" — she didn't know you were supposed to thaw the frozen blueberries first, so it came out gray. She didn't win. Her explanation to me was, "it's because nobody wants to eat gray cake." She eventually figured out the recipe, and it became a favorite of ours for decades.</blockquote>
                      <span className="memory-card-attr">— Cheri</span>
                    </div>
                  </div>
                </div>
                <div className="hero-media-col">
                  <div className="hero-media-small">
                    <div className="memory-card">
                      <div className="memory-card-photo">
                        <img src="/home/hero-deb-christmas.jpg" alt="Deb Hausch with her daughters" />
                      </div>
                      <div className="memory-card-body">
                        <blockquote className="memory-card-quote">Mom always made sure Meredith and I felt equally loved, down to the amount of money she spent on us at Christmas. Many years, I'd receive a check with the difference that she had spent on Meredith!</blockquote>
                        <span className="memory-card-attr">— Staci</span>
                      </div>
                    </div>
                  </div>
                  <div className="hero-media-small">
                    <HeroVoicemail />
                  </div>
                  <div className="hero-media-small">
                    <div className="memory-card">
                      <div className="memory-card-photo">
                        <video src="/home/hero-video.mp4" poster="/home/hero-video-poster.jpg" muted loop autoPlay playsInline />
                        <div className="media-play-btn" />
                      </div>
                      <div className="memory-card-body">
                        <blockquote className="memory-card-quote">Mom leaned on Dad so much, figuratively and literally — he always had an arm ready for her.</blockquote>
                        <span className="memory-card-attr">— Staci</span>
                      </div>
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
            <h2 className="narrative-headline">Not just a page — a way to collect.</h2>
            <p className="narrative-body">
              And Then asks each person the right question for who they were to her — so four different people end up telling four completely different stories.
            </p>

            <WhatYouGetGrid />
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
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page</button>
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
