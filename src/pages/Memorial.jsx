import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, fmtTime, sendThankYou, notifyCreator } from "../lib/utils";

// Content-type filters, and the label shown on a grid tile / in the reader's
// type tag — one source of truth (contentTypeLabel) for both, since a filter
// bucket and a tile's own label need to agree on what something "is".
//
// photo/voice both carry an optional second-level `subtype` (see the
// contribution_subtype migration) that splits them further:
//   photo: subtype 'recipe' -> Recipe, else -> Photo
//   voice: subtype 'recording' -> Spoken story, else (incl. untagged
//     pre-migration rows) -> Voicemail
// video/story/url have no subtype and map straight across.
const FILTER_ORDER = ["all", "photo", "video", "voicemail", "spoken", "story", "recipe", "url"];
const FILTER_LABEL = { all: "Everything", photo: "Photos", video: "Videos", voicemail: "Voicemails", spoken: "Spoken stories", story: "Written stories", recipe: "Recipes", url: "Links" };

function contentTypeLabel(s) {
  if (s.type === "photo") return s.subtype === "recipe" ? "Recipe" : "Photo";
  if (s.type === "video") return "Video";
  if (s.type === "voice") return s.subtype === "recording" ? "Spoken story" : "Voicemail";
  if (s.type === "url") return "Link";
  // A story-type row can carry an attached photo (see the linked-entries
  // work) — treat it as a photo entry for label purposes, not "written
  // story" — the media (whatever it is) is always the primary content.
  if (s.type === "story" && s.media_url) return "Photo";
  return "Written story";
}

