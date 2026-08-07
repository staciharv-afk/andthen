import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, sendThankYou, notifyCreator } from "../lib/utils";

const TYPE_LABEL = { photo: "Photo", story: "Story", video: "Video", voice: "Audio" };
const FILTER_LABEL = { all: "Everything", photo: "Photos", story: "Stories", video: "Videos", voice: "Audio" };
// Always show every filter, even types with zero entries yet — a page
// shouldn't lose its Audio/Video filter just because nothing's been
// added in that type so far.
const FILTER_ORDER = ["all", "story", "photo", "video", "voice"];

// -- mosaic layout tuning --
// Text entries span more columns as they get longer (a simple length
// threshold, not manual tagging). Photos are always a single square tile
// (see PhotoItem) so they don't need a span rule of their own. Video/audio
// spans are fixed by type.
const TEXT_SPAN_LONG = 220;   // > this many characters -> span 3
const TEXT_SPAN_MED = 80;     // > this many characters -> span 2, else span 1

// The pull-quote is one short, standalone-readable text entry rendered
// full-width as a magazine-style break in the grid. Bounded on both ends —
// too short reads as a fragment out of context, too long stops looking like
// a "pull" quote — and picks the shortest candidate so the choice is stable
// and deterministic rather than arbitrary.
const PULLQUOTE_MIN_LEN = 20;
const PULLQUOTE_MAX_LEN = 90;

// One accent-tinted text card roughly every N entries, so the grid gets a
// color break even on a page with no photos yet.
const ACCENT_EVERY = 9;

function pickPullQuoteId(stories) {
  const candidates = stories.filter(
    (s) => s.type === "story" && s.text && s.text.trim().length >= PULLQUOTE_MIN_LEN && s.text.trim().length <= PULLQUOTE_MAX_LEN
  );
  if (!candidates.length) return null;
  return candidates.reduce((shortest, s) => (s.text.trim().length < shortest.text.trim().length ? s : shortest)).id;
}

function pickAccentIds(stories, pullQuoteId) {
  const ids = new Set();
  stories
    .filter((s) => s.type === "story" && s.id !== pullQuoteId)
    .forEach((s, i) => { if (i % ACCENT_EVERY === 0) ids.add(s.id); });
  return ids;
}

function textColSpan(text) {
  const len = (text || "").trim().length;
  if (len > TEXT_SPAN_LONG) return 3;
  if (len > TEXT_SPAN_MED) return 2;
  return 1;
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Deterministic per-story offset so multiple waveform cards on the same
// page don't all render the identical bar pattern.
const seedFor = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 1000;
  return h;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// object-fit: cover's rendered size for a natural image inside a box —
// used to convert a pixel drag distance into an object-position percentage.
function coverSize({ w, h }, boxW, boxH) {
  const scale = Math.max(boxW / w, boxH / h);
  return { w: w * scale, h: h * scale };
}

// Smart default crop anchor for a freshly-selected photo, run at upload
// time (before the file is even uploaded). Tries the browser's built-in
// Shape Detection API where it exists — support is spotty (mainly older
// Android Chrome; Safari and Firefox never implemented it, and it's not a
// dependency worth adding a real face-detection library for) — and falls
// back to a plain center crop everywhere else, silently, never blocking
// the upload.
async function detectCropPosition(file) {
  try {
    if (!("FaceDetector" in window)) return { x: 50, y: 50 };
    const bitmap = await createImageBitmap(file);
    const detector = new window.FaceDetector({ maxDetectedFaces: 5, fastMode: true });
    const faces = await detector.detect(bitmap);
    if (!faces?.length) return { x: 50, y: 50 };
    const largest = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b
    );
    const { x, y, width, height } = largest.boundingBox;
    return {
      x: clamp(((x + width / 2) / bitmap.width) * 100, 10, 90),
      y: clamp(((y + height / 2) / bitmap.height) * 100, 10, 90),
    };
  } catch {
    return { x: 50, y: 50 }; // detection failing is never a reason to block the upload
  }
}

