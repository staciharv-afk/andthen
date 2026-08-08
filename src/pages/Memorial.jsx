import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, sendThankYou, notifyCreator } from "../lib/utils";

const FILTER_LABEL = { all: "Everything", photo: "Photos", story: "Stories", video: "Videos", voice: "Audio", url: "Links" };
// Always show every filter, even types with zero entries yet — a page
// shouldn't lose its Audio/Video filter just because nothing's been
// added in that type so far.
const FILTER_ORDER = ["all", "story", "photo", "video", "voice", "url"];

// Grid-tile type label is deliberately its own map, distinct from
// FILTER_LABEL above — "Voicemail"/"Written story" read right on a tile,
// "Audio"/"Stories" read right on a filter chip, and a media entry with
// attached text still labels as its media type (e.g. a photo with a
// caption is "Photo", not "Story") regardless of what's stored in the
// type column. See MemoryTile.
const TILE_LABEL = { photo: "Photo", video: "Video", voice: "Voicemail", story: "Written story", url: "Link" };

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
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState(null); // { provider, videoId, start, title, image } | null
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkPreviewError, setLinkPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showContribute, setShowContribute] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [pendingScrollId, setPendingScrollId] = useState(null); // "See all memories" target, see the effect below
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

  // "See all memories" (from MemoryOfTheMoment) sets pendingScrollId and
  // switches to the "all" filter so the target tile is guaranteed visible
  // even if a different filter was active; this effect runs after that
  // re-render commits, once the tile actually exists in the DOM.
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = document.querySelector(`[data-memory-id="${pendingScrollId}"]`);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    el.classList.add("momo-highlight");
    const t = setTimeout(() => el.classList.remove("momo-highlight"), 1500);
    setPendingScrollId(null);
    return () => clearTimeout(t);
  }, [pendingScrollId, activeFilter, stories]);

  const handleSeeAllMemories = (id) => {
    setActiveFilter("all");
    setPendingScrollId(id);
  };

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
      .select("id, memorial_id, contributor_name, contributor_relation, type, text, media_url, status, created_at, crop_x, crop_y, link_meta")
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
    // Any image gets a crop anchor — a standalone photo entry and a photo
    // attached to a story are cropped the same way, only the video accept
    // ever passes a non-image file here.
    setCropPos(file.type.startsWith("image/") ? await detectCropPosition(file) : { x: 50, y: 50 });
  };

  // Fetches a title/thumbnail preview for a pasted URL. Best-effort — a
  // failed fetch still lets the link be shared (handleSubmit falls back to
  // the bare URL with no preview), it just means no thumbnail. Fires once
  // the field loses focus rather than on every keystroke.
  const fetchLinkPreview = async () => {
    const url = linkUrl.trim();
    if (!url) { setLinkPreview(null); setLinkPreviewError(""); return; }
    let hostname;
    try {
      hostname = new URL(url).hostname.replace(/^www\./, ""); // must at least be well-formed before we ask the server
    } catch {
      setLinkPreview(null);
      setLinkPreviewError("That doesn't look like a valid URL.");
      return;
    }
    setLinkPreviewLoading(true);
    setLinkPreviewError("");
    try {
      const res = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("preview failed");
      setLinkPreview({ ...(await res.json()), hostname });
    } catch {
      setLinkPreview(null);
      setLinkPreviewError("Couldn't load a preview — you can still share the link.");
    } finally {
      setLinkPreviewLoading(false);
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
    // A story needs text OR an attached photo — never neither. Photo-alone
    // (no caption) is a valid entry now, same as the dedicated Photo type.
    if (contributeType === "story" && !storyText.trim() && !mediaFile) { showToast("Please write a story or attach a photo.", "error"); return; }
    if ((contributeType === "photo" || contributeType === "video") && !mediaFile) { showToast("Please select a file.", "error"); return; }
    if (contributeType === "voice" && !audioURL) { showToast("Please record a voice memo.", "error"); return; }
    if (contributeType === "url" && !linkUrl.trim()) { showToast("Please paste a link.", "error"); return; }

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

      // A link entry's "media" is the fetched preview thumbnail, not an
      // upload — reuses media_url for that, consistent with every other
      // type's primary-visual convention.
      const isLink = contributeType === "url";
      const row = {
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: contributorRelation.trim() || null,
        contributor_email: contributorEmail.trim() || null,
        type: contributeType,
        text: storyText.trim() || null,
        media_url: isLink ? (linkPreview?.image || null) : mediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
        // Applies to a standalone photo entry and a story with an attached
        // photo alike — the crop only means anything when the uploaded file
        // was actually an image.
        crop_x: mediaUrl && mediaFile?.type.startsWith("image/") ? cropPos.x : null,
        crop_y: mediaUrl && mediaFile?.type.startsWith("image/") ? cropPos.y : null,
        link_meta: isLink
          ? {
              url: linkUrl.trim(),
              provider: linkPreview?.provider || null,
              videoId: linkPreview?.videoId || null,
              start: linkPreview?.start ?? null,
              title: linkPreview?.title || null,
              hostname: linkPreview?.hostname || null,
            }
          : null,
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
          <MemoryOfTheMoment stories={stories} memorialName={memorial.name} onSeeAll={handleSeeAllMemories} />

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
            <div className="memory-grid">
              {stories.map((s) => (
                <MemoryTile
                  key={s.id}
                  story={s}
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

            {/* Free memorials collect written memories only; photo/video/voice/
                link are unlocked when the family upgrades the page. */}
            {memorial.is_paid && (
              <div className="contribute-type-row">
                {[
                  { key: "story", icon: "✍️", label: "Story" },
                  { key: "photo", icon: "📷", label: "Photo" },
                  { key: "video", icon: "🎬", label: "Video" },
                  { key: "voice", icon: "🎙️", label: "Voice memo" },
                  { key: "url", icon: "🔗", label: "Add a link" },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`type-btn ${contributeType === t.key ? "active" : ""}`}
                    onClick={() => {
                      setContributeType(t.key);
                      setMediaFile(null); setMediaPreview(null); setAudioURL(null);
                      setCropPos({ x: 50, y: 50 }); setShowCropAdjuster(false);
                      setLinkUrl(""); setLinkPreview(null); setLinkPreviewError("");
                    }}
                  >
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

              {/* Optional — a story doesn't need a photo to submit. Someone who
                  wants to share just a photo with no story still has the
                  standalone Photo type above for that. */}
              {contributeType === "story" && (
                <div className="form-group">
                  <label className="form-label">Attach a photo (optional)</label>
                  {!mediaPreview ? (
                    <button type="button" className="attach-photo-btn" onClick={() => fileInputRef.current?.click()}>
                      + Add a photo
                    </button>
                  ) : (
                    <div className="photo-preview-crop">
                      <img src={mediaPreview} alt="" style={{ objectPosition: `${cropPos.x}% ${cropPos.y}%` }} />
                      <button type="button" className="crop-adjust-btn" onClick={() => setShowCropAdjuster(true)}>Adjust crop</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleMediaSelect(e.target.files[0])} />
                  {mediaPreview && (
                    <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMediaFile(null); setMediaPreview(null); setCropPos({ x: 50, y: 50 }); }}>Remove photo</button>
                  )}
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
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Caption (optional)</label>
                    <input className="form-input" placeholder="Add context or a caption..." value={storyText} onChange={(e) => setStoryText(e.target.value)} />
                  </div>
                </div>
              )}

              {contributeType === "url" && (
                <div className="form-group">
                  <label className="form-label">Link</label>
                  <input
                    className="form-input"
                    type="url"
                    placeholder="Paste a YouTube link, or any URL"
                    value={linkUrl}
                    onChange={(e) => { setLinkUrl(e.target.value); setLinkPreview(null); setLinkPreviewError(""); }}
                    onBlur={fetchLinkPreview}
                  />
                  {linkPreviewLoading && <span className="form-hint">Loading preview&hellip;</span>}
                  {linkPreviewError && <span className="form-error">{linkPreviewError}</span>}
                  {linkPreview && (
                    <div className="link-preview-card">
                      {linkPreview.image ? (
                        <img src={linkPreview.image} alt="" className="link-preview-thumb" />
                      ) : (
                        <div className="link-preview-thumb link-preview-thumb-fallback">🔗</div>
                      )}
                      <div>
                        <div className="link-preview-title">{linkPreview.title || linkUrl.trim()}</div>
                        <div className="link-preview-provider">{linkPreview.provider === "youtube" ? "YouTube" : linkPreview.hostname}</div>
                      </div>
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

// Picks a random entry, excluding the one just shown (unless there's only
// one entry total, in which case there's nothing else to pick).
function pickRandomMemoryId(stories, excludeId) {
  const pool = excludeId && stories.length > 1 ? stories.filter((s) => s.id !== excludeId) : stories;
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
}

// "One memory at a time" — a single random entry shown full-bleed above
// the grid, picked fresh on every page load (no per-visitor persistence,
// same experience every visit, per spec). Shared across every memorial
// page — driven entirely by that page's own stories, nothing Deb-specific.
function MemoryOfTheMoment({ stories, memorialName, onSeeAll }) {
  const [currentId, setCurrentId] = useState(() => pickRandomMemoryId(stories, null));
  const [cycleCount, setCycleCount] = useState(0);
  const current = stories.find((s) => s.id === currentId) || stories[0];
  if (!current) return null;

  const relLabel = current.contributor_relation ? `${current.contributor_name}, ${current.contributor_relation}` : current.contributor_name;

  const handleNext = () => {
    setCurrentId((prevId) => pickRandomMemoryId(stories, prevId));
    setCycleCount((c) => c + 1);
  };

  return (
    <section className="momo">
      <div className="momo-card">
        <div className="momo-eyebrow">One memory at a time</div>
        <MomoContent story={current} relLabel={relLabel} />
      </div>
      <div className="momo-controls">
        <button type="button" className="momo-btn momo-btn-primary" onClick={handleNext}>Next memory</button>
        <button type="button" className="momo-btn momo-btn-ghost" onClick={() => onSeeAll(current.id)}>See all memories</button>
      </div>
      {/* Doesn't block Next from continuing to work — just a nudge toward the archive. */}
      {cycleCount >= 4 && (
        <p className="momo-nudge">You've seen a few &mdash; the rest of {memorialName}'s story is waiting.</p>
      )}
    </section>
  );
}

function MomoAttr({ story: s, relLabel }) {
  return (
    <div className="momo-attr">
      &mdash; {relLabel}
      <span className="momo-attr-time">{timeAgo(s.created_at)}</span>
    </div>
  );
}

// Every content type renders inside the same card shell, matched to
// whatever MosaicItem uses for that type (crop position, YouTube embed,
// waveform) so "one memory at a time" and the grid never disagree about
// how an entry looks.
function MomoContent({ story: s, relLabel }) {
  if (s.type === "video" && s.media_url) {
    return (
      <>
        <div className="momo-video">
          <video src={s.media_url} controls playsInline />
        </div>
        <MomoAttr story={s} relLabel={relLabel} />
      </>
    );
  }

  if (s.type === "voice" && s.media_url) {
    return (
      <>
        <MomoAudio story={s} />
        <MomoAttr story={s} relLabel={relLabel} />
      </>
    );
  }

  if (s.type === "url" && s.link_meta) {
    return (
      <>
        <MomoLink story={s} />
        <MomoAttr story={s} relLabel={relLabel} />
      </>
    );
  }

  // Photo (standalone or attached to a story) and plain text all share this
  // shape — an optional photo, optional text, never neither.
  const objectPosition = `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%`;
  return (
    <>
      {s.media_url && (
        <div className="momo-photo">
          <img src={s.media_url} alt="" style={{ objectPosition }} />
        </div>
      )}
      {s.text && <blockquote className="momo-quote">{s.text}</blockquote>}
      <MomoAttr story={s} relLabel={relLabel} />
    </>
  );
}

// Reuses the homepage's voice-play-btn/icon-play/icon-pause/voice-waveform
// pattern as-is (unlike AudioCard in the grid, which had to re-color it for
// a light card) — that pattern was built for a dark background, which is
// exactly what the momo card shell is, so no adaptation needed here.
function MomoAudio({ story: s }) {
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
    <div className="momo-audio">
      <audio
        ref={audioRef}
        src={s.media_url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <div className="voice-controls">
        <button type="button" className="voice-play-btn" onClick={toggle} aria-label={playing ? "Pause voice memo" : "Play voice memo"}>
          {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
        </button>
        <div className="voice-waveform">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className={i / 40 <= progress ? "played" : ""}
              style={{ height: `${8 + Math.round(Math.abs(Math.sin(i * 0.7 + seed)) * 20)}px` }}
            />
          ))}
        </div>
        <span className="voice-time">{fmtTime(elapsed)} / {fmtTime(duration)}</span>
      </div>
    </div>
  );
}

// Simplified variant of LinkCard for this shell — same expand-inline-for-
// YouTube / open-new-tab-otherwise behavior.
function MomoLink({ story: s }) {
  const [expanded, setExpanded] = useState(false);
  const meta = s.link_meta || {};
  const isYouTube = meta.provider === "youtube" && meta.videoId;

  if (expanded && isYouTube) {
    return (
      <div className="momo-link-embed">
        <iframe
          src={`https://www.youtube.com/embed/${meta.videoId}?autoplay=1${meta.start ? `&start=${meta.start}` : ""}`}
          title={meta.title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="momo-link"
      onClick={() => (isYouTube ? setExpanded(true) : window.open(meta.url, "_blank", "noopener,noreferrer"))}
    >
      <div className="momo-link-thumb">
        {s.media_url ? <img src={s.media_url} alt="" /> : <div className="momo-link-thumb-fallback">🔗</div>}
        {isYouTube && <div className="media-play-btn" />}
      </div>
      <p className="momo-link-title">{meta.title || meta.hostname || meta.url}</p>
    </button>
  );
}

// Real mouse+hover devices already see a media entry's attached caption on
// :hover (pure CSS, no JS needed) — a click there just performs the tile's
// primary action right away. Touch devices have no hover, so the
// story-flag would be purely decorative there unless a tap reveals the
// caption first and a second tap (or a tap once revealed) performs the
// action — see MemoryTile's gate().
const hasHoverInput = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// One entry, one square tile, regardless of type — the whole point of the
// uniform grid. A media entry (photo/video/voice) with attached text gets
// a story-flag in the bar and its caption on hover/tap; a plain photo or a
// plain story has neither. crop_x/crop_y, YouTube embedding, and the
// waveform pattern are unchanged from the previous per-type components,
// just unified into one shell.
function MemoryTile({ story: s, hidden }) {
  const [revealed, setRevealed] = useState(false);
  const relLabel = s.contributor_name || "Someone";
  // A story-type row can carry an attached photo (see the earlier
  // linked-entries work) — treat it as a photo entry with a caption for
  // tile purposes, not as "written story" — the media (whatever it is) is
  // always the primary content, text is the optional attachment.
  const hasStory = !!s.media_url && !!s.text?.trim();
  const tileLabel = s.type === "story" && s.media_url ? "Photo" : (TILE_LABEL[s.type] || "Written story");

  // Gates a tile's primary action (play, expand, open) behind the caption
  // reveal on touch devices; on hover-capable devices the caption's
  // already visible via :hover, so a click just acts immediately.
  const gate = (action) => () => {
    if (hasStory && !revealed && !hasHoverInput()) { setRevealed(true); return; }
    action();
  };

  return (
    <div
      data-memory-id={s.id}
      className={`mem-tile${hidden ? " hidden-card" : ""}${revealed ? " revealed" : ""}`}
    >
      <TileBody story={s} gate={gate} />
      {hasStory && (
        <div className="mem-tile-caption"><p>{s.text}</p></div>
      )}
      <div className="mem-tile-bar">
        <span className="mem-tile-type">{tileLabel}</span>
        {hasStory && <span className="mem-tile-flag" aria-hidden="true">&rdquo;</span>}
        <span className="mem-tile-meta">{relLabel}</span>
      </div>
    </div>
  );
}

// Guarded by media_url, not just type — a handful of real entries on
// production are tagged photo/video/voice but never finished uploading (a
// pre-existing data issue, not something to hide). Falling through to the
// plain-story render at the bottom shows their actual text instead of an
// empty media box.
function TileBody({ story: s, gate }) {
  if ((s.type === "photo" || s.type === "story") && s.media_url) {
    return (
      <div className="mem-tile-body mem-tile-photo">
        <img src={s.media_url} alt="" loading="lazy" style={{ objectPosition: `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%` }} />
      </div>
    );
  }
  if (s.type === "video" && s.media_url) return <TileVideo story={s} gate={gate} />;
  if (s.type === "voice" && s.media_url) return <TileVoice story={s} gate={gate} />;
  if (s.type === "url" && s.link_meta) return <TileUrl story={s} gate={gate} />;

  return (
    <div className="mem-tile-body mem-tile-story">
      {s.text ? <blockquote>{s.text}</blockquote> : null}
    </div>
  );
}

function TileVideo({ story: s, gate }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const activate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.pause();
    else v.play();
    setPlaying((p) => !p);
  };

  return (
    <div className="mem-tile-body mem-tile-video" onClick={gate(activate)}>
      <video ref={videoRef} src={s.media_url} preload="metadata" playsInline controls={playing} onEnded={() => setPlaying(false)} />
      {!playing && <div className="mem-tile-play" />}
    </div>
  );
}

// Reuses the homepage's waveform pattern (cream bars on a dark background)
// unmodified — this tile's own background is dark, exactly the context
// that pattern was built for.
function TileVoice({ story: s, gate }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? elapsed / duration : 0;
  const seed = seedFor(s.id);

  const activate = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
    setPlaying((p) => !p);
  };

  return (
    <div className="mem-tile-body mem-tile-voice" onClick={gate(activate)}>
      <audio
        ref={audioRef}
        src={s.media_url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <div className="mem-tile-wave">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className={i / 20 <= progress ? "played" : ""}
            style={{ height: `${6 + Math.round(Math.abs(Math.sin(i * 0.7 + seed)) * 32)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

// YouTube links expand to an inline embed (honoring the saved start-time
// offset, if any) once activated; anything else opens in a new tab, since
// there's no universal embeddable player for an arbitrary site. media_url
// doubles as the thumbnail (YouTube's own, or a scraped og:image) — absent
// for a link whose preview fetch failed, which still renders fine with a
// fallback icon, never blocked.
function TileUrl({ story: s, gate }) {
  const [expanded, setExpanded] = useState(false);
  const meta = s.link_meta || {};
  const isYouTube = meta.provider === "youtube" && meta.videoId;

  if (expanded && isYouTube) {
    return (
      <div className="mem-tile-body mem-tile-url-embed">
        <iframe
          src={`https://www.youtube.com/embed/${meta.videoId}?autoplay=1${meta.start ? `&start=${meta.start}` : ""}`}
          title={meta.title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const activate = () => (isYouTube ? setExpanded(true) : window.open(meta.url, "_blank", "noopener,noreferrer"));

  return (
    <div className="mem-tile-body mem-tile-url" onClick={gate(activate)}>
      {isYouTube && <span className="mem-tile-yt-badge">YouTube</span>}
      {s.media_url ? <img src={s.media_url} alt="" loading="lazy" /> : <div className="mem-tile-url-fallback">🔗</div>}
      {isYouTube && <div className="mem-tile-play" />}
    </div>
  );
}
