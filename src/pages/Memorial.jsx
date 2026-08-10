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

// Existing brand hues already used elsewhere on this page (rose/gold/sage
// from the memorial palette, plus the video/link tag colors) rather than
// inventing new ones — hashed per contributor via seedFor so the same
// person always lands on the same color, not a fresh random one per render.
const AVATAR_COLORS = ["#C1515A", "#B8863B", "#6E7F5C", "#33425E", "#4A3B66"];
const colorForContributor = (name) => AVATAR_COLORS[seedFor(name) % AVATAR_COLORS.length];
const initialsFor = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

const AVATAR_STACK_MAX = 5;

// Same overlapping-circle pattern as the homepage's preview-crowd, adapted
// to real contributor names (not the homepage's fixed JM/KL/DP example) and
// a per-contributor color instead of one flat avatar background.
function ContributorAvatars({ stories }) {
  const names = [...new Set(stories.map((s) => s.contributor_name).filter(Boolean))];
  const visible = names.slice(0, AVATAR_STACK_MAX);
  const overflow = names.length - visible.length;

  return (
    <div className="mem-avatar-stack">
      {visible.map((name) => (
        <span key={name} className="mem-avatar" style={{ background: colorForContributor(name) }} title={name}>
          {initialsFor(name)}
        </span>
      ))}
      {overflow > 0 && <span className="mem-avatar mem-avatar-overflow">+{overflow}</span>}
    </div>
  );
}

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

// Relationship-tailored, tense-aware question bank for the Share a Memory
// modal — ported verbatim (including gendered "she/her" phrasing) from the
// and-then-share-memory-modal.html prototype. Do not rewrite, shorten, or
// gender-neutralize this copy without checking with Staci first; the
// gendered pronouns are a known content gap carried over from the
// prototype, not an oversight.
const SHARE_QUESTION_BANK = {
  adult: {
    relationships: [
      { id: "child", label: "Her child" },
      { id: "spouse", label: "Her spouse" },
      { id: "friend", label: "A friend" },
      { id: "coworker", label: "A coworker" },
      { id: "grandchild", label: "Her grandchild" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        child: [
          "What's something she always says that you can still hear in her voice?",
          "What does she do that only a mom would do?",
          "What's something she's taught you without meaning to?",
        ],
        spouse: [
          "What's something about her most people don't get to see?",
          "What does she do that still makes you fall for her?",
          "What's your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"her\" thing she does?",
          "What do you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What's she like under pressure?",
          "What's something she does that makes the job better for everyone?",
        ],
        grandchild: [
          "What does she let you get away with?",
          "What's something at her house that's just hers?",
        ],
        other: [
          "What's a memory of her that makes you smile?",
          "What's something she says that sticks with you?",
          "What's a small habit of hers you think about?",
        ],
      },
      passed: {
        child: [
          "What's something she always said that you can still hear in her voice?",
          "What did she do that only a mom would do?",
          "What's something she taught you without meaning to?",
        ],
        spouse: [
          "What's something about her most people never got to see?",
          "What did she do that made you fall for her, looking back?",
          "What was your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"her\" thing she ever did?",
          "What did you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What was she like under pressure?",
          "What's something she did that made the job better for everyone?",
        ],
        grandchild: [
          "What did she let you get away with?",
          "What's something at her house that was just hers?",
        ],
        other: [
          "What's a memory of her that still makes you smile?",
          "What's something she said that stuck with you?",
          "What's a small habit of hers you still think about?",
        ],
      },
    },
    universal: [
      "Do you have a photo of her you keep coming back to?",
      "Is there a voicemail from her still sitting on your phone?",
      "Do you have a video of her that nobody else has seen?",
    ],
  },
  child: {
    relationships: [
      { id: "parent", label: "Her parent" },
      { id: "sibling", label: "Her sibling" },
      { id: "grandparent", label: "Her grandparent" },
      { id: "friend", label: "A friend" },
      { id: "teacher", label: "A teacher or coach" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        parent: [
          "What does she love more than anything right now?",
          "What makes her laugh the hardest?",
          "What's something she's learning to do?",
        ],
        sibling: [
          "What do you two always play together?",
          "What's she like to share a room with?",
        ],
        grandparent: [
          "What does she call you, or you call her?",
          "What's something she does that's just her?",
        ],
        friend: [
          "What do you two always do together?",
          "What's recess or lunch with her like?",
        ],
        teacher: [
          "What does she love learning about?",
          "What's she like in class or on the team?",
        ],
        other: [
          "What's a memory of her that makes you smile?",
          "What's something she does that's just her?",
        ],
      },
      passed: {
        parent: [
          "What did she love more than anything?",
          "What made her laugh the hardest?",
          "What was she learning to do?",
        ],
        sibling: [
          "What did you two always play together?",
          "What was she like to share a room with?",
        ],
        grandparent: [
          "What did she call you, or you call her?",
          "What was something she did that was just her?",
        ],
        friend: [
          "What did you two always do together?",
          "What was recess or lunch with her like?",
        ],
        teacher: [
          "What did she love learning about?",
          "What was she like in class or on the team?",
        ],
        other: [
          "What's a memory of her that makes you smile?",
          "What's something she said that was just her?",
        ],
      },
    },
    universal: [
      "Do you have a photo of her being completely herself?",
      "Do you have a video of her that nobody else has seen?",
      "Do you have something she made, drew, or wrote?",
    ],
  },
};