export function MemorialPage({ inviteCode, showToast, onNavigate }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [contributeType, setContributeType] = useState("story");
  const [contributorName, setContributorName] = useState("");
  const [contributorRelation, setContributorRelation] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [storyText, setStoryText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [cropPos, setCropPos] = useState({ x: 50, y: 50 });
  const [showCropAdjuster, setShowCropAdjuster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showContribute, setShowContribute] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const fileInputRef = useRef();
  const contributeRef = useRef(null);

  const MAX_SECONDS = 60;

  // Reject videos longer than the cap (read duration without uploading).
  const videoWithinCap = (file) =>
    new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration <= MAX_SECONDS + 0.5); };
      v.onerror = () => resolve(true); // unreadable — let it through rather than block
      v.src = URL.createObjectURL(file);
    });

  // Rotate through the memorial's prompts on the contribute form.
  useEffect(() => {
    const list = memorial?.prompts?.length ? memorial.prompts : (memorial?.prompt ? [memorial.prompt] : []);
    if (list.length < 2) return;
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % list.length), 4500);
    return () => clearInterval(t);
  }, [memorial]);

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

  useEffect(() => {
    if (showContribute) contributeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showContribute]);

  const openContribute = () => { setSubmitted(false); setShowContribute(true); };

  const loadMemorial = async () => {
    setLoading(true);
    // The URL param may be the invite code (?memorial=<code>) or a custom
    // vanity slug (myandthen.com/<slug>) — try both rather than building a
    // filter string out of raw URL input.
    let { data } = await supabase.from("memorials").select("*").eq("invite_code", inviteCode);
    if (!data?.length) ({ data } = await supabase.from("memorials").select("*").eq("slug", inviteCode));
    if (data?.length) {
      setMemorial(data[0]);
      loadStories(data[0].id, data[0].require_approval);
    }
    setLoading(false);
  };

  const loadStories = async (memorialId, requireApproval) => {
    // anon only has column-scoped SELECT on this table (no contributor_email —
    // see 20260705_protect_contributor_email.sql), so select("*") is denied
    // outright for anonymous visitors. List the public columns explicitly.
    let query = supabase
      .from("contributions")
      .select("id, memorial_id, contributor_name, contributor_relation, type, text, media_url, status, created_at, crop_x, crop_y")
      .eq("memorial_id", memorialId)
      .order("created_at", { ascending: false });
    if (requireApproval) query = query.eq("status", "approved");
    const { data } = await query;
    setStories(data || []);
  };

  const handleMediaSelect = async (file) => {
    if (!file) return;
    if (file.type.startsWith("video/") && !(await videoWithinCap(file))) {
      showToast("Videos must be 60 seconds or less.", "error");
      return;
    }
    setMediaFile(file);
    const preview = await fileToDataURL(file);
    setMediaPreview(preview);
    if (contributeType === "photo") {
      setCropPos(await detectCropPosition(file));
    } else {
      setCropPos({ x: 50, y: 50 });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration((d) => Math.min(d + 1, MAX_SECONDS)), 1000);
      maxTimerRef.current = setTimeout(stopRecording, MAX_SECONDS * 1000); // hard 60s cap
    } catch { showToast("Please allow microphone access to record.", "error"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
  };

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleSubmit = async () => {
    if (!contributorName.trim()) { showToast("Please enter your name.", "error"); return; }
    if (contributorEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contributorEmail.trim())) { showToast("That email doesn't look right.", "error"); return; }
    if (contributeType === "story" && !storyText.trim()) { showToast("Please write a story.", "error"); return; }
    if ((contributeType === "photo" || contributeType === "video") && !mediaFile) { showToast("Please select a file.", "error"); return; }
    if (contributeType === "voice" && !audioURL) { showToast("Please record a voice memo.", "error"); return; }

    setSubmitting(true);
    try {
      let mediaUrl = null;

      if (mediaFile) {
        const path = `contributions/${memorial.invite_code}/${uid()}.${mediaFile.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, mediaFile);
        if (upErr) throw upErr; // don't save a media-less memory on a failed upload
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      }

      if (contributeType === "voice" && audioURL) {
        const resp = await fetch(audioURL);
        const blob = await resp.blob();
        const path = `contributions/${memorial.invite_code}/${uid()}.webm`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, blob, { contentType: "audio/webm" });
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      }

      const row = {
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: contributorRelation.trim() || null,
        contributor_email: contributorEmail.trim() || null,
        type: contributeType,
        text: storyText.trim() || null,
        media_url: mediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
        crop_x: contributeType === "photo" && mediaUrl ? cropPos.x : null,
        crop_y: contributeType === "photo" && mediaUrl ? cropPos.y : null,
      };

      if (memorial.require_approval) {
        // Pending rows are hidden from anonymous contributors by RLS, so we must
        // NOT ask for them back — a plain insert, or the insert itself is rejected.
        // The thank-you fires later, when the steward approves.
        const { error } = await supabase.from("contributions").insert(row);
        if (error) throw error;
      } else {
        // Auto-approved rows are publicly readable, so we can read the id back
        // and thank the contributor right away.
        const { data: inserted, error } = await supabase.from("contributions").insert(row).select("id");
        if (error) throw error;
        if (contributorEmail.trim()) sendThankYou(inserted?.[0]?.id);
      }

      // Let the creator know a new memory arrived (server caps at 5/day + dedupes).
      notifyCreator(memorial.id);

      setSubmitted(true);
      showToast(memorial.require_approval ? "Your memory was submitted! The family will review it soon." : "Your memory was added. Thank you for sharing.");
    } catch { showToast("Something went wrong. Please try again.", "error"); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorial) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <h2 style={{ fontFamily: "Lora, serif", marginBottom: 12 }}>Memorial not found</h2>
      <p style={{ color: "var(--warm-light)" }}>This link may be invalid or the memorial may have been removed.</p>
    </div>
  );

  const promptList = memorial.prompts?.length ? memorial.prompts : (memorial.prompt ? [memorial.prompt] : []);
  const currentPrompt = promptList.length ? promptList[promptIdx % promptList.length] : "";

  const filterTypes = FILTER_ORDER;
  const contributorCount = new Set(stories.map((s) => s.contributor_name)).size;

  const pullQuoteId = pickPullQuoteId(stories);
  const accentIds = pickAccentIds(stories, pullQuoteId);

  const heroTitle = (
    <>
      <span className="eyebrow-script">as told by everyone who loves them</span>
      <h1 className="memorial-hero-name">{memorial.name}</h1>
      {(memorial.born || memorial.passed) && (
        <div className="memorial-hero-dates">
          {fmtDate(memorial.born)}{memorial.born && memorial.passed && " – "}{fmtDate(memorial.passed)}
        </div>
      )}
    </>
  );

  return (
    <div className="memorial-page">
      <header className="scrapbook-hero">
        <button type="button" className="memorial-brand" onClick={() => onNavigate?.("home")}>
          <span className="memorial-brand-logo">And Then<em>...</em></span>
          <span className="memorial-brand-tag">A living story for someone you love.</span>
        </button>

        {memorial.photo_url ? (
          <div className="hero-banner">
            <img src={memorial.photo_url} alt={memorial.name} />
            <div className="hero-banner-scrim" />
            <div className="hero-banner-label">{heroTitle}</div>
          </div>
        ) : (
          <>
            <div className="hero-blob b1" />
            <div className="hero-blob b2" />
            <div className="hero-blob b3" />
            <div className="hero-label">{heroTitle}</div>
          </>
        )}

        <div className="hero-below">
          {memorial.description && <p className="memorial-hero-desc">{memorial.description}</p>}
          {stories.length > 0 && (
            <div className="stat-line">
              {contributorCount} {contributorCount === 1 ? "person has" : "people have"} shared {stories.length} {stories.length === 1 ? "memory" : "memories"}
            </div>
          )}
        </div>
      </header>

      <div id="archive" />

      {stories.length === 0 ? (
        <div className="empty-state fade-up-2">
          <div className="empty-state-icon">🕊️</div>
          <div className="empty-state-title">No memories yet</div>
          <p className="empty-state-sub">Be the first to share a story, photo, or memory of {memorial.name}.</p>
        </div>
      ) : (
        <>
          <nav className="filter-bar">
            <div className="filter-inner">
              {filterTypes.map((f) => (
                <button key={f} className={`chip${activeFilter === f ? " active" : ""}`} onClick={() => setActiveFilter(f)}>
                  {FILTER_LABEL[f] || f}
                </button>
              ))}
            </div>
          </nav>

          <main className="clusters">
            <div className="mosaic-grid">
              {stories.map((s) => (
                <MosaicItem
                  key={s.id}
                  story={s}
                  isPullQuote={s.id === pullQuoteId}
                  isAccent={accentIds.has(s.id)}
                  hidden={activeFilter !== "all" && s.type !== activeFilter}
                />
              ))}
            </div>
          </main>
        </>
      )}

      <footer className="closing">
        <div className="script">and then...</div>
        <h2>This is only what's been shared so far. There's always another memory somewhere.</h2>
        <button className="add-btn" onClick={openContribute}>Add Your Memory</button>
        <p className="note">This page keeps growing &mdash; anyone who knew {memorial.name.split(" ")[0]} can add a photo, story, voice memo, or video, anytime.</p>
      </footer>

      {showContribute && (
        <div ref={contributeRef} className="page-wrap" style={{ paddingBottom: 64 }}>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowContribute(false)}>Close</button>
          {!submitted ? (
          <div className="contribute-card fade-up">
            <h2 className="contribute-title">Share a memory</h2>
            <p className="contribute-sub">What's your story? A moment, a habit, something they said — anything that captures who they really were.</p>
            {currentPrompt && (
              <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "var(--rust)", fontSize: 16, lineHeight: 1.5, marginBottom: 24, transition: "opacity 0.3s" }}>
                "{currentPrompt}"
              </p>
            )}

            {/* Free memorials collect written memories only; photo/video/voice
                are unlocked when the family upgrades the page. */}
            {memorial.is_paid && (
              <div className="contribute-type-row">
                {[
                  { key: "story", icon: "✍️", label: "Story" },
                  { key: "photo", icon: "📷", label: "Photo" },
                  { key: "video", icon: "🎬", label: "Video" },
                  { key: "voice", icon: "🎙️", label: "Voice memo" },
                ].map((t) => (
                  <button key={t.key} className={`type-btn ${contributeType === t.key ? "active" : ""}`} onClick={() => { setContributeType(t.key); setMediaFile(null); setMediaPreview(null); setAudioURL(null); setCropPos({ x: 50, y: 50 }); setShowCropAdjuster(false); }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your name *</label>
                  <input className="form-input" placeholder="How you were known to them" value={contributorName} onChange={(e) => setContributorName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your relation</label>
                  <input className="form-input" placeholder="e.g. daughter, neighbor, colleague" value={contributorRelation} onChange={(e) => setContributorRelation(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Your email (optional)</label>
                <input className="form-input" type="email" placeholder="So the family can say thank you" value={contributorEmail} onChange={(e) => setContributorEmail(e.target.value)} />
              </div>

              {contributeType === "story" && (
                <div className="form-group">
                  <label className="form-label">Your story</label>
                  <textarea className="form-input" placeholder={currentPrompt || `And then ${memorial.name.split(" ")[0]}...`} value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={5} />
                </div>
              )}

              {(contributeType === "photo" || contributeType === "video") && (
                <div>
                  {!mediaPreview ? (
                    <div className="media-drop" onClick={() => fileInputRef.current?.click()}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{contributeType === "photo" ? "📷" : "🎬"}</div>
                      <div className="media-drop-text">Click to select a {contributeType === "photo" ? "photo" : "video"}</div>
                      <input ref={fileInputRef} type="file" accept={contributeType === "photo" ? "image/*" : "video/*"} style={{ display: "none" }} onChange={(e) => handleMediaSelect(e.target.files[0])} />
                    </div>
                  ) : (
                    <div>
                      {contributeType === "photo" ? (
                        <div className="photo-preview-crop">
                          <img src={mediaPreview} alt="" style={{ objectPosition: `${cropPos.x}% ${cropPos.y}%` }} />
                          <button type="button" className="crop-adjust-btn" onClick={() => setShowCropAdjuster(true)}>Adjust crop</button>
                        </div>
                      ) : (
                        <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 300, borderRadius: 4 }} />
                      )}
                      <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMediaFile(null); setMediaPreview(null); setCropPos({ x: 50, y: 50 }); }}>Remove</button>
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Caption (optional)</label>
                    <input className="form-input" placeholder="Add context or a caption..." value={storyText} onChange={(e) => setStoryText(e.target.value)} />
                  </div>
                </div>
              )}

              {contributeType === "voice" && (
                <div className="voice-recorder">
                  {!audioURL ? (
                    <>
                      <button
                        className={`record-btn ${recording ? "record-btn-recording" : "record-btn-idle"}`}
                        onClick={recording ? stopRecording : startRecording}
                      >
                        {recording ? "⏹" : "🎙️"}
                      </button>
                      {recording && <div className="record-time">{fmtDuration(recordDuration)}</div>}
                      <div className="record-sub">{recording ? "Recording... tap to stop" : "Tap to start recording"}</div>
                    </>
                  ) : (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                      <audio controls src={audioURL} style={{ width: "100%" }} />
                      <button className="btn btn-sm btn-ghost" onClick={() => setAudioURL(null)}>Re-record</button>
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-rust btn-lg" onClick={handleSubmit} disabled={submitting} style={{ justifyContent: "center" }}>
                {submitting ? <><span className="spinner" /> Sharing...</> : "Share this memory"}
              </button>
            </div>
          </div>
        ) : (
          <div className="contribute-card fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🫶</div>
            <h2 className="contribute-title">Thank you for sharing</h2>
            <p style={{ color: "var(--warm-light)", lineHeight: 1.7, fontSize: 15 }}>
              {memorial.require_approval
                ? "Your memory has been submitted and will appear once the family reviews it."
                : `Your memory has been added to ${memorial.name}'s story.`}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setSubmitted(false)}>Share another memory</button>
              <button className="btn btn-rust" onClick={() => setShowContribute(false)}>Done</button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Rendered at the top level, not nested in .contribute-card — that
          card is a .fade-up element, and a completed fill-mode animation
          leaves a lingering `transform` on it, which makes it a new
          containing block for `position: fixed` descendants and breaks
          this overlay's viewport-relative centering. */}
      {showCropAdjuster && mediaFile && (
        <CropAdjuster
          file={mediaFile}
          initialPos={cropPos}
          onCancel={() => setShowCropAdjuster(false)}
          onConfirm={(pos) => { setCropPos(pos); setShowCropAdjuster(false); }}
        />
      )}
    </div>
  );
}

// Manual crop reposition — drag the full photo behind a fixed square
// window (no zoom/rotate, matching a Facebook/LinkedIn profile-photo
// repositioner). Renders the same object-fit: cover + object-position the
// final tile uses, so what's shown while dragging is exactly what gets
// saved — the drag math just needs to convert a pixel offset into the
// object-position percentage that would produce that same view.
function CropAdjuster({ file, initialPos, onCancel, onConfirm }) {
  const CROP_SIZE = 300;
  const [pos, setPos] = useState(initialPos);
  const [naturalSize, setNaturalSize] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);

  // Create and revoke the object URL in the same effect (keyed to `file`,
  // not a lazily-initialized ref) — StrictMode double-invokes effects in
  // dev (mount, cleanup, mount again), and a ref-cached "create once" URL
  // would get revoked by the first synthetic cleanup and never recreated.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const rendered = naturalSize ? coverSize(naturalSize, CROP_SIZE, CROP_SIZE) : null;
  const overflowX = rendered ? Math.max(0, rendered.w - CROP_SIZE) : 0;
  const overflowY = rendered ? Math.max(0, rendered.h - CROP_SIZE) : 0;

  const beginDrag = (clientX, clientY) => {
    dragStart.current = { x: clientX, y: clientY, posX: pos.x, posY: pos.y };
    setDragging(true);
  };
  const onMouseDown = (e) => beginDrag(e.clientX, e.clientY);
  const onTouchStart = (e) => beginDrag(e.touches[0].clientX, e.touches[0].clientY);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (e.touches) e.preventDefault(); // don't let the page scroll while repositioning
      const dx = point.clientX - dragStart.current.x;
      const dy = point.clientY - dragStart.current.y;
      // Dragging the photo right reveals more of its left side, i.e. the
      // object-position anchor moves the opposite direction of the drag.
      setPos({
        x: overflowX ? clamp(dragStart.current.posX - (dx / overflowX) * 100, 0, 100) : 50,
        y: overflowY ? clamp(dragStart.current.posY - (dy / overflowY) * 100, 0, 100) : 50,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, overflowX, overflowY]);

  return (
    <div className="crop-adjust-overlay fade-in" role="dialog" aria-label="Adjust photo crop">
      <div className="crop-adjust-card">
        <h3 className="crop-adjust-title">Reposition photo</h3>
        <p className="crop-adjust-sub">Drag to choose what shows in the square.</p>
        <div className="crop-adjust-window" onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
          {imgUrl && (
            <img
              src={imgUrl}
              alt=""
              className="crop-adjust-img"
              draggable={false}
              onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            />
          )}
        </div>
        <div className="crop-adjust-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-rust" onClick={() => onConfirm(pos)}>Save position</button>
        </div>
      </div>
    </div>
  );
}