// activeFilter is one of FILTER_ORDER's keys; a story matches it based on
// type + subtype together, not a raw type === activeFilter check (that
// alone can't tell a photo from a recipe, or a voicemail from a spoken
// story).
function matchesFilter(s, filter) {
  if (filter === "all") return true;
  if (filter === "photo") return s.type === "photo" && s.subtype !== "recipe";
  if (filter === "recipe") return s.type === "photo" && s.subtype === "recipe";
  if (filter === "voicemail") return s.type === "voice" && s.subtype !== "recording";
  if (filter === "spoken") return s.type === "voice" && s.subtype === "recording";
  return s.type === filter; // video, story, url
}

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
    // Each universal prompt is tagged with the single media kind it's
    // fishing for — the question screen uses this to show only the one
    // relevant attach option (see questionMediaKind / QUESTION_MEDIA_KIND).
    universal: [
      { text: "Do you have a photo of her you keep coming back to?", kind: "photo" },
      { text: "Is there a voicemail from her still sitting on your phone?", kind: "voice" },
      { text: "Do you have a video of her that nobody else has seen?", kind: "video" },
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
    // "Something she made, drew, or wrote" is tagged 'photo' — a picture of
    // the object is the natural single-upload answer to that one.
    universal: [
      { text: "Do you have a photo of her being completely herself?", kind: "photo" },
      { text: "Do you have a video of her that nobody else has seen?", kind: "video" },
      { text: "Do you have something she made, drew, or wrote?", kind: "photo" },
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
  // Index into the full, unfiltered `stories` array — the reader always
  // navigates that full list regardless of activeFilter, so this is
  // deliberately independent state, not derived from the filtered view.
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

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
      .select("id, memorial_id, contributor_name, contributor_relation, type, subtype, text, media_url, secondary_media_url, status, created_at, crop_x, crop_y, link_meta")
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
      <h2 style={{ fontFamily: "Lora, serif", marginBottom: 12 }}>Page not found</h2>
      <p style={{ color: "var(--warm-light)" }}>This link may be invalid or the page may have been removed.</p>
    </div>
  );

  // A lapsed $10/yr renewal (see api/stripe-webhook.js's subscription
  // handler) pauses the page rather than deleting anything — everything's
  // still there the moment the payment method is fixed.
  if (memorial.paused) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <h2 style={{ fontFamily: "Lora, serif", marginBottom: 12 }}>{memorial.name}'s page is paused</h2>
      <p style={{ color: "var(--warm-light)" }}>Nothing has been lost — it'll be back as soon as the family's renewal payment goes through.</p>
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
              {stories.map((s, i) => (
                <MemoryTile
                  key={s.id}
                  story={s}
                  hidden={!matchesFilter(s, activeFilter)}
                  onOpen={() => setOpenIndex(i)}
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

      {openIndex !== null && (
        <MemoryReader
          stories={stories}
          index={openIndex}
          onNavigate={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
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
  const universalTexts = universal.map((u) => u.text);
  const universalKindMap = Object.fromEntries(universal.map((u) => [u.text, u.kind]));

  const [screen, setScreen] = useState("orient"); // orient | relationship | question | thanks
  const [relationship, setRelationship] = useState(null);
  const [freeform, setFreeform] = useState(false);
  const [question, setQuestion] = useState(null);
  const usedQuestions = useRef([]);

  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerMode, setAnswerMode] = useState("type"); // "type" | "record" — general/freeform questions only
  const [attachment, setAttachment] = useState(null); // { kind: 'photo'|'video'|'voice', ... } | null
  const [isRecipe, setIsRecipe] = useState(false); // photo attachment only — feeds subtype: 'recipe'
  const [avRecording, setAvRecording] = useState(false); // showing the inline recorder within the "type it out" attach row
  const [recordPhoto, setRecordPhoto] = useState(null); // { file, preview, cropPos } | null — "record it" mode's "Add a photo too"
  const [showCropAdjuster, setShowCropAdjuster] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const photoInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const avInputRef = useRef();
  const recordPhotoInputRef = useRef();

  // A question showing one of the three universal media prompts ("do you
  // have a photo/voicemail/video...") narrows the attach row to just that
  // one option; any other question (relationship-tailored or freeform) gets
  // the full type/record toggle and the general attach set. See the DO NOT
  // list in the build spec — the toggle must not appear on these three.
  const questionMediaKind = !freeform && question ? (universalKindMap[question] || null) : null;

  // Question changes (shuffle, a fresh relationship pick, freeform, "add
  // another") always reset the answer area — otherwise a leftover
  // photo/voice attachment from a different question's media kind could
  // stick around mismatched with the new question's single-option gating.
  const resetAnswerArea = () => {
    setAnswerText("");
    setAnswerMode("type");
    setAttachment(null);
    setIsRecipe(false);
    setAvRecording(false);
    setRecordPhoto(null);
  };

  const pickQuestion = (relId) => {
    const bank = SHARE_QUESTION_BANK[subjectType].banks[livingStatus];
    const relBank = bank[relId] || bank[relationships[0].id];
    const pool = relBank.concat(universalTexts);
    let available = pool.filter((q) => !usedQuestions.current.includes(q));
    if (!available.length) { usedQuestions.current = []; available = pool; }
    const q = available[Math.floor(Math.random() * available.length)];
    usedQuestions.current.push(q);
    setQuestion(q);
    resetAnswerArea();
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
    resetAnswerArea();
    setScreen("question");
  };

  const addAnother = () => {
    setFreeform(false);
    pickQuestion(relationship || relationships[relationships.length - 1].id);
    setScreen("question");
  };

  const clearAttachment = () => { setAttachment(null); setIsRecipe(false); setAvRecording(false); };

  const handlePhotoSelect = async (file) => {
    if (!file) return;
    const preview = await fileToDataURL(file);
    const cropPos = await detectCropPosition(file);
    setAttachment({ kind: "photo", file, preview, cropPos });
    setIsRecipe(false);
    setAvRecording(false);
  };

  const handleVideoSelect = async (file) => {
    if (!file) return;
    if (!(await shareVideoWithinCap(file))) { showToast("Videos must be 60 seconds or less.", "error"); return; }
    const preview = await fileToDataURL(file);
    setAttachment({ kind: "video", file, preview });
    setAvRecording(false);
  };

  // An uploaded audio FILE, not a live recording — keeps its real extension/
  // mime instead of forcing .webm, unlike the recorder's captured blob.
  const handleAudioFileSelect = async (file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    setAttachment({ kind: "voice", url: URL.createObjectURL(file), ext, mime: file.type || "audio/mpeg", subtype: "upload" });
    setAvRecording(false);
  };

  const handleAvSelect = async (file) => {
    if (!file) return;
    if (file.type.startsWith("audio/")) await handleAudioFileSelect(file);
    else await handleVideoSelect(file);
  };

  const handleRecordPhotoSelect = async (file) => {
    if (!file) return;
    const preview = await fileToDataURL(file);
    const cropPos = await detectCropPosition(file);
    setRecordPhoto({ file, preview, cropPos });
  };

  const hasValidAttachment = !!attachment;
  const canSubmit = answerText.trim() || hasValidAttachment;

  const handleSubmit = async () => {
    if (!contributorName.trim()) { showToast("Please enter your name.", "error"); return; }
    if (contributorEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contributorEmail.trim())) { showToast("That email doesn't look right.", "error"); return; }
    if (!canSubmit) { showToast("Please write something, or attach a photo, audio, or video.", "error"); return; }

    setSubmitting(true);
    try {
      let mediaUrl = null;
      let secondaryMediaUrl = null;
      let type = "story";
      let cropX = null, cropY = null;

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
        const path = `contributions/${memorial.invite_code}/${uid()}.${attachment.ext || "webm"}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, blob, { contentType: attachment.mime || "audio/webm" });
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      }

      // "Record it in your own voice" mode's optional "Add a photo too" —
      // the only case a contribution carries two media files.
      if (recordPhoto) {
        const path = `contributions/${memorial.invite_code}/${uid()}-secondary.${recordPhoto.file.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, recordPhoto.file);
        if (upErr) throw upErr;
        secondaryMediaUrl = supabase.storage.from("memorial-media").getPublicUrl(path).data?.publicUrl;
      }

      const relLabel = relationships.find((r) => r.id === relationship)?.label || null;
      const subtype = attachment?.kind === "voice" ? attachment.subtype || null
        : attachment?.kind === "photo" && isRecipe ? "recipe"
        : null;

      const row = {
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: relLabel,
        contributor_email: contributorEmail.trim() || null,
        type,
        subtype,
        text: answerText.trim() || null,
        media_url: mediaUrl,
        secondary_media_url: secondaryMediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
        crop_x: cropX,
        crop_y: cropY,
        link_meta: null,
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

              {/* Type/record toggle — general and freeform questions only,
                  never on the three media-specific universal prompts. Free
                  memorials collect written memories only (same gate as the
                  attach row below), so recording isn't offered there either. */}
              {questionMediaKind === null && memorial.is_paid && (
                <div className="share-mode-toggle">
                  <button type="button" className={answerMode === "type" ? "active" : ""} onClick={() => setAnswerMode("type")}>Type it out</button>
                  <button type="button" className={answerMode === "record" ? "active" : ""} onClick={() => setAnswerMode("record")}>Record it in your own voice</button>
                </div>
              )}

              {questionMediaKind === null && memorial.is_paid && answerMode === "record" ? (
                <>
                  <VoiceRecorder value={attachment} onChange={setAttachment} showToast={showToast} />
                  {memorial.is_paid && (
                    recordPhoto ? (
                      <div className="form-group">
                        <div className="photo-preview-crop">
                          <img src={recordPhoto.preview} alt="" style={{ objectPosition: `${recordPhoto.cropPos.x}% ${recordPhoto.cropPos.y}%` }} />
                        </div>
                        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setRecordPhoto(null)}>Remove photo</button>
                      </div>
                    ) : (
                      <div className="share-attach-row">
                        <button type="button" className="share-attach-btn" onClick={() => recordPhotoInputRef.current?.click()}>+ Add a photo too</button>
                      </div>
                    )
                  )}
                  <input ref={recordPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleRecordPhotoSelect(e.target.files[0])} />
                </>
              ) : (
                <>
                  <textarea
                    className="form-input share-answer-textarea"
                    placeholder={freeform ? "Type the memory here..." : (questionMediaKind ? "Add the file below, or describe it here..." : "Type the memory here...")}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                  />

                  {memorial.is_paid && (
                    <QuestionAttachOptions
                      kind={questionMediaKind}
                      attachment={attachment}
                      isRecipe={isRecipe}
                      onToggleRecipe={setIsRecipe}
                      avRecording={avRecording}
                      setAvRecording={setAvRecording}
                      showToast={showToast}
                      onAttachmentChange={setAttachment}
                      onPhotoClick={() => photoInputRef.current?.click()}
                      onVideoClick={() => videoInputRef.current?.click()}
                      onAudioClick={() => audioInputRef.current?.click()}
                      onAvClick={() => avInputRef.current?.click()}
                      onAdjustCrop={() => setShowCropAdjuster(true)}
                      onRemove={clearAttachment}
                    />
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />
                  <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => handleVideoSelect(e.target.files[0])} />
                  <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => handleAudioFileSelect(e.target.files[0])} />
                  <input ref={avInputRef} type="file" accept="audio/*,video/*" style={{ display: "none" }} onChange={(e) => handleAvSelect(e.target.files[0])} />
                </>
              )}

              <div className="share-signature-divider" />
              <div className="share-signature">
                <div className="share-signature-field">
                  <label htmlFor="share-signature-name">Your name</label>
                  <input id="share-signature-name" className="share-signature-input" placeholder="How you were known to them" value={contributorName} onChange={(e) => setContributorName(e.target.value)} />
                </div>
                <div className="share-signature-field">
                  <label htmlFor="share-signature-email">Email (optional)</label>
                  <input id="share-signature-email" className="share-signature-input" type="email" placeholder="So the family can say thank you" value={contributorEmail} onChange={(e) => setContributorEmail(e.target.value)} />
                </div>
              </div>

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

const fmtRecordDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Circular record button + live waveform + "Tap to start recording" ->
// "Recording... tap to stop" -> "Recorded — tap to re-record". Owns its own
// MediaRecorder/AnalyserNode; reports the finished take up as a plain
// { kind: 'voice', url, ext, mime } attachment via onChange, same shape a
// plain audio-file upload produces, so the caller's submit logic doesn't
// need to know which path produced it. Used both for the question screen's
// "Record it in your own voice" mode and the general attach row's inline
// "Record a voice memo" option.
function VoiceRecorder({ value, onChange, showToast }) {
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [analyser, setAnalyser] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const maxTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);

  const teardownAudio = () => {
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setAnalyser(null);
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    teardownAudio();
  };

  // Stop the mic/recorder if the modal (or just this component) unmounts
  // mid-recording — a shuffled question or a closed modal shouldn't leave
  // the microphone running.
  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
    clearTimeout(maxTimerRef.current);
    audioCtxRef.current?.close();
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const node = audioCtx.createAnalyser();
        node.fftSize = 64; // few bins — chunky bars suit this small a widget
        source.connect(node);
        setAnalyser(node);
      }

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onChange({ kind: "voice", url: URL.createObjectURL(blob), ext: "webm", mime: "audio/webm", subtype: "recording" });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration((d) => Math.min(d + 1, SHARE_MAX_SECONDS)), 1000);
      maxTimerRef.current = setTimeout(stop, SHARE_MAX_SECONDS * 1000);
    } catch { showToast("Please allow microphone access to record.", "error"); }
  };

  const label = recording
    ? "Recording... tap to stop"
    : value?.kind === "voice" ? "Recorded — tap to re-record" : "Tap to start recording";

  return (
    <div className="voice-recorder share-voice-recorder">
      <button
        type="button"
        className={`record-btn ${recording ? "record-btn-recording" : "record-btn-idle"}`}
        onClick={recording ? stop : start}
      >
        {recording ? <>&#9209;</> : <>&#127908;</>}
      </button>
      {recording && <LiveWaveform analyser={analyser} />}
      {recording && <div className="record-time">{fmtRecordDuration(recordDuration)}</div>}
      <div className="record-sub">{label}</div>
      {!recording && value?.kind === "voice" && (
        <audio controls src={value.url} style={{ width: "100%", marginTop: 8 }} />
      )}
    </div>
  );
}

// Reads the live mic input via AnalyserNode.getByteFrequencyData on every
// animation frame and writes bar heights straight to the DOM through refs —
// deliberately bypassing React state so a ~60fps visualization doesn't
// trigger a full re-render per frame.
function LiveWaveform({ analyser }) {
  const barsRef = useRef([]);
  const BAR_COUNT = 24;

  useEffect(() => {
    if (!analyser) return;
    let raf;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
    const draw = () => {
      analyser.getByteFrequencyData(data);
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        const v = data[i * step] || 0;
        el.style.height = `${4 + (v / 255) * 36}px`;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <div className="record-live-wave">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span key={i} ref={(el) => (barsRef.current[i] = el)} />
      ))}
    </div>
  );
}

// The attach row shown below the answer textarea in "type it out" mode.
// What it offers depends on `kind` (the current question's derived media
// kind, or null for a general/freeform question) — a media-specific
// question narrows this to its one matching upload option; a general
// question gets the full set. Once something's attached, its preview (and
// a way to remove it) replaces the option buttons regardless of kind.
function QuestionAttachOptions({
  kind, attachment, isRecipe, onToggleRecipe, avRecording, setAvRecording, showToast,
  onAttachmentChange, onPhotoClick, onVideoClick, onAudioClick, onAvClick,
  onAdjustCrop, onRemove,
}) {
  if (avRecording) {
    return (
      <div className="share-attach-row">
        <VoiceRecorder value={attachment} onChange={onAttachmentChange} showToast={showToast} />
        <span className="share-back-link" style={{ marginTop: 0 }} onClick={() => { setAvRecording(false); onRemove(); }}>Cancel</span>
      </div>
    );
  }

  if (attachment?.kind === "photo") {
    return (
      <div className="form-group">
        <div className="photo-preview-crop">
          <img src={attachment.preview} alt="" style={{ objectPosition: `${attachment.cropPos.x}% ${attachment.cropPos.y}%` }} />
          <button type="button" className="crop-adjust-btn" onClick={onAdjustCrop}>Adjust crop</button>
        </div>
        <label className="share-recipe-check">
          <input type="checkbox" checked={isRecipe} onChange={(e) => onToggleRecipe(e.target.checked)} />
          This is a recipe
        </label>
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

  if (kind === "voice") {
    return (
      <div className="share-attach-row">
        <button type="button" className="share-attach-btn spotlight" onClick={onAudioClick}>Upload an audio file</button>
      </div>
    );
  }
  if (kind === "photo") {
    return (
      <div className="share-attach-row">
        <button type="button" className="share-attach-btn spotlight" onClick={onPhotoClick}>Upload a photo</button>
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="share-attach-row">
        <button type="button" className="share-attach-btn spotlight" onClick={onVideoClick}>Upload a video</button>
      </div>
    );
  }

  return (
    <div className="share-attach-row">
      <button type="button" className="share-attach-btn" onClick={onPhotoClick}>+ Add a photo</button>
      <button type="button" className="share-attach-btn" onClick={() => setAvRecording(true)}>Record a voice memo</button>
      <button type="button" className="share-attach-btn" onClick={onAvClick}>Upload audio or video</button>
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

// One entry, one square tile, regardless of type — the whole point of the
// uniform grid. Every tile is now a plain, presentational preview (poster
// frame, static waveform, link badge) that opens the full-screen reader on
// click — nothing plays or expands inline in the grid anymore, since the
// reader shows the real thing at full size. A media entry with attached
// text still gets a story-flag in the bar and its caption on hover
// (desktop only, pure CSS — the old tap-to-reveal-then-tap-to-activate
// gate is gone along with inline activation, since a single tap now just
// opens the reader either way).
function MemoryTile({ story: s, hidden, onOpen }) {
  const relLabel = s.contributor_name || "Someone";
  const hasStory = !!s.media_url && !!s.text?.trim();
  const tileLabel = contentTypeLabel(s);

  return (
    <button
      type="button"
      data-memory-id={s.id}
      className={`mem-tile${hidden ? " hidden-card" : ""}`}
      onClick={onOpen}
    >
      <TileBody story={s} />
      {hasStory && (
        <div className="mem-tile-caption"><p>{s.text}</p></div>
      )}
      <div className="mem-tile-bar">
        <span className="mem-tile-type">{tileLabel}</span>
        {hasStory && <span className="mem-tile-flag" aria-hidden="true">&rdquo;</span>}
        <span className="mem-tile-meta">{relLabel}</span>
      </div>
    </button>
  );
}

// Guarded by media_url, not just type — a handful of real entries on
// production are tagged photo/video/voice but never finished uploading (a
// pre-existing data issue, not something to hide). Falling through to the
// plain-story render at the bottom shows their actual text instead of an
// empty media box.
function TileBody({ story: s }) {
  if ((s.type === "photo" || s.type === "story") && s.media_url) {
    return (
      <div className="mem-tile-body mem-tile-photo">
        <img src={s.media_url} alt="" loading="lazy" style={{ objectPosition: `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%` }} />
      </div>
    );
  }
  if (s.type === "video" && s.media_url) {
    return (
      <div className="mem-tile-body mem-tile-video">
        <video src={s.media_url} preload="metadata" muted playsInline />
        <div className="mem-tile-play" />
      </div>
    );
  }
  if (s.type === "voice" && s.media_url) return <TileVoice story={s} />;
  if (s.type === "url" && s.link_meta) return <TileUrl story={s} />;

  return (
    <div className="mem-tile-body mem-tile-story">
      {s.text ? <blockquote>{s.text}</blockquote> : null}
    </div>
  );
}

// Static waveform preview — same seeded bar-height pattern the reader's
// live-progress version uses, just with no playback/progress state here;
// the grid is a picture of the content, not a player (tapping the tile
// opens the full reader, where ReaderAudio does the actual playing). The
// play button and duration are purely a visual affordance so a voicemail
// tile reads as "tap to play" the same way a video tile's play button
// does — the audio element here only loads metadata for the duration
// text, it's never played from the grid.
function TileVoice({ story: s }) {
  const seed = seedFor(s.id);
  const [duration, setDuration] = useState(null);
  return (
    <div className="mem-tile-body mem-tile-voice">
      <audio
        preload="metadata"
        src={s.media_url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        style={{ display: "none" }}
      />
      <div className="mem-tile-voice-inner">
        <div className="mem-tile-play mem-tile-play-voice" aria-hidden="true" />
        <div className="mem-tile-wave">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} style={{ height: `${6 + Math.round(Math.abs(Math.sin(i * 0.7 + seed)) * 32)}px` }} />
          ))}
        </div>
        {duration != null && <span className="mem-tile-duration">{fmtTime(duration)}</span>}
      </div>
      {/* The optional photo from the Share modal's "Record it in your own
          voice" + "Add a photo too" — the only case a voice entry carries
          a second image alongside its waveform. */}
      {s.secondary_media_url && (
        <img className="mem-tile-voice-photo" src={s.secondary_media_url} alt="" loading="lazy" />
      )}
    </div>
  );
}

function TileUrl({ story: s }) {
  const meta = s.link_meta || {};
  const isYouTube = meta.provider === "youtube" && meta.videoId;
  return (
    <div className="mem-tile-body mem-tile-url">
      {isYouTube && <span className="mem-tile-yt-badge">YouTube</span>}
      {s.media_url ? <img src={s.media_url} alt="" loading="lazy" /> : <div className="mem-tile-url-fallback">🔗</div>}
      {isYouTube && <div className="mem-tile-play" />}
    </div>
  );
}

// Full-screen reader — opened from any grid tile (see MemoryTile's onOpen),
// always navigates the FULL, unfiltered `stories` list by index. The active
// grid filter has no bearing here at all: filtering only hides/shows grid
// tiles, per spec — "Memory X of Y" and prev/next always count against
// every memory on the page.
function MemoryReader({ stories, index, onNavigate, onClose }) {
  const story = stories[index];
  const canPrev = index > 0;
  const canNext = index < stories.length - 1;
  const touchStartRef = useRef(null);

  const goPrev = () => { if (index > 0) onNavigate(index - 1); };
  const goNext = () => { if (index < stories.length - 1) onNavigate(index + 1); };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, stories.length]);

  // Swipe left/right on touch devices, alongside the tap-target arrows —
  // a full-screen reader is exactly the kind of surface people expect to
  // swipe through. Only fires on a clearly horizontal gesture past a small
  // threshold, so it doesn't fight with vertically scrolling a long story
  // inside the card.
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  if (!story) return null;

  return (
    <>
      <div className="reader-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="reader-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button type="button" className="reader-close" aria-label="Close" onClick={onClose}>&times;</button>
          <div className="reader-count">Memory {index + 1} of {stories.length}</div>
          <ReaderMedia key={story.id} story={story} />
          {story.text && <blockquote className="reader-text">{story.text}</blockquote>}
          <div className="reader-meta">
            <div className="reader-credit">
              <strong>{story.contributor_name || "Someone"}</strong>{story.contributor_relation ? `, ${story.contributor_relation}` : ""}
              <span className="reader-credit-time">{timeAgo(story.created_at)}</span>
            </div>
            <div className="reader-type-tag">{contentTypeLabel(story)}</div>
          </div>
        </div>
      </div>

      {/* Fixed to the viewport, not the card, so they never overlap reader
          content — max()'d against the iOS safe-area insets so a notch/
          home-indicator device doesn't obscure or crowd them. */}
      <button
        type="button"
        className={`reader-nav prev${canPrev ? "" : " disabled"}`}
        aria-label="Previous memory"
        onClick={goPrev}
        disabled={!canPrev}
      >
        &lsaquo;
      </button>
      <button
        type="button"
        className={`reader-nav next${canNext ? "" : " disabled"}`}
        aria-label="Next memory"
        onClick={goNext}
        disabled={!canNext}
      >
        &rsaquo;
      </button>
    </>
  );
}

