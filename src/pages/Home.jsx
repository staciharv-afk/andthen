import { useState, useEffect, useRef } from "react";

// "What you get" interactive preview: four real prompts from Deb Hausch's
// actual memorial, each answered in a different format. Illustrative
// homepage content — not wired to live Supabase data.
const CAROUSEL_EXAMPLES = [
  {
    type: "voice",
    pill: "What's something they always said?",
    contributor: "Meredith",
    relation: "Deb's daughter",
    initials: "M",
    audioSrc: "/home/mom-voicemail.m4a",
    caption: "Mom always said “hey kiddo,” and I have a voicemail she left me with it. I'm so glad I kept this!",
  },
  {
    type: "photo",
    pill: "Where do you picture them most?",
    contributor: "Staci",
    relation: "her daughter",
    initials: "S",
    caption: "I picture her in the kitchen, mixing something while wearing a matching velour outfit. She was the happiest in any kitchen, most especially hers.",
    photoSrc: "/home/mock-kitchen-deb.jpg",
    alt: "Deb Hausch at the counter with her mother",
  },
  {
    type: "photo",
    pill: "What's a photo of them you keep coming back to?",
    contributor: "Staci",
    relation: "her daughter",
    initials: "S",
    caption: "I keep coming back to this picture of our last family vacation together. Mom was in the center of this picture, and she was the center of our lives. Our rock. She loved this vacation with all of her grandbabies at the time!",
    photoSrc: "/home/mock-vacation-deb.jpg",
    alt: "Deb Hausch surrounded by family on their last vacation together",
  },
  {
    type: "photo",
    pill: "Do you have a recipe of theirs — even handwritten?",
    contributor: "Cheri",
    relation: "her sister",
    initials: "C",
    caption: "I remember when Deb entered her first baking competition in elementary school with her “My Best Blueberry Cake” — she didn't know you were supposed to thaw the frozen blueberries first, so it came out gray. She didn't win. Her explanation to me was, “it's because nobody wants to eat gray cake.” She eventually figured out the recipe, and it became a favorite of ours for decades.",
    photoSrc: "/home/mock-recipe-deb.jpg",
    alt: "Deb Hausch's handwritten blueberry cake recipe card",
  },
];

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function PhotoCard({ example }) {
  return (
    <div className="mock-row">
      <div className="avatar">{example.initials}</div>
      <div className="mock-row-body">
        <div className="mock-thumb mock-thumb-lg">
          <img src={example.photoSrc} alt={example.alt || ""} />
        </div>
        <p className="mock-label">"{example.caption}"</p>
        <span className="mock-attr">— {example.contributor}{example.relation ? `, ${example.relation}` : ""}</span>
      </div>
    </div>
  );
}

function VoiceCard({ example, onPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
      onPlay();
    }
    setPlaying((p) => !p);
  };

  const progress = duration ? elapsed / duration : 0;

  return (
    <div className="mock-row mock-row-voice">
      <div className="avatar avatar-on-dark">{example.initials}</div>
      <div className="mock-row-body">
        <audio
          ref={audioRef}
          src={example.audioSrc}
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
          onEnded={() => { setPlaying(false); setElapsed(0); }}
        />
        <div className="voice-controls">
          <button className="voice-play-btn" onClick={toggle} aria-label={playing ? "Pause voice memo" : "Play voice memo"}>
            {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
          </button>
          <div className="voice-waveform">
            {Array.from({ length: 36 }).map((_, i) => (
              <span
                key={i}
                className={i / 36 <= progress ? "played" : ""}
                style={{ height: `${8 + Math.round(Math.abs(Math.sin(i * 0.7)) * 16)}px` }}
              />
            ))}
          </div>
          <span className="voice-time">{fmtTime(elapsed)} / {fmtTime(duration)}</span>
        </div>
        <p className="mock-label mock-label-on-dark">"{example.caption}"</p>
        <span className="mock-attr mock-attr-on-dark">— {example.contributor}{example.relation ? `, ${example.relation}` : ""}, voice memo</span>
      </div>
    </div>
  );
}