// Mosaic grid item — one entry, sized and treated by type. Each branch
// returns its own complete .mosaic-item grid child.
function MosaicItem({ story: s, isPullQuote, isAccent, hidden }) {
  const relLabel = s.contributor_relation ? `${s.contributor_name}, ${s.contributor_relation}` : s.contributor_name;
  const hiddenClass = hidden ? " hidden-card" : "";

  if (isPullQuote) {
    return (
      <div id={`story-${s.id}`} className={`mosaic-item mi-col-full${hiddenClass}`}>
        <div className="pullquote-card">
          <blockquote>{s.text}</blockquote>
          <span className="pullquote-attr">&mdash; {relLabel}</span>
        </div>
      </div>
    );
  }

  // Guarded by media_url, not just type — a handful of real entries on
  // production are tagged photo/video/voice but never finished uploading
  // (a pre-existing data issue, not something to hide). Falling through to
  // the text-card branch below shows their actual text instead of an
  // empty media box.
  if (s.type === "video" && s.media_url) {
    return (
      <div id={`story-${s.id}`} className={`mosaic-item mi-col-2 mi-row-2${hiddenClass}`}>
        <VideoCard story={s} relLabel={relLabel} />
      </div>
    );
  }

  if (s.type === "voice" && s.media_url) {
    return (
      <div id={`story-${s.id}`} className={`mosaic-item mi-col-2${hiddenClass}`}>
        <AudioCard story={s} relLabel={relLabel} />
      </div>
    );
  }

  if (s.type === "photo" && s.media_url) {
    return <PhotoItem story={s} id={`story-${s.id}`} hiddenClass={hiddenClass} />;
  }

  const span = textColSpan(s.text);
  return (
    <div id={`story-${s.id}`} className={`mosaic-item mi-col-${span}${hiddenClass}`}>
      <div className={`card${isAccent ? " card-accent" : ""}`}>
        {s.text && <blockquote>{s.text}</blockquote>}
        <div className="meta">
          <span className="contributor">
            &mdash; {relLabel}
            <span className="contributor-time">{timeAgo(s.created_at)}</span>
          </span>
          <span className={`tag tag-${s.type}`}>{TYPE_LABEL[s.type] || "Story"}</span>
        </div>
      </div>
    </div>
  );
}

