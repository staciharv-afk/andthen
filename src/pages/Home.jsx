import { useState, useEffect, useRef } from "react";

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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

// "What you get" live demo — a scaled-down, actually-working port of the
// real share-a-memory question screen (ShareMemoryModal in Memorial.jsx),
// paired with a "what shows up on their page" result tile. Marketing/demo
// only: nothing here touches Supabase, and the four questions below are a
// small hardcoded set, not the real per-relationship question bank — the
// real modal's rules (per-question attach gating, type/record toggle only
// on general questions) are ported faithfully, not imported, since the real
// modal is tightly coupled to actual submission/upload logic and the
// memorial-page-scoped --mem-* token set this page doesn't have.
//
// Same four prompts, same order, as the chips above this component — the
// chips themselves double as the question picker.
const DEMO_QUESTIONS = [
  {
    id: "said",
    label: "What's something they always said?",
    kind: "general",
    alts: [
      "What's something they always said that you can still hear in their voice?",
      "What did they do that only they would do?",
      "What's something they taught you without meaning to?",
    ],
    result: { kind: "story", text: "“Have a great day. Love you.” She left it on a sticky note in the fridge more mornings than not.", typeLabel: "Written story", meta: "by Staci" },
  },
  {
    id: "picture",
    label: "Where do you picture them most?",
    kind: "general",
    alts: [
      "Where do you picture them most?",
      "What's the most “them” thing they ever did?",
      "What did you two always end up talking about?",
    ],
    result: { kind: "story", text: "Standing at the stove, always making too much, always insisting you take some home with you.", typeLabel: "Written story", meta: "by Dan" },
  },
  {
    id: "photo",
    label: "What's a photo of them you keep coming back to?",
    kind: "photo",
    alts: [
      "What's a photo of them you keep coming back to?",
      "Is there a photo of them nobody else has seen?",
    ],
    result: { kind: "photo", typeLabel: "Photo", meta: "2019" },
  },
  {
    id: "recipe",
    label: "Do you have a recipe of theirs — even handwritten?",
    kind: "photo",
    alts: [
      "Do you have a recipe of theirs — even handwritten?",
      "Do you have something they made, wrote, or drew?",
    ],
    result: { kind: "photo", typeLabel: "Recipe", meta: "scanned" },
  },
];

const DEMO_WAVE_BARS = 22;

function demoAttachOptions(kind) {
  if (kind === "photo") return [{ id: "photo", label: "Upload a photo" }];
  return [
    { id: "photo", label: "Add a photo" },
    { id: "voice", label: "Record a voice memo" },
    { id: "av", label: "Upload audio or video" },
  ];
}

