import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, sendThankYou, notifyCreator } from "../lib/utils";

const TYPE_LABEL = { photo: "Photo", story: "Story", video: "Video", voice: "Audio" };
const FILTER_LABEL = { all: "Everything", photo: "Photos", story: "Stories", video: "Videos", voice: "Audio" };

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
      .select("id, memorial_id, contributor_name, contributor_relation, type, text, media_url, status, created_at")
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

  const filterTypes = ["all", ...new Set(stories.map((s) => s.type))];
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
          <section className="archive-intro">
            <div className="cluster-eyebrow">Every Contribution</div>
            <h2>The Full Archive</h2>
            <p>Every photo, story, and memory that's been shared for {memorial.name} &mdash; all in one place. There's no right order, so jump in anywhere.</p>
          </section>

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
            <div className="masonry">
              {stories.map((s) => (
                <div
                  key={s.id}
                  id={`story-${s.id}`}
                  className={`card-wrap${activeFilter !== "all" && s.type !== activeFilter ? " hidden-card" : ""}`}
                >
                  <ScrapbookCard story={s} />
                </div>
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
                  <button key={t.key} className={`type-btn ${contributeType === t.key ? "active" : ""}`} onClick={() => { setContributeType(t.key); setMediaFile(null); setMediaPreview(null); setAudioURL(null); }}>
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
                    <div style={{ position: "relative" }}>
                      {contributeType === "photo" ? (
                        <img src={mediaPreview} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 4 }} />
                      ) : (
                        <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 300, borderRadius: 4 }} />
                      )}
                      <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMediaFile(null); setMediaPreview(null); }}>Remove</button>
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
    </div>
  );
}

function ScrapbookCard({ story: s }) {
  const relLabel = s.contributor_relation ? `${s.contributor_name}, ${s.contributor_relation}` : s.contributor_name;
  return (
    <div className="card">
      {s.media_url && s.type === "photo" && (
        <div className="card-media"><img src={s.media_url} alt="" loading="lazy" /></div>
      )}
      {s.media_url && s.type === "video" && (
        <div className="card-media"><video controls src={s.media_url} /></div>
      )}
      {s.media_url && s.type === "voice" && (
        <div className="card-media-audio"><audio controls src={s.media_url} /></div>
      )}
      {s.text && <blockquote>{s.text}</blockquote>}
      <div className="meta">
        <span className="contributor">
          &mdash; {relLabel}
          <span className="contributor-time">{timeAgo(s.created_at)}</span>
        </span>
        <span className={`tag tag-${s.type}`}>{TYPE_LABEL[s.type] || "Story"}</span>
      </div>
    </div>
  );
}