// Same per-type shell the grid tiles use, at full size — a real <img>/
// <video>/audio player/YouTube embed, not the mockup's decorative
// placeholder gradients (those stood in for images the prototype never
// had; every entry here has a real media_url).
function ReaderMedia({ story: s }) {
  if (s.type === "video" && s.media_url) {
    return (
      <div className="reader-media video">
        <video src={s.media_url} controls playsInline />
      </div>
    );
  }
  if (s.type === "voice" && s.media_url) {
    const isSpoken = s.subtype === "recording";
    return (
      <div className={`reader-media ${isSpoken ? "spoken" : "voicemail"}`}>
        <ReaderAudio story={s} />
      </div>
    );
  }
  if (s.type === "url" && s.link_meta) {
    return (
      <div className="reader-media link">
        <ReaderLink story={s} />
      </div>
    );
  }
  if (s.media_url) {
    // Photo (incl. a recipe scan) or a story-type row with an attached photo.
    const isRecipe = s.type === "photo" && s.subtype === "recipe";
    const objectPosition = `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%`;
    return (
      <div className={`reader-media ${isRecipe ? "recipe" : "photo"}`}>
        <img src={s.media_url} alt="" style={{ objectPosition }} />
      </div>
    );
  }
  return null; // plain written story — no media area at all
}