function WhatYouGetDemo() {
  const [activeId, setActiveId] = useState(DEMO_QUESTIONS[0].id);
  const [altIndex, setAltIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState("type"); // "type" | "record" — general questions only
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [waveHeights, setWaveHeights] = useState(() => Array(DEMO_WAVE_BARS).fill(4));
  const [filled, setFilled] = useState(false);
  const [glowKey, setGlowKey] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const waveTimerRef = useRef(null);

  useEffect(() => () => clearInterval(waveTimerRef.current), []);

  const active = DEMO_QUESTIONS.find((q) => q.id === activeId);
  const questionText = active.alts[altIndex % active.alts.length];
  const isGeneral = active.kind === "general";

  const stopRecordingSim = () => {
    clearInterval(waveTimerRef.current);
    setRecording(false);
  };

  const selectChip = (id) => {
    setActiveId(id);
    setAltIndex(0);
    setAnswerMode("type");
    stopRecordingSim();
    setRecorded(false);
    setFilled(false);
    setShowToast(false);
  };

  const shuffle = () => setAltIndex((i) => i + 1);

  // No real audio capture in this pre-signup marketing demo — just an
  // interval nudging random bar heights, same as the reference mockup.
  const toggleRecordingSim = () => {
    if (recording) {
      stopRecordingSim();
      setRecorded(true);
    } else {
      setRecorded(false);
      setRecording(true);
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: DEMO_WAVE_BARS }, () => 4 + Math.random() * 18));
      }, 250);
    }
  };

  const handleSubmit = () => {
    setShowToast(true);
    setFilled(true);
    setGlowKey((k) => k + 1); // fresh key restarts the glow animation, even on a repeat submit
  };

  const recordLabel = recording ? "Recording... tap to stop" : recorded ? "Recorded — tap to re-record" : "Tap to start recording";

  return (
    <div className="preview-block fade-up-3">
      <div className="preview-pills">
        {DEMO_QUESTIONS.map((q) => (
          <button key={q.id} className={`preview-pill${q.id === activeId ? " active" : ""}`} onClick={() => selectChip(q.id)}>
            {q.label}
          </button>
        ))}
      </div>
      <p className="demo-try-hint">Tap a question above, or try the shuffle inside — this is the actual prompt screen, working.</p>

      <div className="browser-mock demo-browser-mock">
        <div className="browser-mock-bar">
          <span className="browser-mock-dot" />
          <span className="browser-mock-dot" />
          <span className="browser-mock-dot" />
          <span className="browser-mock-url">myandthen.com/their-page</span>
        </div>
        <div className="demo-browser-grid">
          <div className="demo-col">
            <div className="demo-eyebrow">SHARE A MEMORY &middot; AS THEIR CHILD</div>

            <div className="demo-question-box">
              <p className="demo-question-text">{questionText}</p>
              <span className="demo-shuffle-link" onClick={shuffle}>Give me a different question</span>
            </div>

            {isGeneral && (
              <div className="demo-mode-toggle">
                <button type="button" className={answerMode === "type" ? "active" : ""} onClick={() => setAnswerMode("type")}>Type it out</button>
                <button type="button" className={answerMode === "record" ? "active" : ""} onClick={() => setAnswerMode("record")}>Record it in your own voice</button>
              </div>
            )}

            {isGeneral && answerMode === "record" ? (
              <div className="demo-record-box">
                <button type="button" className={`demo-record-btn${recording ? " recording" : ""}`} onClick={toggleRecordingSim} aria-label={recording ? "Stop recording" : "Start recording"}>
                  <span className="demo-record-dot" />
                </button>
                <p className="demo-record-label">{recordLabel}</p>
                <div className="demo-record-wave">
                  {waveHeights.map((h, i) => (
                    <span key={i} className={recording ? "active" : ""} style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <textarea key={activeId} className="demo-textarea" placeholder="Type the memory here..." />
                <div className="demo-attach-row">
                  {demoAttachOptions(active.kind).map((o) => (
                    <button key={o.id} type="button" className="demo-attach-pill">{o.label}</button>
                  ))}
                </div>
              </>
            )}

            <hr className="demo-divider" />

            <div className="demo-contact-row">
              <div className="demo-field-compact">
                <label>Your name *</label>
                <input type="text" placeholder="How you were known to them" />
              </div>
              <div className="demo-field-compact">
                <label>Email (optional)</label>
                <input type="text" placeholder="So the family can say thanks" />
              </div>
            </div>

            <button type="button" className="demo-submit-btn" onClick={handleSubmit}>Share this memory</button>
            <div className={`demo-toast${showToast ? " show" : ""}`}>This is a live preview — start your own page to actually save one.</div>
            <p className="demo-flag">&uarr; this whole card is real and working, not a screenshot</p>
          </div>

          <div className="demo-result-col">
            <div className="demo-result-label">What shows up on their page</div>
            <div key={glowKey} className={`demo-result-tile${filled ? " filled glow" : ""}`}>
              {!filled ? (
                <div className="demo-result-waiting">Not shared yet &mdash; answer and submit to see it appear</div>
              ) : (
                <>
                  <div className={`demo-result-body ${active.result.kind}`}>
                    {active.result.kind === "story" && <p>{active.result.text}</p>}
                  </div>
                  <div className="demo-result-bar">
                    <span className="type">{active.result.typeLabel}</span>
                    <span className="meta">{active.result.meta}</span>
                  </div>
                </>
              )}
            </div>
            <p className="demo-result-hint">This is one tile among many on the real page — it lands in the same grid as every other photo, video, voicemail, and story.</p>
          </div>
        </div>
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

            <WhatYouGetDemo />
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