// Real playback for the hero collage's voicemail tile — same audio file and
// attribution as the "What you get" voice example above (CAROUSEL_EXAMPLES),
// just its own play state since it's a separate on-screen instance.
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
        <span className="hero-voicemail-caption">Left by Meredith, Deb's daughter · {fmtTime(elapsed)} / {duration ? fmtTime(duration) : "0:17"}</span>
      </div>
    </div>
  );
}

function WhatYouGetPreview() {
  const [active, setActive] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);

  useEffect(() => {
    if (!autoCycle) return;
    const t = setInterval(() => setActive((i) => (i + 1) % CAROUSEL_EXAMPLES.length), 2000);
    return () => clearInterval(t);
  }, [autoCycle]);

  const selectPill = (i) => {
    setActive(i);
    setAutoCycle(false);
  };

  const stopCycle = () => setAutoCycle(false);
  const example = CAROUSEL_EXAMPLES[active];

  return (
    <div className="preview-block fade-up-3">
      <div className="preview-pills">
        {CAROUSEL_EXAMPLES.map((ex, i) => (
          <button key={i} className={`preview-pill${i === active ? " active" : ""}`} onClick={() => selectPill(i)}>
            {ex.pill}
          </button>
        ))}
      </div>

      <div className="browser-mock">
        <div className="browser-mock-bar">
          <span className="browser-mock-dot" />
          <span className="browser-mock-dot" />
          <span className="browser-mock-dot" />
          <span className="browser-mock-url">myandthen.com/their-page</span>
        </div>
        <div className="browser-mock-body">
          {example.type === "voice" && <VoiceCard example={example} onPlay={stopCycle} />}
          {example.type === "photo" && <PhotoCard example={example} />}
        </div>
      </div>

      <div className="preview-crowd">
        <div className="preview-crowd-avatars">
          <span className="avatar preview-crowd-avatar">JM</span>
          <span className="avatar preview-crowd-avatar">KL</span>
          <span className="avatar preview-crowd-avatar">DP</span>
        </div>
        <span className="preview-crowd-text">14 people have added to this page so far</span>
      </div>
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
                Stories about someone live in a hundred different people. And Then gathers what everyone remembers — family, friends, the people who've known them for years — into one page that keeps filling in.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("onboarding")}>Start their page</button>
                <button className="btn btn-ghost" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</button>
              </div>
            </div>

            <div className="fade-up-3">
              <div className="hero-media-grid">
                <div className="hero-media-large">
                  <div className="memory-card">
                    <div className="memory-card-photo">
                      <img src="/home/hero-deb-cinnamon-rolls.jpg" alt="Deb Hausch holding her Christmas cinnamon rolls" />
                    </div>
                    <div className="memory-card-body">
                      <blockquote className="memory-card-quote">Mom made her grandma's cinnamon roll recipe every Christmas, and she put cherries on top just like her grandma did.</blockquote>
                      <span className="memory-card-attr">— Staci, her daughter</span>
                    </div>
                  </div>
                </div>
                <div className="hero-media-col">
                  <div className="hero-media-small">
                    <div className="memory-card">
                      <div className="memory-card-photo">
                        <img src="/home/hero-deb-motorcycle.jpg" alt="Deb Hausch riding on the back of a motorcycle" />
                      </div>
                      <div className="memory-card-body">
                        <blockquote className="memory-card-quote">Before she was known as reliable and conservative, she rode on the back of my 1978 Honda 750.</blockquote>
                        <span className="memory-card-attr">— Dan, her husband</span>
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
                        <span className="memory-card-attr">— Staci, her daughter</span>
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
              The photos and voicemails already exist. They're just scattered across a hundred phones. And Then does the collecting: it asks each person the right question, at the right time, and gathers what comes back into one place that keeps growing.
            </p>

            <WhatYouGetPreview />
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