// Real playback + progress waveform, reusing the same global voice-*/
// icon-play/icon-pause classes as everywhere else audio plays in this app
// (already styled for a dark background, which every reader-media variant
// this renders inside of already is).
function ReaderAudio({ story: s }) {
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
    <div className="reader-audio">
      <audio
        ref={audioRef}
        src={s.media_url}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => setElapsed(e.target.currentTime)}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
      />
      <div className="voice-controls">
        <button type="button" className="voice-play-btn reader-play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <span className="icon-pause" /> : <span className="icon-play" />}
        </button>
        <div className="voice-waveform reader-waveform">
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

// Same expand-inline-for-YouTube / open-new-tab-otherwise behavior as the
// grid tile's TileUrl.
function ReaderLink({ story: s }) {
  const [expanded, setExpanded] = useState(false);
  const meta = s.link_meta || {};
  const isYouTube = meta.provider === "youtube" && meta.videoId;

  if (expanded && isYouTube) {
    return (
      <div className="reader-link-embed">
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
      className="reader-link"
      onClick={() => (isYouTube ? setExpanded(true) : window.open(meta.url, "_blank", "noopener,noreferrer"))}
    >
      {isYouTube && <span className="reader-yt-badge">YouTube</span>}
      {s.media_url ? <img src={s.media_url} alt="" /> : <div className="reader-link-fallback">🔗</div>}
      <div className="reader-play" />
    </button>
  );
}
