import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL } from "../lib/utils";

export function MemorialPage({ inviteCode, showToast }) {
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
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef();

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

  const loadMemorial = async () => {
    setLoading(true);
    const { data } = await supabase.from("memorials").select("*").eq("invite_code", inviteCode);
    if (data?.length) {
      setMemorial(data[0]);
      loadStories(data[0].id, data[0].require_approval);
    }
    setLoading(false);
  };

  const loadStories = async (memorialId, requireApproval) => {
    let query = supabase.from("contributions").select("*").eq("memorial_id", memorialId).order("created_at", { ascending: false });
    if (requireApproval) query = query.eq("status", "approved");
    const { data } = await query;
    setStories(data || []);
  };

  const handleMediaSelect = async (file) => {
    if (!file) return;
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
      timerRef.current = setInterval(() => setRecordDuration((d) => d + 1), 1000);
    } catch { showToast("Please allow microphone access to record.", "error"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
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
        const { data: uploadData } = await supabase.storage.from("memorial-media").upload(path, mediaFile);
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("memorial-media").getPublicUrl(path);
          mediaUrl = urlData?.publicUrl;
        }
      }

      if (contributeType === "voice" && audioURL) {
        const resp = await fetch(audioURL);
        const blob = await resp.blob();
        const path = `contributions/${memorial.invite_code}/${uid()}.webm`;
        const { data: uploadData } = await supabase.storage.from("memorial-media").upload(path, blob, { contentType: "audio/webm" });
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("memorial-media").getPublicUrl(path);
          mediaUrl = urlData?.publicUrl;
        }
      }

      await supabase.from("contributions").insert({
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: contributorRelation.trim() || null,
        contributor_email: contributorEmail.trim() || null,
        type: contributeType,
        text: storyText.trim() || null,
        media_url: mediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
      });

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

  return (
    <div className="memorial-page">
      <div className="memorial-hero">
        <div className="page-wrap">
          {memorial.photo_url && <img className="memorial-hero-photo" src={memorial.photo_url} alt={memorial.name} />}
          <h1 className="memorial-hero-name">{memorial.name}</h1>
          {(memorial.born || memorial.passed) && (
            <div className="memorial-hero-dates">
              {fmtDate(memorial.born)}{memorial.born && memorial.passed && " — "}{fmtDate(memorial.passed)}
            </div>
          )}
          {memorial.description && <p className="memorial-hero-desc">{memorial.description}</p>}
        </div>
      </div>

      <div className="memorial-content">
        {!submitted ? (
          <div className="contribute-card fade-up">
            <h2 className="contribute-title">Share a memory</h2>
            <p className="contribute-sub">What's your story? A moment, a habit, something they said — anything that captures who they really were.</p>
            {memorial.prompt && (
              <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: "var(--rust)", fontSize: 16, lineHeight: 1.5, marginBottom: 24 }}>
                "{memorial.prompt}"
              </p>
            )}

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
                  <textarea className="form-input" placeholder={memorial.prompt || `And then ${memorial.name.split(" ")[0]}...`} value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={5} />
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
            <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => setSubmitted(false)}>Share another memory</button>
          </div>
        )}

        {stories.length > 0 && (
          <div className="fade-up-2">
            <h2 className="stories-section-title">Stories & memories</h2>
            {stories.map((s) => <PublicStoryCard key={s.id} story={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PublicStoryCard({ story: s }) {
  const initials = (s.contributor_name || "?")[0].toUpperCase();
  return (
    <div className="public-story-card">
      <div className="public-story-header">
        <div className="avatar">{initials}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bark)" }}>{s.contributor_name}</div>
          {s.contributor_relation && <div style={{ fontSize: 11, color: "var(--warm-light)" }}>{s.contributor_relation}</div>}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--warm-light)" }}>{timeAgo(s.created_at)}</div>
      </div>
      {s.text && <p className="public-story-text">"{s.text}"</p>}
      {s.media_url && s.type === "photo" && <img src={s.media_url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 3, marginTop: 12 }} />}
      {s.media_url && s.type === "video" && <video controls src={s.media_url} style={{ width: "100%", marginTop: 12, borderRadius: 3 }} />}
      {s.media_url && s.type === "voice" && <audio controls src={s.media_url} style={{ width: "100%", marginTop: 12 }} />}
    </div>
  );
}