// Uniform square tile (Instagram-grid style) — cropped via object-position
// from the entry's saved crop_x/crop_y (face-detected or manually
// repositioned at contribute time; null falls back to a plain center crop).
function PhotoItem({ story: s, id, hiddenClass }) {
  const objectPosition = `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%`;
  return (
    <div id={id} className={`mosaic-item mi-col-1${hiddenClass}`}>
      <div className="photo-item">
        <img src={s.media_url} alt="" loading="lazy" style={{ objectPosition }} />
      </div>
    </div>
  );
}

function VideoCard({ story: s, relLabel }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.pause();
    else v.play();
    setPlaying((p) => !p);
  };

  return (
    <div className="video-mosaic-card">
      <button type="button" className="video-mosaic-frame" onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"}>
        <video ref={videoRef} src={s.media_url} preload="metadata" playsInline controls={playing} onEnded={() => setPlaying(false)} />
        {!playing && <div className="media-play-btn" />}
      </button>
      <div className="video-mosaic-caption">&mdash; {relLabel}</div>
    </div>
  );
}

function AudioCard({ story: s, relLabel }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? elapsed / duration : 0;
  const seed = seedFor(s.id);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
    setPlaying((p) => !p);
  };

  return (
    <div className="audio-mosaic-card">
      <audio
        ref={audioRef}
        src={s.media_url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <div className="audio-mosaic-controls">
        <button type="button" className="voice-play-btn" onClick={toggle} aria-label={playing ? "Pause voice memo" : "Play voice memo"}>
          {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
        </button>
        <div className="audio-mosaic-waveform">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className={i / 28 <= progress ? "played" : ""}
              style={{ height: `${6 + Math.round(Math.abs(Math.sin(i * 0.7 + seed)) * 16)}px` }}
            />
          ))}
        </div>
        <span className="audio-mosaic-time">{fmtTime(elapsed)} / {fmtTime(duration)}</span>
      </div>
      <div className="audio-mosaic-attr">&mdash; {relLabel}</div>
    </div>
  );
}
