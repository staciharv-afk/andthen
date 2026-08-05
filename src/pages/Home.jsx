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
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start their page</button>
                <button className="btn btn-ghost" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</button>
              </div>
            </div>

            <div className="fade-up-3">
              <div className="hero-media-grid">
                <div className="hero-media-large">
                  <img src="/home/hero-deb-cinnamon-rolls.jpg" alt="Deb Hausch holding her Christmas cinnamon rolls" />
                  <div className="memory-card-caption">
                    <p className="memory-card-quote">"Mom made her grandma's cinnamon roll recipe every Christmas, and she put cherries on top just like her grandma did."</p>
                    <span className="memory-card-attr">— Staci, her daughter</span>
                  </div>
                </div>
                <div className="hero-media-col">
                  <div className="hero-media-small">
                    <img src="/home/hero-deb-motorcycle.jpg" alt="Deb Hausch riding on the back of a motorcycle" />
                    <div className="memory-card-caption">
                      <p className="memory-card-quote">"Before she was known as reliable and conservative, she rode on the back of my 1978 Honda 750."</p>
                      <span className="memory-card-attr">— Dan, her husband</span>
                    </div>
                  </div>
                  <div className="hero-media-small">
                    <video src="/home/hero-video.mp4" poster="/home/hero-video-poster.jpg" muted loop autoPlay playsInline />
                    <div className="media-play-btn" />
                    <div className="memory-card-caption">
                      <p className="memory-card-quote">"Mom leaned on Dad so much, figuratively and literally — he always had an arm ready for her."</p>
                      <span className="memory-card-attr">— Staci, her daughter</span>
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
            <h2 className="narrative-headline">The photos and voicemails already exist. They're just scattered across a hundred phones.</h2>
            <p className="narrative-body">
              Somebody has a video you've never seen. Somebody else has a voicemail they left. Without a place for it to go, you never will. And Then is that place — one page everyone can add to, for as long as they have something left to give it.
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
            <h2 className="narrative-headline">One link does all the work.</h2>
            <p className="narrative-body">
              Text it. Email it. Send it however you want. Whoever gets it taps it and adds their memory — no account, no app, nothing to set up. One tap, and it's on the page. You're still the one in control — anything added can be reviewed or removed by you, anytime.
            </p>
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
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start their page</button>
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