function ageInYears(dateStr) {
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// Silent, date-derived — never asked directly. See SHARE_QUESTION_BANK's
// header comment and the DO NOT list in the modal's build spec.
function deriveSubjectType(memorial) {
  if (!memorial.born) return "adult";
  return ageInYears(memorial.born) < 18 ? "child" : "adult";
}
function deriveLivingStatus(memorial) {
  return memorial.passed ? "passed" : "living";
}
function deriveModerationMode(memorial) {
  return memorial.require_approval ? "moderated" : "auto";
}

const shareRelationshipKey = (memorialId) => `andthen_share_relationship_${memorialId}`;

// A stored relationship only counts as valid if it's still one of the
// current subject type's relationship options — guards against a stale
// value from before a steward correction changed born/passed and flipped
// the derived subjectType out from under it.
function loadStoredRelationship(memorialId, subjectType, relationships) {
  const raw = localStorage.getItem(shareRelationshipKey(memorialId));
  if (!raw) return null;
  const [savedSubject, savedRel] = raw.split(":");
  if (savedSubject !== subjectType) return null;
  return relationships.some((r) => r.id === savedRel) ? savedRel : null;
}
function storeRelationship(memorialId, subjectType, relId) {
  localStorage.setItem(shareRelationshipKey(memorialId), `${subjectType}:${relId}`);
}

export function MemorialPage({ inviteCode, showToast, onNavigate }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [showContribute, setShowContribute] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [pendingScrollId, setPendingScrollId] = useState(null); // "See all memories" target, see the effect below

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

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

  const openContribute = () => setShowContribute(true);

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
      <nav className="memorial-topbar">
        <button type="button" className="memorial-topbar-logo" onClick={() => onNavigate?.("home")}>
          And Then<em>...</em>
        </button>
      </nav>
      <header className="scrapbook-hero">
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
            <>
              <ContributorAvatars stories={stories} />
              <div className="stat-line">
                <strong>{contributorCount}</strong> {contributorCount === 1 ? "person has" : "people have"} shared <strong>{stories.length}</strong> {stories.length === 1 ? "memory" : "memories"}
              </div>
            </>
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
        <ShareMemoryModal memorial={memorial} showToast={showToast} onClose={() => setShowContribute(false)} />
      )}
    </div>
  );
}

const SHARE_MAX_SECONDS = 60;

