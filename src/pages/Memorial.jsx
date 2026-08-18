import { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, fmtTime, sendThankYou, notifyCreator, notifyAccessRequest } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { CropAdjuster, coverSize, detectCropPosition, clamp } from "../components/CropAdjuster";

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

// "Five memories included, free" — the number of memories a free-tier
// memorial can hold before its owner has to upgrade to add more or invite
// anyone else. Mirrored server-side in the contributions INSERT policy
// (20260812_free_tier_limit.sql) — keep both in sync if this ever changes.
const FREE_MEMORY_LIMIT = 5;

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

// Relationship-tailored, tense-aware question bank for the Share a Memory
// modal. Uses gender-neutral "they/their/theirs" throughout — a memorial's
// subject isn't necessarily female, and a memorial page has no gender field
// to key off of, so singular "they" is the only phrasing that's correct for
// every memorial.
const SHARE_QUESTION_BANK = {
  adult: {
    relationships: [
      { id: "child", label: "Their child" },
      { id: "spouse", label: "Their spouse" },
      { id: "friend", label: "A friend" },
      { id: "coworker", label: "A coworker" },
      { id: "grandchild", label: "Their grandchild" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        child: [
          "What's something they always say that you can still hear in their voice?",
          "What do they do that only a parent would do?",
          "What's something they've taught you without meaning to?",
        ],
        spouse: [
          "What's something about them most people don't get to see?",
          "What do they do that still makes you fall for them?",
          "What's your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"them\" thing they do?",
          "What do you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What are they like under pressure?",
          "What's something they do that makes the job better for everyone?",
        ],
        grandchild: [
          "What do they let you get away with?",
          "What's something at their house that's just theirs?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they say that sticks with you?",
          "What's a small habit of theirs you think about?",
        ],
      },
      passed: {
        child: [
          "What's something they always said that you can still hear in their voice?",
          "What did they do that only a parent would do?",
          "What's something they taught you without meaning to?",
        ],
        spouse: [
          "What's something about them most people never got to see?",
          "What did they do that made you fall for them, looking back?",
          "What was your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"them\" thing they ever did?",
          "What did you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What were they like under pressure?",
          "What's something they did that made the job better for everyone?",
        ],
        grandchild: [
          "What did they let you get away with?",
          "What's something at their house that was just theirs?",
        ],
        other: [
          "What's a memory of them that still makes you smile?",
          "What's something they said that stuck with you?",
          "What's a small habit of theirs you still think about?",
        ],
      },
    },
    // Each universal prompt is tagged with the single media kind it's
    // fishing for — the question screen uses this to show only the one
    // relevant attach option (see questionMediaKind / QUESTION_MEDIA_KIND).
    universal: [
      { text: "Do you have a photo of them you keep coming back to?", kind: "photo" },
      { text: "Is there a voicemail from them still sitting on your phone?", kind: "voice" },
      { text: "Do you have a video of them that nobody else has seen?", kind: "video" },
    ],
  },
  child: {
    relationships: [
      { id: "parent", label: "Their parent" },
      { id: "sibling", label: "Their sibling" },
      { id: "grandparent", label: "Their grandparent" },
      { id: "friend", label: "A friend" },
      { id: "teacher", label: "A teacher or coach" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        parent: [
          "What do they love more than anything right now?",
          "What makes them laugh the hardest?",
          "What's something they're learning to do?",
        ],
        sibling: [
          "What do you two always play together?",
          "What are they like to share a room with?",
        ],
        grandparent: [
          "What do they call you, or you call them?",
          "What's something they do that's just them?",
        ],
        friend: [
          "What do you two always do together?",
          "What's recess or lunch with them like?",
        ],
        teacher: [
          "What do they love learning about?",
          "What are they like in class or on the team?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they do that's just them?",
        ],
      },
      passed: {
        parent: [
          "What did they love more than anything?",
          "What made them laugh the hardest?",
          "What were they learning to do?",
        ],
        sibling: [
          "What did you two always play together?",
          "What were they like to share a room with?",
        ],
        grandparent: [
          "What did they call you, or you call them?",
          "What was something they did that was just them?",
        ],
        friend: [
          "What did you two always do together?",
          "What was recess or lunch with them like?",
        ],
        teacher: [
          "What did they love learning about?",
          "What were they like in class or on the team?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they said that was just them?",
        ],
      },
    },
    // "Something they made, drew, or wrote" is tagged 'photo' — a picture of
    // the object is the natural single-upload answer to that one.
    universal: [
      { text: "Do you have a photo of them being completely themselves?", kind: "photo" },
      { text: "Do you have a video of them that nobody else has seen?", kind: "video" },
      { text: "Do you have something they made, drew, or wrote?", kind: "photo" },
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

export function MemorialPage({ inviteCode, showToast, onNavigate, currentUser }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [showContribute, setShowContribute] = useState(false);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  // Whether the visit resolved via the invite_code column (the "valid
  // invite" link) vs. the vanity slug column — see canContribute below.
  const [arrivedViaCode, setArrivedViaCode] = useState(false);
  // A ?token= from an approved access request. null while unchecked, then
  // true/false once validated against access_requests — an invalid/missing/
  // expired token just resolves false rather than blocking anything.
  const [tokenValid, setTokenValid] = useState(false);
  const contributeToken = new URLSearchParams(window.location.search).get("token");
  // Index into the full, unfiltered `stories` array — the reader always
  // navigates that full list regardless of activeFilter, so this is
  // deliberately independent state, not derived from the filtered view.
  const [openIndex, setOpenIndex] = useState(null);
  // How many non-rejected memories a free-tier memorial already has — only
  // loaded (and only relevant) for the owner on an unpaid page, since that's
  // the only visitor who can contribute there at all. Deliberately a
  // separate count-only query rather than derived from `stories`, which is
  // filtered to approved-only when moderation is on and would undercount
  // pending items against the server's own (unfiltered) RLS check.
  const [freeContributionCount, setFreeContributionCount] = useState(0);

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

  useEffect(() => {
    if (!contributeToken || !memorial) return;
    // Anon-safe: only id/memorial_id/contribute_token/status are readable
    // for an approved row (see the access_requests RLS policy) — no match
    // just leaves tokenValid false.
    supabase
      .from("access_requests")
      .select("id, memorial_id, status")
      .eq("contribute_token", contributeToken)
      .eq("memorial_id", memorial.id)
      .eq("status", "approved")
      .then(({ data }) => setTokenValid(!!data?.length));
  }, [contributeToken, memorial?.id]);

  const isOwner = !!(currentUser && memorial?.steward_id === currentUser.id);

  useEffect(() => {
    if (!memorial || memorial.is_paid || !isOwner) return;
    // Covered by the "stewards see their memories" SELECT policy, so this
    // sees pending items too, not just approved ones.
    supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("memorial_id", memorial.id)
      .neq("status", "rejected")
      .then(({ count }) => setFreeContributionCount(count || 0));
  }, [memorial?.id, memorial?.is_paid, isOwner]);

  const openContribute = () => setShowContribute(true);

  const loadMemorial = async () => {
    setLoading(true);
    // The URL param may be the invite code (?memorial=<code>) or a custom
    // vanity slug (myandthen.com/<slug>) — try both rather than building a
    // filter string out of raw URL input. Which column actually matched is
    // also the signal for "did this visitor arrive via a valid invite" —
    // simpler and more robust than inferring it from URL shape, since a raw
    // path segment and a query param can both resolve to either column.
    let { data } = await supabase.from("memorials").select("*").eq("invite_code", inviteCode);
    let viaCode = true;
    if (!data?.length) { ({ data } = await supabase.from("memorials").select("*").eq("slug", inviteCode)); viaCode = false; }
    if (data?.length) {
      setMemorial(data[0]);
      setArrivedViaCode(viaCode);
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

  // Paid pages: unchanged from before — public pages, anyone with the
  // invite_code link, anyone carrying a valid approved-request token, and
  // the steward (previewing their own page) can all add a memory; everyone
  // else gets the ask-for-access flow. Free pages: access_mode/token/invite
  // don't matter at all — only the steward can contribute, and only up to
  // FREE_MEMORY_LIMIT, so the page genuinely can't be shared beyond them
  // until it's paid for (also enforced server-side, not just here — see
  // 20260812_free_tier_limit.sql). Viewing is never gated either way.
  const canContribute = memorial.is_paid
    ? (memorial.access_mode !== "invite_only" || arrivedViaCode || tokenValid || isOwner)
    : (isOwner && freeContributionCount < FREE_MEMORY_LIMIT);

  // Drives both CTA spots (hero + footer) from one place instead of
  // duplicating the same ladder twice.
  //   share:       normal ShareMemoryModal flow
  //   ask:         paid + invite_only + no access — AccessRequestModal flow
  //   owner-limit: free tier, owner, hit the cap — nudge toward Pricing
  //   free-locked: free tier, not the owner — nothing to click at all
  const contributeState = canContribute
    ? "share"
    : memorial.is_paid
      ? "ask"
      : isOwner
        ? "owner-limit"
        : "free-locked";

  // Shared between the hero and footer CTA spots so the label/action ladder
  // only lives in one place. No entry for "free-locked" — that state has
  // nothing to click, by design.
  const ctaLabel = { share: "Add Your Memory", ask: "Ask to add a memory", "owner-limit": "Upgrade to add more" }[contributeState];
  const ctaOnClick = { share: openContribute, ask: () => setShowRequestAccess(true), "owner-limit": () => onNavigate?.("pricing") }[contributeState];

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
          <em>And Then...</em>
        </button>
      </nav>
      <header className="scrapbook-hero">
        {memorial.photo_url ? (
          <div className="hero-banner">
            <img
              src={memorial.photo_url}
              alt={memorial.name}
              style={{ objectPosition: `${memorial.crop_x ?? 50}% ${memorial.crop_y ?? 50}%` }}
            />
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
          {/* A visible-without-scrolling entry point — previously "Add Your
              Memory" only existed in the footer, past the entire grid, which
              meant a locked-out visitor had no way to see the ask-for-access
              option without scrolling past everything first. */}
          {ctaLabel ? (
            <button type="button" className="hero-cta" onClick={ctaOnClick}>{ctaLabel}</button>
          ) : (
            <p className="hero-cta-note">This page isn't open for contributions yet — check back soon.</p>
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
        {ctaLabel ? (
          <button className="add-btn" onClick={ctaOnClick}>{ctaLabel}</button>
        ) : (
          <p className="hero-cta-note">This page isn't open for contributions yet — check back soon.</p>
        )}
        <p className="note">
          {contributeState === "share" && !memorial.is_paid
            ? <>This page is still on the free plan — only you can add memories to it right now (up to {FREE_MEMORY_LIMIT}). Upgrade anytime to invite others.</>
            : contributeState === "share"
              ? <>This page keeps growing &mdash; anyone who knew {memorial.name.split(" ")[0]} can add a photo, story, voice memo, or video, anytime.</>
              : contributeState === "ask"
                ? <>This page keeps growing, one invited memory at a time. Don't have the invite link? Ask {memorial.name.split(" ")[0]}'s family for access.</>
                : contributeState === "owner-limit"
                  ? <>You've added the {FREE_MEMORY_LIMIT} memories included free. Upgrade to add more, and invite others to help gather memories too.</>
                  : <>This page isn't open to contributions yet.</>}
        </p>
      </footer>

      {showContribute && (
        <ShareMemoryModal
          memorial={memorial}
          showToast={showToast}
          onClose={() => setShowContribute(false)}
          contributeToken={tokenValid ? contributeToken : null}
        />
      )}

      {showRequestAccess && (
        <AccessRequestModal memorial={memorial} showToast={showToast} onClose={() => setShowRequestAccess(false)} />
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

// Below this, a phone video's raw size is dominated by resolution/bitrate
// choices the source device made, not content — worth re-encoding smaller
// before a slow upload. Above it, re-encoding a already-small file just
// burns the contributor's battery for no real gain.
const VIDEO_COMPRESS_THRESHOLD_BYTES = 12 * 1024 * 1024;
const VIDEO_COMPRESS_MAX_WIDTH = 960;
const VIDEO_COMPRESS_BITRATE = 2_000_000;

const canCompressVideo = () =>
  typeof MediaRecorder !== "undefined" &&
  typeof HTMLVideoElement !== "undefined" &&
  typeof HTMLVideoElement.prototype.captureStream === "function" &&
  (MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9,opus") || MediaRecorder.isTypeSupported?.("video/webm;codecs=vp8,opus"));

// Re-encodes an oversized video to a capped resolution/bitrate by playing it
// muted and redrawing each frame to a smaller canvas while MediaRecorder
// captures that canvas's stream plus the source's own audio track. This
// takes roughly the video's real duration to run (it plays through once),
// which is why it's gated to the 60s share cap and to files worth the
// trouble. Never throws — any failure (unsupported browser, decode error,
// output that isn't actually smaller) falls back to the original file so
// compression can never be the reason an upload doesn't happen.
const compressVideo = (file, onProgress) => new Promise((resolve) => {
  if (file.size < VIDEO_COMPRESS_THRESHOLD_BYTES || !canCompressVideo()) { resolve(file); return; }

  const cleanupFns = [];
  const cleanup = () => cleanupFns.forEach((fn) => fn());
  const fallback = () => { cleanup(); resolve(file); };

  try {
    const url = URL.createObjectURL(file);
    cleanupFns.push(() => URL.revokeObjectURL(url));
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onerror = fallback;
    video.onloadedmetadata = async () => {
      const scale = Math.min(1, VIDEO_COMPRESS_MAX_WIDTH / video.videoWidth);
      if (scale >= 1) { fallback(); return; } // already small enough resolution-wise

      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");

        const audioTracks = video.captureStream().getAudioTracks();
        const combined = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioTracks]);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm;codecs=vp8,opus";
        const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: VIDEO_COMPRESS_BITRATE });
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

        let raf;
        const draw = () => { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); raf = requestAnimationFrame(draw); };
        cleanupFns.push(() => cancelAnimationFrame(raf));

        recorder.onstop = () => {
          cleanup();
          const blob = new Blob(chunks, { type: "video/webm" });
          if (!blob.size || blob.size >= file.size) { resolve(file); return; } // re-encode didn't help
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", { type: "video/webm" }));
        };

        video.ontimeupdate = () => { if (onProgress && video.duration) onProgress(video.currentTime / video.duration); };
        video.onended = () => recorder.state !== "inactive" && recorder.stop();

        recorder.start();
        draw();
        await video.play();
      } catch { fallback(); }
    };
  } catch { fallback(); }
});

// Seeks the (already-compressed) video to a point past any lead-in black
// frame and grabs it as a jpeg, so a video tile never opens on a blank
// frame. Returns null rather than throwing on any failure — a missing
// poster just means the tile falls back to showing nothing until played,
// same as before this existed.
const SHARE_POSTER_SEEK_RATIO = 0.15;
const generateVideoPoster = (file, seekSeconds) => new Promise((resolve) => {
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (result) => { URL.revokeObjectURL(url); resolve(result); };

    video.onerror = () => done(null);
    video.onloadedmetadata = () => {
      const t = seekSeconds != null ? seekSeconds : Math.min(video.duration * SHARE_POSTER_SEEK_RATIO, Math.max(0, video.duration - 0.1));
      video.currentTime = Math.max(0, t);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob((blob) => done(blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.85);
      } catch { done(null); }
    };
    video.src = url;
  } catch { resolve(null); }
});

// supabase-js's storage.upload() has no progress callback (it's a plain
// fetch under the hood), so a large video upload just spins with no
// feedback. This hits the same Storage REST endpoint directly via XHR,
// which does expose upload progress — used only for the video path, where
// the wait is long enough to need it.
const uploadFileWithProgress = async (bucket, path, file, contentType, onProgress) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, true);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl;
};

// "Share a memory" modal — orient-first choice, relationship-tailored and
// tense-aware questions (SHARE_QUESTION_BANK), and moderation-aware
// confirmation copy. Fully remounts each time it opens (see showContribute
// in MemorialPage), which is what gives the orient screen its "shown every
// fresh open" behavior for free.
export function ShareMemoryModal({ memorial, showToast, onClose, contributeToken }) {
  const subjectType = deriveSubjectType(memorial);
  const livingStatus = deriveLivingStatus(memorial);
  const moderationMode = deriveModerationMode(memorial);
  const firstName = memorial.name.split(" ")[0];
  const relationships = SHARE_QUESTION_BANK[subjectType].relationships;
  const universal = SHARE_QUESTION_BANK[subjectType].universal;
  const universalTexts = universal.map((u) => u.text);
  const universalKindMap = Object.fromEntries(universal.map((u) => [u.text, u.kind]));

  const [screen, setScreen] = useState("orient"); // orient | fork | relationship | questionList | question | thanks
  const [relationship, setRelationship] = useState(null);
  const [freeform, setFreeform] = useState(false);
  const [question, setQuestion] = useState(null);

  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [answerMode, setAnswerMode] = useState("type"); // "type" | "record" — general/freeform questions only
  const [attachment, setAttachment] = useState(null); // { kind: 'photo'|'video'|'voice'|'link', ... } | null
  const [isRecipe, setIsRecipe] = useState(false); // photo attachment only — feeds subtype: 'recipe'
  const [avRecording, setAvRecording] = useState(false); // showing the inline recorder within the "type it out" attach row
  const [recordPhoto, setRecordPhoto] = useState(null); // { file, preview, cropPos } | null — "record it" mode's "Add a photo too"
  const [showCropAdjuster, setShowCropAdjuster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressingVideo, setCompressingVideo] = useState(false); // re-encoding an oversized video before it becomes the attachment
  const [uploadProgress, setUploadProgress] = useState(null); // 0-1 while the video's main file is uploading, else null

  const photoInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const avInputRef = useRef();
  const recordPhotoInputRef = useRef();
  const videoPreviewRef = useRef(); // the <video> shown in the attach row, so "use this frame" can read its scrub position

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

  // Replaces the old random shuffle entirely — the list itself is derived
  // at render time (see screen === "questionList" below) from `relationship`
  // + subjectType/livingStatus, so there's nothing to compute or store here.
  const goToQuestionListScreen = () => {
    setFreeform(false);
    setScreen("questionList");
  };

  const chooseQuestion = (q) => {
    setQuestion(q);
    resetAnswerArea();
    setScreen("question");
  };

  const proceedToShare = () => {
    const stored = loadStoredRelationship(memorial.id, subjectType, relationships);
    if (stored) {
      setRelationship(stored);
      goToQuestionListScreen();
    } else {
      setScreen("fork");
    }
  };

  const lookAround = () => {
    onClose();
    document.getElementById("archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseRelationship = (relId) => {
    setRelationship(relId);
    storeRelationship(memorial.id, subjectType, relId);
    goToQuestionListScreen();
  };

  const skipToFreewrite = () => {
    const relId = relationship || relationships[relationships.length - 1].id;
    setRelationship(relId);
    setFreeform(true);
    resetAnswerArea();
    setScreen("question");
  };

  // From the thanks screen's "Add another" — lands on the question list
  // rather than auto-picking, same reasoning as goToQuestionListScreen:
  // there's no more "random question" concept to jump to.
  const addAnother = () => {
    setRelationship((r) => r || relationships[relationships.length - 1].id);
    goToQuestionListScreen();
  };

  const clearAttachment = () => { setAttachment(null); setIsRecipe(false); setAvRecording(false); setCompressingVideo(false); };

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
    setAvRecording(false);
    setCompressingVideo(true);
    const finalFile = await compressVideo(file);
    const poster = await generateVideoPoster(finalFile);
    setCompressingVideo(false);
    setAttachment({
      kind: "video",
      file: finalFile,
      preview: URL.createObjectURL(finalFile),
      posterFile: poster,
      posterPreview: poster ? URL.createObjectURL(poster) : null,
    });
  };

  // Regenerates the poster from wherever the contributor has scrubbed the
  // preview video to — the "or allow users to choose a still frame" half of
  // the ask, without needing a separate scrubber UI.
  const useCurrentFrameAsPoster = async () => {
    if (!attachment || attachment.kind !== "video" || !videoPreviewRef.current) return;
    const t = videoPreviewRef.current.currentTime;
    const poster = await generateVideoPoster(attachment.file, t);
    if (!poster) { showToast("Couldn't capture that frame. Try a different spot.", "error"); return; }
    setAttachment((prev) => (prev?.kind === "video" ? { ...prev, posterFile: poster, posterPreview: URL.createObjectURL(poster) } : prev));
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

  const openLinkInput = () => setAttachment({ kind: "link", url: "", preview: null, loading: false, error: "" });

  // Preview fetch runs on blur, not keystroke — same as the pre-modal-redesign
  // build this restores. A failed fetch still lets the link be shared
  // (handleSubmit falls back to the bare url as the title).
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

  const handleRecordPhotoSelect = async (file) => {
    if (!file) return;
    const preview = await fileToDataURL(file);
    const cropPos = await detectCropPosition(file);
    setRecordPhoto({ file, preview, cropPos });
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
      let secondaryMediaUrl = null;
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
        const id = uid();
        const path = `contributions/${memorial.invite_code}/${id}.${attachment.file.name.split(".").pop()}`;
        setUploadProgress(0);
        mediaUrl = await uploadFileWithProgress("memorial-media", path, attachment.file, attachment.file.type || "video/mp4", setUploadProgress);
        setUploadProgress(null);
        if (attachment.posterFile) {
          const posterPath = `contributions/${memorial.invite_code}/${id}-poster.jpg`;
          const { error: posterErr } = await supabase.storage.from("memorial-media").upload(posterPath, attachment.posterFile);
          if (!posterErr) secondaryMediaUrl = supabase.storage.from("memorial-media").getPublicUrl(posterPath).data?.publicUrl;
        }
      } else if (attachment?.kind === "voice") {
        type = "voice";
        const resp = await fetch(attachment.url);
        const blob = await resp.blob();
        const path = `contributions/${memorial.invite_code}/${uid()}.${attachment.ext || "webm"}`;
        const { error: upErr } = await supabase.storage.from("memorial-media").upload(path, blob, { contentType: attachment.mime || "audio/webm" });
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

      // "Record it in your own voice" mode's optional "Add a photo too" — the
      // other case (besides a video's poster frame, set above) where a
      // contribution carries two media files via secondary_media_url.
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
      trackEvent("memory_submitted", { content_type: contentTypeLabel(row) });
      // Reusable, so this is pure record-keeping (first-use timestamp), not
      // a gate — only set it if it isn't already, and don't block the
      // contribution on it either way.
      if (contributeToken) {
        supabase.from("access_requests").update({ token_used_at: new Date().toISOString() })
          .eq("contribute_token", contributeToken).is("token_used_at", null).then(() => {});
      }
      setScreen("thanks");
    } catch { showToast("Something went wrong. Please try again.", "error"); }
    finally { setSubmitting(false); setUploadProgress(null); }
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

          {screen === "fork" && (
            <div>
              <div className="share-modal-eyebrow">SHARE A MEMORY OF {memorial.name.toUpperCase()}</div>
              <h2>How would you like to share?</h2>
              <div className="share-orient-actions">
                <button type="button" className="share-orient-btn" onClick={() => setScreen("relationship")}>
                  <span className="title">Answer a question</span>
                  <span className="sub">We'll ask something specific to help a memory come back to you.</span>
                </button>
                <button type="button" className="share-orient-btn" onClick={skipToFreewrite}>
                  <span className="title">I know what I want to share</span>
                  <span className="sub">Skip the questions — go straight to writing or recording it.</span>
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
              <span className="share-back-link" onClick={() => setScreen("fork")}>&larr; Back</span>
            </div>
          )}

          {screen === "questionList" && (
            <div>
              <div className="share-modal-eyebrow">
                SHARE A MEMORY OF {memorial.name.toUpperCase()}
                {relationship && ` · AS ${relationships.find((r) => r.id === relationship)?.label.toUpperCase()}`}
              </div>
              <h2>Pick whichever sparks something.</h2>
              <div className="share-question-list">
                {(SHARE_QUESTION_BANK[subjectType].banks[livingStatus][relationship] || [])
                  .concat(universalTexts)
                  .map((q) => (
                    <button key={q} type="button" className="share-question-card" onClick={() => chooseQuestion(q)}>
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
              </div>
              <span className="share-freewrite-link" onClick={skipToFreewrite}>Or, share whatever you'd like — skip the questions</span>
              <span className="share-back-link" onClick={() => setScreen("relationship")}>&larr; Choose a different relationship</span>
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
                  <span className="share-shuffle-link" onClick={() => setScreen("questionList")}>Choose a different question</span>
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
                      onLinkClick={openLinkInput}
                      onLinkUrlChange={(url) => setAttachment((a) => ({ ...a, url, preview: null, error: "" }))}
                      onLinkBlur={fetchLinkPreview}
                      onAdjustCrop={() => setShowCropAdjuster(true)}
                      onRemove={clearAttachment}
                      compressingVideo={compressingVideo}
                      videoPreviewRef={videoPreviewRef}
                      onUseFrameAsPoster={useCurrentFrameAsPoster}
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

              <button className="btn btn-rust btn-lg share-submit-btn" onClick={handleSubmit} disabled={submitting || compressingVideo} style={{ justifyContent: "center" }}>
                {submitting
                  ? <><span className="spinner" /> {uploadProgress != null ? `Uploading... ${Math.round(uploadProgress * 100)}%` : "Sharing..."}</>
                  : "Share this memory"}
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

// "Ask to add a memory" — shown instead of ShareMemoryModal when the page is
// invite_only and the visitor arrived without a valid invite (see
// canContribute in MemorialPage). Reuses the same relationship data
// ShareMemoryModal derives from SHARE_QUESTION_BANK, just without any of the
// question/media machinery — this is a single short form, not a multi-screen
// flow. A 23505 (the visitor already has a pending request on file) is
// treated exactly like a fresh success — same confirmation either way, so a
// second attempt after some days of silence never looks like an error.
function AccessRequestModal({ memorial, showToast, onClose }) {
  const subjectType = deriveSubjectType(memorial);
  const firstName = memorial.name.split(" ")[0];
  const relationships = SHARE_QUESTION_BANK[subjectType].relationships;

  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { showToast("Please enter your name.", "error"); return; }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { showToast("Please enter a valid email — that's what the family will reply to.", "error"); return; }

    setSubmitting(true);
    const relLabel = relationships.find((r) => r.id === relationship)?.label || null;
    // A pending row isn't visible back to anon under RLS (see the
    // "approved tokens are checkable" policy — only approved rows are), so
    // this can't ask for the inserted row back with .select() the way
    // contributions' approved-immediately path does. Same fix contributions
    // already needed for its own pending case: a plain insert.
    const { error } = await supabase.from("access_requests").insert({
      memorial_id: memorial.id,
      requester_name: name.trim(),
      requester_email: email.trim(),
      relationship: relLabel,
      note: note.trim() || null,
    });
    setSubmitting(false);

    if (error && error.code !== "23505") { showToast("Something went wrong. Please try again.", "error"); return; }
    notifyAccessRequest(memorial.id);
    trackEvent("access_requested");
    setSent(true);
  };

  return (
    <div className="share-modal-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="share-modal" role="dialog" aria-label={`Ask to add a memory of ${memorial.name}`}>
        <button type="button" className="share-modal-close" aria-label="Close" onClick={onClose}>&times;</button>

        {sent ? (
          <div>
            <div className="share-thanks-icon">&#10003;</div>
            <h2 style={{ textAlign: "center" }}>Sent.</h2>
            <p className="share-thanks-text">{firstName}'s family will get back to you.</p>
            <div className="share-thanks-actions">
              <button type="button" className="btn btn-rust" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="share-modal-eyebrow">ASK TO ADD A MEMORY OF {memorial.name.toUpperCase()}</div>
            <h2>This page is by invitation — ask and the family will get back to you.</h2>

            <div className="form-group">
              <label className="form-label">Your name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="How you were known to them" />
            </div>
            <div className="form-group">
              <label className="form-label">Your email</label>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="So the family can reply" />
            </div>
            <div className="form-group">
              <label className="form-label">How did you know {firstName}?</label>
              <div className="share-rel-grid">
                {relationships.map((r) => (
                  <button key={r.id} type="button" className={`share-rel-chip${relationship === r.id ? " active" : ""}`} onClick={() => setRelationship(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">A note (optional)</label>
              <textarea className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything that helps the family know it's you" rows={3} />
            </div>

            <button className="btn btn-rust btn-lg" onClick={handleSubmit} disabled={submitting} style={{ justifyContent: "center", width: "100%" }}>
              {submitting ? <><span className="spinner" /> Sending...</> : "Send request"}
            </button>
          </div>
        )}
      </div>
    </div>
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
  onLinkClick, onLinkUrlChange, onLinkBlur,
  onAdjustCrop, onRemove, compressingVideo, videoPreviewRef, onUseFrameAsPoster,
}) {
  if (compressingVideo) {
    return (
      <div className="share-attach-row">
        <span className="spinner spinner-dark" /> Getting your video ready to upload&hellip;
      </div>
    );
  }

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
        <video ref={videoPreviewRef} src={attachment.preview} poster={attachment.posterPreview || undefined} controls style={{ width: "100%", maxHeight: 300, borderRadius: 4 }} />
        {attachment.posterPreview && (
          <div className="share-video-poster-row">
            <img className="share-video-poster-thumb" src={attachment.posterPreview} alt="" />
            <div>
              <div className="share-video-poster-label">Thumbnail</div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={onUseFrameAsPoster}>Use this frame instead</button>
            </div>
          </div>
        )}
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
      <button type="button" className="share-attach-btn" onClick={onLinkClick}>+ Add a link</button>
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
        <video src={s.media_url} poster={s.secondary_media_url || undefined} preload="metadata" muted playsInline />
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
        <video src={s.media_url} poster={s.secondary_media_url || undefined} controls playsInline />
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