// Reject videos longer than the cap (read duration without uploading).
const shareVideoWithinCap = (file) =>
  new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration <= SHARE_MAX_SECONDS + 0.5); };
    v.onerror = () => resolve(true); // unreadable — let it through rather than block
    v.src = URL.createObjectURL(file);
  });

// "Share a memory" modal — orient-first choice, relationship-tailored and
// tense-aware questions (SHARE_QUESTION_BANK), and moderation-aware
// confirmation copy. Fully remounts each time it opens (see showContribute
// in MemorialPage), which is what gives the orient screen its "shown every
// fresh open" behavior for free.
function ShareMemoryModal({ memorial, showToast, onClose }) {
  const subjectType = deriveSubjectType(memorial);
  const livingStatus = deriveLivingStatus(memorial);
  const moderationMode = deriveModerationMode(memorial);
  const firstName = memorial.name.split(" ")[0];
  const relationships = SHARE_QUESTION_BANK[subjectType].relationships;
  const universal = SHARE_QUESTION_BANK[subjectType].universal;

  const [screen, setScreen] = useState("orient"); // orient | relationship | question | thanks
  const [relationship, setRelationship] = useState(null);
  const [freeform, setFreeform] = useState(false);
  const [question, setQuestion] = useState(null);
  const usedQuestions = useRef([]);

  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [attachment, setAttachment] = useState(null); // { kind: 'photo'|'video'|'voice'|'link', ... } | null
  const [avMode, setAvMode] = useState(null); // null | 'chooser' | 'recording'
  const [showCropAdjuster, setShowCropAdjuster] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const photoInputRef = useRef();
  const videoInputRef = useRef();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const maxTimerRef = useRef(null);

  const isMediaPrompt = !freeform && question && universal.includes(question);

  const pickQuestion = (relId) => {
    const bank = SHARE_QUESTION_BANK[subjectType].banks[livingStatus];
    const relBank = bank[relId] || bank[relationships[0].id];
    const pool = relBank.concat(universal);
    let available = pool.filter((q) => !usedQuestions.current.includes(q));
    if (!available.length) { usedQuestions.current = []; available = pool; }
    const q = available[Math.floor(Math.random() * available.length)];
    usedQuestions.current.push(q);
    setQuestion(q);
    setAnswerText("");
  };

  const goToQuestionScreen = (relId) => {
    setFreeform(false);
    pickQuestion(relId);
    setScreen("question");
  };

  const proceedToShare = () => {
    const stored = loadStoredRelationship(memorial.id, subjectType, relationships);
    if (stored) {
      setRelationship(stored);
      goToQuestionScreen(stored);
    } else {
      setScreen("relationship");
    }
  };

  const lookAround = () => {
    onClose();
    document.getElementById("archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseRelationship = (relId) => {
    setRelationship(relId);
    storeRelationship(memorial.id, subjectType, relId);
    goToQuestionScreen(relId);
  };

  const skipToFreewrite = () => {
    const relId = relationship || relationships[relationships.length - 1].id;
    setRelationship(relId);
    setFreeform(true);
    setAnswerText("");
    setScreen("question");
  };

  const addAnother = () => {
    setAnswerText("");
    setAttachment(null);
    setAvMode(null);
    setFreeform(false);
    pickQuestion(relationship || relationships[relationships.length - 1].id);
    setScreen("question");
  };

  const clearAttachment = () => { setAttachment(null); setAvMode(null); };

  const handlePhotoSelect = async (file) => {
    if (!file) return;
    const preview = await fileToDataURL(file);
    const cropPos = await detectCropPosition(file);
    setAttachment({ kind: "photo", file, preview, cropPos });
    setAvMode(null);
  };

  const handleVideoSelect = async (file) => {
    if (!file) return;
    if (!(await shareVideoWithinCap(file))) { showToast("Videos must be 60 seconds or less.", "error"); return; }
    const preview = await fileToDataURL(file);
    setAttachment({ kind: "video", file, preview });
    setAvMode(null);
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
        setAttachment({ kind: "voice", url: URL.createObjectURL(blob) });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration((d) => Math.min(d + 1, SHARE_MAX_SECONDS)), 1000);
      maxTimerRef.current = setTimeout(stopRecording, SHARE_MAX_SECONDS * 1000);
    } catch { showToast("Please allow microphone access to record.", "error"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
  };

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const openLinkInput = () => setAttachment({ kind: "link", url: "", preview: null, loading: false, error: "" });

  const fetchLinkPreview = async () => {
    setAttachment((a) => {
      if (a?.kind !== "link") return a;
      const url = a.url.trim();
      if (!url) return { ...a, preview: null, error: "" };
      let hostname;
      try {
        hostname = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return { ...a, preview: null, error: "That doesn't look like a valid URL." };
      }
      fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
        .then((res) => { if (!res.ok) throw new Error("preview failed"); return res.json(); })
        .then((data) => setAttachment((cur) => (cur?.kind === "link" ? { ...cur, preview: { ...data, hostname }, loading: false, error: "" } : cur)))
        .catch(() => setAttachment((cur) => (cur?.kind === "link" ? { ...cur, preview: null, loading: false, error: "Couldn't load a preview — you can still share the link." } : cur)));
      return { ...a, loading: true, error: "" };
    });
  };

  const hasValidAttachment = attachment && (attachment.kind !== "link" || attachment.url.trim());
  const canSubmit = answerText.trim() || hasValidAttachment;

  const handleSubmit = async () => {
    if (!contributorName.trim()) { showToast("Please enter your name.", "error"); return; }
    if (contributorEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contributorEmail.trim())) { showToast("That email doesn't look right.", "error"); return; }
    if (!canSubmit) { showToast("Please write something, or attach a photo, audio, video, or link.", "error"); return; }

    setSubmitting(true);
    try {
      let mediaUrl = null;
      let type = "story";
      let cropX = null, cropY = null;
      let linkMeta = null;

      if (attachment?.kind === "photo") {
        type = "photo";
        const path = `contributions/${memorial.invite_code}/${uid()}.${attachment.file.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, attachment.file);
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
        cropX = attachment.cropPos.x;
        cropY = attachment.cropPos.y;
      } else if (attachment?.kind === "video") {
        type = "video";
        const path = `contributions/${memorial.invite_code}/${uid()}.${attachment.file.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, attachment.file);
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      } else if (attachment?.kind === "voice") {
        type = "voice";
        const resp = await fetch(attachment.url);
        const blob = await resp.blob();
        const path = `contributions/${memorial.invite_code}/${uid()}.webm`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, blob, { contentType: "audio/webm" });
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      } else if (attachment?.kind === "link" && attachment.url.trim()) {
        type = "url";
        mediaUrl = attachment.preview?.image || null;
        linkMeta = {
          url: attachment.url.trim(),
          provider: attachment.preview?.provider || null,
          videoId: attachment.preview?.videoId || null,
          start: attachment.preview?.start ?? null,
          title: attachment.preview?.title || null,
          hostname: attachment.preview?.hostname || null,
        };
      }

      const relLabel = relationships.find((r) => r.id === relationship)?.label || null;

      const row = {
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: relLabel,
        contributor_email: contributorEmail.trim() || null,
        type,
        text: answerText.trim() || null,
        media_url: mediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
        crop_x: cropX,
        crop_y: cropY,
        link_meta: linkMeta,
      };

      if (memorial.require_approval) {
        // Pending rows are hidden from anonymous contributors by RLS, so we must
        // NOT ask for them back — a plain insert, or the insert itself is rejected.
        const { error } = await supabase.from("contributions").insert(row);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("contributions").insert(row).select("id");
        if (error) throw error;
        if (contributorEmail.trim()) sendThankYou(inserted?.[0]?.id);
      }

      notifyCreator(memorial.id);
      setScreen("thanks");
    } catch { showToast("Something went wrong. Please try again.", "error"); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="share-modal-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="share-modal" role="dialog" aria-label={`Share a memory of ${memorial.name}`}>
          <button type="button" className="share-modal-close" aria-label="Close" onClick={onClose}>&times;</button>

          {screen === "orient" && (
            <div>
              <div className="share-modal-eyebrow">SHARE A MEMORY OF {memorial.name.toUpperCase()}</div>
              <h2>Want to look around first?</h2>
              <div className="share-orient-actions">
                <button type="button" className="share-orient-btn" onClick={lookAround}>
                  <span className="title">Look around first</span>
                  <span className="sub">See what's already been shared before you add your own.</span>
                </button>
                <button type="button" className="share-orient-btn primary" onClick={proceedToShare}>
                  <span className="title">I'm ready to share</span>
                  <span className="sub">Jump straight into adding a memory.</span>
                </button>
              </div>
            </div>
          )}

          {screen === "relationship" && (
            <div>
              <div className="share-modal-eyebrow">SHARE A MEMORY OF {memorial.name.toUpperCase()}</div>
              <h2>{livingStatus === "living" ? `How do you know ${firstName}?` : `How did you know ${firstName}?`}</h2>
              <div className="share-rel-grid">
                {relationships.map((r) => (
                  <button key={r.id} type="button" className="share-rel-chip" onClick={() => chooseRelationship(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <span className="share-freewrite-link" onClick={skipToFreewrite}>I already know what I want to share &rarr;</span>
            </div>
          )}

          {screen === "question" && (
            <div>
              <div className="share-modal-eyebrow">
                SHARE A MEMORY OF {memorial.name.toUpperCase()}
                {!freeform && relationship && ` · AS ${relationships.find((r) => r.id === relationship)?.label.toUpperCase()}`}
              </div>

              {freeform ? (
                <p className="share-question-text" style={{ marginBottom: 16 }}>Share whatever you'd like — no prompt needed.</p>
              ) : (
                <div className="share-question-box">
                  <p className="share-question-text">{question}</p>
                  <span className="share-shuffle-link" onClick={() => pickQuestion(relationship)}>Give me a different question</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your name *</label>
                  <input className="form-input" placeholder="How you were known to them" value={contributorName} onChange={(e) => setContributorName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your email (optional)</label>
                  <input className="form-input" type="email" placeholder="So the family can say thank you" value={contributorEmail} onChange={(e) => setContributorEmail(e.target.value)} />
                </div>
              </div>

              <textarea
                className="form-input"
                placeholder={freeform ? "Type the memory here..." : (isMediaPrompt ? "Add the file below, or describe it here..." : "Type the memory here...")}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={5}
                style={{ marginBottom: 16 }}
              />

              {memorial.is_paid && (
                <ShareAttachRow
                  attachment={attachment}
                  avMode={avMode}
                  setAvMode={setAvMode}
                  recording={recording}
                  recordDuration={recordDuration}
                  spotlight={isMediaPrompt}
                  onPhotoClick={() => photoInputRef.current?.click()}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onVideoClick={() => videoInputRef.current?.click()}
                  onLinkClick={openLinkInput}
                  onLinkUrlChange={(url) => setAttachment((a) => ({ ...a, url, preview: null, error: "" }))}
                  onLinkBlur={fetchLinkPreview}
                  onAdjustCrop={() => setShowCropAdjuster(true)}
                  onRemove={clearAttachment}
                  fmtDuration={fmtDuration}
                />
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />
              <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleVideoSelect(e.target.files[0])} />

              <button className="btn btn-rust btn-lg share-submit-btn" onClick={handleSubmit} disabled={submitting} style={{ justifyContent: "center" }}>
                {submitting ? <><span className="spinner" /> Sharing...</> : "Share this memory"}
              </button>
              <span className="share-back-link" onClick={() => setScreen("relationship")}>&larr; choose a different relationship</span>
            </div>
          )}

          {screen === "thanks" && (
            <div>
              <div className="share-thanks-icon">&#10003;</div>
              <h2 style={{ textAlign: "center" }}>That's a great one.</h2>
              <p className="share-thanks-text">
                {moderationMode === "moderated"
                  ? `Thank you — ${firstName}'s family will see this soon.`
                  : `It's been added to ${firstName}'s page.`}{" "}
                Want to add another?
              </p>
              <div className="share-thanks-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Done for now</button>
                <button type="button" className="btn btn-rust" onClick={addAnother}>Add another</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rendered as a sibling of .share-modal-overlay, not nested inside it —
          same reasoning as CropAdjuster's original top-level placement: a
          completed fade/scale animation on an ancestor becomes a new
          containing block for position: fixed descendants. .fade-in here is
          opacity-only, but keeping this sibling avoids the whole class of bug. */}
      {attachment?.kind === "photo" && showCropAdjuster && (
        <CropAdjuster
          file={attachment.file}
          initialPos={attachment.cropPos}
          onCancel={() => setShowCropAdjuster(false)}
          onConfirm={(pos) => { setAttachment((a) => ({ ...a, cropPos: pos })); setShowCropAdjuster(false); }}
        />
      )}
    </>
  );
}

// The three attach options plus whatever in-progress or resolved state
// they're in (audio/video's own record-or-upload chooser, a photo/video
// preview with crop/remove, or the link URL field with its preview card).
// Split out of ShareMemoryModal purely to keep that component's question/
// screen JSX readable — it has no state of its own.
function ShareAttachRow({
  attachment, avMode, setAvMode, recording, recordDuration, spotlight,
  onPhotoClick, onStartRecording, onStopRecording, onVideoClick,
  onLinkClick, onLinkUrlChange, onLinkBlur, onAdjustCrop, onRemove, fmtDuration,
}) {
  if (attachment?.kind === "photo") {
    return (
      <div className="form-group">
        <div className="photo-preview-crop">
          <img src={attachment.preview} alt="" style={{ objectPosition: `${attachment.cropPos.x}% ${attachment.cropPos.y}%` }} />
          <button type="button" className="crop-adjust-btn" onClick={onAdjustCrop}>Adjust crop</button>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={onRemove}>Remove photo</button>
      </div>
    );
  }

  if (attachment?.kind === "video") {
    return (
      <div className="form-group">
        <video src={attachment.preview} controls style={{ width: "100%", maxHeight: 300, borderRadius: 4 }} />
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={onRemove}>Remove video</button>
      </div>
    );
  }

  if (attachment?.kind === "voice") {
    return (
      <div className="form-group">
        <audio controls src={attachment.url} style={{ width: "100%" }} />
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={onRemove}>Remove recording</button>
      </div>
    );
  }

  if (attachment?.kind === "link") {
    return (
      <div className="form-group">
        <label className="form-label">Link</label>
        <input
          className="form-input"
          type="url"
          autoFocus
          placeholder="Paste a YouTube link, or any URL"
          value={attachment.url}
          onChange={(e) => onLinkUrlChange(e.target.value)}
          onBlur={onLinkBlur}
        />
        {attachment.loading && <span className="form-hint">Loading preview&hellip;</span>}
        {attachment.error && <span className="form-error">{attachment.error}</span>}
        {attachment.preview && (
          <div className="link-preview-card">
            {attachment.preview.image ? (
              <img src={attachment.preview.image} alt="" className="link-preview-thumb" />
            ) : (
              <div className="link-preview-thumb link-preview-thumb-fallback">🔗</div>
            )}
            <div>
              <div className="link-preview-title">{attachment.preview.title || attachment.url.trim()}</div>
              <div className="link-preview-provider">{attachment.preview.provider === "youtube" ? "YouTube" : attachment.preview.hostname}</div>
            </div>
          </div>
        )}
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={onRemove}>Remove link</button>
      </div>
    );
  }

  if (avMode === "chooser") {
    return (
      <div className="share-attach-row">
        <button type="button" className="share-attach-btn" onClick={() => setAvMode("recording")}>&#127908; Record a voice memo</button>
        <button type="button" className="share-attach-btn" onClick={onVideoClick}>&#127916; Upload a video</button>
        <span className="share-back-link" style={{ marginTop: 0 }} onClick={() => setAvMode(null)}>Cancel</span>
      </div>
    );
  }

  if (avMode === "recording") {
    return (
      <div className="voice-recorder">
        {!recording ? (
          <button type="button" className="record-btn record-btn-idle" onClick={onStartRecording}>&#127908;</button>
        ) : (
          <>
            <button type="button" className="record-btn record-btn-recording" onClick={onStopRecording}>&#9209;</button>
            <div className="record-time">{fmtDuration(recordDuration)}</div>
          </>
        )}
        <div className="record-sub">{recording ? "Recording... tap to stop" : "Tap to start recording"}</div>
        {!recording && <span className="share-back-link" onClick={() => setAvMode(null)}>Cancel</span>}
      </div>
    );
  }

  return (
    <div className="share-attach-row">
      <button type="button" className={`share-attach-btn${spotlight ? " spotlight" : ""}`} onClick={onPhotoClick}>+ Add a photo</button>
      <button type="button" className={`share-attach-btn${spotlight ? " spotlight" : ""}`} onClick={() => setAvMode("chooser")}>+ Add audio or video</button>
      <button type="button" className="share-attach-btn" onClick={onLinkClick}>+ Add a link</button>
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

// "Featured memory" — a single random entry shown full-bleed above the
// grid, picked fresh on every page load (no per-visitor persistence, same
// experience every visit, per spec). Shared across every memorial page —
// driven entirely by that page's own stories, nothing Deb-specific.
//
// Session history is a simple array + pointer, not just a currentId: the
// left zone needs something to go back TO, and "forward always picks a
// fresh random entry" (not "redo") means going next after going back must
// discard whatever was ahead and push a new pick, same as browser history
// after a back-then-navigate.
function MemoryOfTheMoment({ stories, memorialName, onSeeAll }) {
  const [history, setHistory] = useState(() => [pickRandomMemoryId(stories, null)]);
  const [pointer, setPointer] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const currentId = history[pointer];
  const current = stories.find((s) => s.id === currentId) || stories[0];
  if (!current) return null;

  const relLabel = current.contributor_relation ? `${current.contributor_name}, ${current.contributor_relation}` : current.contributor_name;
  const canGoBack = pointer > 0;

  const handleNext = () => {
    const nextId = pickRandomMemoryId(stories, currentId);
    setHistory((h) => [...h.slice(0, pointer + 1), nextId]);
    setPointer((p) => p + 1);
    setCycleCount((c) => c + 1); // only forward navigations count toward the nudge
  };

  const handleBack = () => {
    if (!canGoBack) return;
    setPointer((p) => p - 1);
  };

  return (
    <section className="momo">
      <div className="momo-card-wrap">
        <div className="momo-card">
          <div className="momo-eyebrow">Featured memory</div>
          <MomoContent story={current} relLabel={relLabel} />
        </div>
        {canGoBack && (
          <button type="button" className="momo-zone momo-zone-left" onClick={handleBack} aria-label="Previous memory">
            <span className="momo-zone-hint">&lsaquo;</span>
          </button>
        )}
        <button type="button" className="momo-zone momo-zone-right" onClick={handleNext} aria-label="Next memory">
          <span className="momo-zone-hint">&rsaquo;</span>
        </button>
      </div>
      <a
        className="momo-see-all"
        href="#archive"
        onClick={(e) => { e.preventDefault(); onSeeAll(current.id); }}
      >
        See all memories
      </a>
      {/* Doesn't block the zones from continuing to work — just a nudge toward the archive. */}
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
