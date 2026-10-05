import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, timeAgo, fileToDataURL, fmtTime, notifyCreator, notifyAccessRequest, FREE_MEMORY_LIMIT, memorialUrl } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { detectCropPosition } from "../components/CropAdjuster";
import { MemoryLimitModal } from "../components/MemoryLimitModal";
import { MediaBatchUploader, ADD_MEDIA_LABEL } from "../components/MediaBatchUploader";
import { useScrollLock } from "../lib/useScrollLock";
import { useDotTruncation } from "../lib/useDotTruncation";
import { shareVideoWithinCap, compressVideo, generateVideoPoster, uploadFileWithProgress } from "../lib/media";

// Reshuffled on every load (see loadMemorial/refreshStories) so a memorial
// with no new activity still feels alive — visitors see the memories in a
// different order each time they come back, even though nothing changed.
function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// An entry's `type` is the single format it was submitted as (photo/video/
// voice/url/story), auto-derived from what was attached. Independently, an
// entry can carry zero or more descriptive `tags` from a small fixed
// taxonomy (CONTENT_TAGS, currently just "Recipe") — set by the contributor
// at share time or by the creator from the moderation screen. A single
// entry can be type="photo" with tags=["Recipe"].
//
// type and tags filter independently: a type=photo, tags=[Recipe] entry
// matches BOTH the Photos pill and the Recipes pill.
//
// voice still carries a `subtype` ("recording" -> Spoken story, else ->
// Voicemail, incl. untagged pre-migration rows). That's a real format
// split, not a tag. video/story/url have no subtype.
export const CONTENT_TAGS = ["Recipe"];
export const entryHasTag = (s, tag) => Array.isArray(s.tags) && s.tags.includes(tag);

const FILTER_ORDER = ["all", "photo", "video", "voicemail", "spoken", "story", "recipe", "url"];
const FILTER_LABEL = { all: "Everything", photo: "Photos", video: "Videos", voicemail: "Voicemails", spoken: "Spoken stories", story: "Written stories", recipe: "Recipes", url: "Links" };

// The badge shown on a grid tile / in the reader's type tag. A tag is more
// specific to the viewer than the raw format, so prefer it in that slot
// (display only — the underlying `type` is unchanged).
function contentTypeLabel(s) {
  if (entryHasTag(s, "Recipe")) return "Recipe";
  if (s.type === "photo") return "Photo";
  if (s.type === "video") return "Video";
  if (s.type === "voice") return s.subtype === "recording" ? "Spoken story" : "Voicemail";
  if (s.type === "url") return "Link";
  // A story-type row can carry an attached photo (see the linked-entries
  // work) — treat it as a photo entry for label purposes, not "written
  // story" — the media (whatever it is) is always the primary content.
  if (s.type === "story" && s.media_url) return "Photo";
  return "Written story";
}

// activeFilter is one of FILTER_ORDER's keys. "recipe" keys off tags;
// every other pill keys off type (+ subtype for the voice split) — so an
// entry can match a type pill and the recipe pill at the same time.
function matchesFilter(s, filter) {
  if (filter === "all") return true;
  if (filter === "recipe") return entryHasTag(s, "Recipe");
  if (filter === "voicemail") return s.type === "voice" && s.subtype !== "recording";
  if (filter === "spoken") return s.type === "voice" && s.subtype === "recording";
  return s.type === filter; // photo, video, story, url
}

// Deterministic per-story offset so multiple waveform cards on the same
// page don't all render the identical bar pattern.
export const seedFor = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 1000;
  return h;
};

// Brand tokens only (Sage / Clay / Charcoal), per the brand refresh —
// hashed per contributor via seedFor so the same person always lands on
// the same color, not a fresh random one per render. Exported so the
// dashboard's own contributor stack (Dashboard.jsx) stays visually
// consistent with the public page instead of reinventing this.
export const AVATAR_COLORS = ["#687A5E", "#C9A98B", "#2E2E2E"];
export const colorForContributor = (name) => AVATAR_COLORS[seedFor(name) % AVATAR_COLORS.length];
export const initialsFor = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

const AVATAR_STACK_MAX = 5;

// Same overlapping-circle pattern as the homepage's preview-crowd, adapted
// to real contributor names (not the homepage's fixed JM/KL/DP example) and
// a per-contributor color instead of one flat avatar background.
export function ContributorAvatars({ stories }) {
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

export function MemorialPage({ inviteCode, showToast, onNavigate, currentUser }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  // ShareMemoryModal is mounted once (contributeMounted) and then kept in
  // the tree for the rest of this page visit — contributeOpen just toggles
  // its visibility. That's what lets a contributor's draft (including a
  // picked photo/video File, which can't be serialized to storage) survive
  // "see what others have shared" and "see all memories" round trips
  // without being rebuilt from scratch. See ShareMemoryModal's own header
  // comment for the full reasoning.
  const [contributeMounted, setContributeMounted] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const batchUploaderRef = useRef();
  const [activeFilter, setActiveFilter] = useState("all");
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

  // Whether the access code we last tried (from ?code=, or typed into the
  // code-gate form below) matched — get_memorial_page() also reports true
  // for a steward viewing their own page, so this one flag doubles as both
  // "can view a private page" and "can skip typing a code to contribute".
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeAttempt, setCodeAttempt] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    const initialCode = new URLSearchParams(window.location.search).get("code");
    loadMemorial(initialCode);
  }, [inviteCode]);

  useEffect(() => {
    // No sitemap exists on this site today, so "not indexed" is the whole
    // job here — a noindex tag for anything that isn't fully Public.
    let tag = document.querySelector('meta[name="robots"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", memorial && memorial.visibility !== "public" ? "noindex, nofollow" : "index, follow");
    return () => tag?.setAttribute("content", "index, follow");
  }, [memorial?.visibility]);

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
  const [showMemoryLimit, setShowMemoryLimit] = useState(false);

  // Covered by the "stewards see their memories" SELECT policy, so this
  // sees pending items too, not just approved ones. Named (not inline in
  // the effect below) so the ShareMemoryModal close handler can also call
  // it after a fresh submission, to know immediately whether that just
  // used up the last free memory.
  const refreshFreeContributionCount = async () => {
    if (!memorial || memorial.is_paid || !isOwner) return 0;
    const { count } = await supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("memorial_id", memorial.id)
      .not("status", "in", "(rejected,held)"); // 'held' = saved past the free limit, not yet on the page
    setFreeContributionCount(count || 0);
    return count || 0;
  };

  useEffect(() => {
    refreshFreeContributionCount();
  }, [memorial?.id, memorial?.is_paid, isOwner]);

  const openContribute = () => { setContributeMounted(true); setShowContribute(true); };

  // The URL param may be the invite code (?memorial=<code>) or a custom
  // vanity slug (myandthen.com/<slug>) — get_memorial_page() tries both
  // server-side. It's also the only way in for a Private page: plain RLS
  // can't gate "did this stateless request already prove a code", so a
  // SECURITY DEFINER function does the identifier resolution AND the code
  // check AND the contributions read in one call, returning the same
  // null/[] shape whether the page doesn't exist or is private with a
  // wrong/missing code — a guess can't be used to confirm which.
  const loadMemorial = async (code) => {
    setLoading(true);
    const { data } = await supabase.rpc("get_memorial_page", { p_identifier: inviteCode, p_code: code || null });
    setMemorial(data?.memorial || null);
    setStories(shuffled(data?.contributions || []));
    setCodeVerified(!!data?.code_verified);
    setLoading(false);
  };

  // Same fetch as loadMemorial, minus the full-page loading spinner — used
  // after the share modal or batch uploader finishes so a memory just added
  // (or a whole batch) shows up in the grid right away instead
  // of waiting for a manual page reload.
  const refreshStories = async () => {
    const code = codeVerified ? (codeAttempt || new URLSearchParams(window.location.search).get("code")) : null;
    const { data } = await supabase.rpc("get_memorial_page", { p_identifier: inviteCode, p_code: code || null });
    if (data?.memorial) setMemorial(data.memorial);
    setStories(shuffled(data?.contributions || []));
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!codeAttempt.trim()) return;
    setCheckingCode(true);
    await loadMemorial(codeAttempt.trim());
    setCheckingCode(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorial) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <h2 style={{ fontFamily: "Lora, serif", marginBottom: 12 }}>Page not found</h2>
      <p style={{ color: "var(--warm-light)" }}>This link may be invalid, or the page may be private.</p>
      {/* Deliberately shown either way — a private page and a nonexistent
          one look identical here, so a wrong guess can't confirm which. */}
      <form onSubmit={handleCodeSubmit} style={{ maxWidth: 280, margin: "24px auto 0", display: "flex", gap: 8 }}>
        <input
          className="form-input"
          placeholder="Access code"
          value={codeAttempt}
          onChange={(e) => setCodeAttempt(e.target.value)}
          style={{ textAlign: "center", letterSpacing: "0.06em" }}
        />
        <button type="submit" className="btn btn-rust" disabled={checkingCode} style={{ flexShrink: 0 }}>
          {checkingCode ? <span className="spinner" /> : "View"}
        </button>
      </form>
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

  // An otherwise-open page can still separately require a code just to
  // contribute (contribution_access), without gating viewing at all — a
  // private page's own view code covers that too (codeVerified), so this
  // only matters for the "share" state; ShareMemoryModal asks for the code
  // itself rather than blocking the CTA outright, so a visitor who doesn't
  // have it yet still sees why, instead of the button just vanishing.
  const codeRequiredToContribute = (memorial.visibility === "private" || memorial.contribution_access === "code_required") && !codeVerified;
  const canContribute = !memorial.closed_to_submissions && (
    memorial.is_paid || (isOwner && freeContributionCount < FREE_MEMORY_LIMIT)
  );

  // Drives both CTA spots (hero + footer) from one place instead of
  // duplicating the same ladder twice.
  //   closed:      steward turned off new submissions — view-only
  //   share:       normal ShareMemoryModal flow (may itself ask for a code)
  //   owner-limit: free tier, owner, hit the cap — nudge toward Pricing
  //   free-locked: free tier, not the owner — nothing to click at all
  const contributeState = memorial.closed_to_submissions
    ? "closed"
    : canContribute
      ? "share"
      : isOwner
        ? "owner-limit"
        : "free-locked";

  // Shared between the hero and footer CTA spots so the label/action ladder
  // only lives in one place. No entry for "free-locked" — that state has
  // nothing to click, by design.
  const ctaLabel = { share: "Add Your Memory", "owner-limit": "Upgrade to add more" }[contributeState];
  const ctaOnClick = { share: openContribute, "owner-limit": () => setShowMemoryLimit(true) }[contributeState];
  const closedNote = "This page isn't taking new memories right now — everything already here is still here to read.";

  const heroTitle = (
    <>
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
          <span className="mem-wordmark-line" aria-hidden="true" />
          <span className="mem-wordmark-text">And Then</span>
          <span className="mem-wordmark-dots" aria-hidden="true"><i /><i /><i /></span>
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
          <div className="mem-bio-eyebrow">
            <span className="line" aria-hidden="true" />
            <span className="label">as told by everyone who loves them</span>
            <span className="line" aria-hidden="true" />
          </div>
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
            <p className="hero-cta-note">{contributeState === "closed" ? closedNote : "This page isn't open for contributions yet — check back soon."}</p>
          )}
          {/* The creator's own fast path — many at once, straight onto the
              page. Shown even at the free limit: the uploader saves what
              doesn't fit and offers the unlock itself. */}
          {isOwner && !memorial.closed_to_submissions && (
            <button type="button" className="hero-cta-media" onClick={() => batchUploaderRef.current?.openPicker()}>{ADD_MEDIA_LABEL}</button>
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
          <p className="hero-cta-note">{contributeState === "closed" ? closedNote : "This page isn't open for contributions yet — check back soon."}</p>
        )}
        <p className="note">
          {contributeState === "closed"
            ? closedNote
            : contributeState === "share" && !memorial.is_paid
              ? <>This page is still on the free plan — only you can add memories to it right now (up to {FREE_MEMORY_LIMIT}). Upgrade anytime to invite others.</>
              : contributeState === "share"
                ? <>This page keeps growing &mdash; anyone who knew {memorial.name.split(" ")[0]} can add a photo, story, voice memo, or video, anytime.</>
                : contributeState === "owner-limit"
                    ? <>You've added the {FREE_MEMORY_LIMIT} memories included free. Upgrade to add more, and invite others to help gather memories too.</>
                    : <>This page isn't open to contributions yet.</>}
        </p>
      </footer>

      <div className="mem-footer">
        <div className="mem-footer-dots" aria-hidden="true">
          <span className="line" />
          <i /><i /><i />
        </div>
        <p className="mem-footer-tagline">A living memorial — built one memory at a time.</p>
      </div>

      {contributeMounted && (
        <ShareMemoryModal
          memorial={memorial}
          showToast={showToast}
          open={showContribute}
          stories={stories}
          // Just hides the sheet — refreshStories already ran from
          // onSubmitted the moment a memory was actually added, so this is
          // only about the free-tier upgrade nudge, which stays deferred to
          // an actual close (not mid-thanks-screen) same as before.
          onClose={async () => {
            setShowContribute(false);
            if ((await refreshFreeContributionCount()) >= FREE_MEMORY_LIMIT) setShowMemoryLimit(true);
          }}
          onViewAllMemories={() => setShowContribute(false)}
          onSubmitted={refreshStories}
          isCreator={isOwner}
          contributeToken={tokenValid ? contributeToken : null}
          requireCode={codeRequiredToContribute}
          verifiedCode={codeVerified ? codeAttempt || new URLSearchParams(window.location.search).get("code") : null}
        />
      )}

      {isOwner && (
        <MediaBatchUploader
          ref={batchUploaderRef}
          memorial={memorial}
          mode="creator"
          showToast={showToast}
          creatorRelation={memorial.steward_relation || null}
          defaultContact={{ name: loadShareDraft(memorial.id)?.name || "" }}
          onPublished={() => { refreshStories(); refreshFreeContributionCount(); }}
        />
      )}

      {showMemoryLimit && (
        <MemoryLimitModal memorial={memorial} onClose={() => setShowMemoryLimit(false)} />
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

// Turns a contributor-typed string into a real absolute URL, defaulting to
// https:// when no scheme was typed (e.g. "site.com/obituary") — the same
// forgiving parse a browser address bar does, so "That doesn't look like a
// link" only fires on genuinely malformed input, not a missing "https://".
function normalizeShareUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null; // rejects e.g. "https://asdf"
    return url;
  } catch { return null; }
}

// Draft autosave key — scoped per memorial, not per contributor, since a
// contributor isn't signed in. Only ever read/written from the same browser
// tab session (sessionStorage), and only holds plain serializable fields
// (never File objects) — see the ShareMemoryModal header comment for why
// attachments are carried a different way.
const shareDraftKey = (memorialId) => `andthen_share_draft_${memorialId}`;
function loadShareDraft(memorialId) {
  try { return JSON.parse(sessionStorage.getItem(shareDraftKey(memorialId)) || "null"); }
  catch { return null; }
}
function saveShareDraft(memorialId, draft) {
  try { sessionStorage.setItem(shareDraftKey(memorialId), JSON.stringify(draft)); } catch { /* storage unavailable — draft just won't survive a reload */ }
}

// "Share a memory" — a single full-screen sheet on mobile (a centered card
// on desktop). Nothing is a precondition to writing: the textarea is
// focused immediately, no question is shown until asked for, and no
// relationship chip is ever preselected.
//
// This component is mounted once per page visit and kept alive for the rest
// of it (see contributeMounted in MemorialPage) — it never unmounts just
// because the sheet is hidden. That's deliberate: "See what others have
// shared" and "See all N memories" both send the contributor away from the
// compose screen (in-sheet for the former, out to the grid for the latter),
// and the spec requires their draft — including any photo/video File
// they've already picked — to still be there when they come back. A File
// can't survive being serialized to storage, so keeping the component
// instance alive (rather than a snapshot-and-restore dance) is what
// actually guarantees that. The sessionStorage draft below is a secondary,
// text-only safety net purely for a real page reload — it can't help with
// attachments either, for the same reason.
export function ShareMemoryModal({ memorial, showToast, open, onClose, onViewAllMemories, onSubmitted, stories, contributeToken, requireCode, verifiedCode, isCreator = false }) {
  useScrollLock(open);
  const subjectType = deriveSubjectType(memorial);
  const livingStatus = deriveLivingStatus(memorial);
  const moderationMode = deriveModerationMode(memorial);
  const firstName = memorial.name.split(" ")[0];
  const relationships = SHARE_QUESTION_BANK[subjectType].relationships;
  const universalTexts = SHARE_QUESTION_BANK[subjectType].universal.map((u) => u.text);

  const storedDraft = useRef(loadShareDraft(memorial.id)).current;

  const [screen, setScreen] = useState("compose"); // compose | preview | thanks
  // Never prefilled as "selected" from a past visit — only ever set by the
  // contributor tapping a chip in this session (including one restored from
  // this same session's autosaved draft, which isn't a preselection so much
  // as not discarding what they'd already chosen a moment ago).
  const [relationship, setRelationship] = useState(storedDraft?.relationship || null);
  const [otherRelationshipText, setOtherRelationshipText] = useState(storedDraft?.otherRelationshipText || "");
  const [questionRequested, setQuestionRequested] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [name, setName] = useState(storedDraft?.name || "");
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [text, setText] = useState(storedDraft?.text || "");
  const [attachment, setAttachment] = useState(null); // { kind: 'photo'|'video', ... } | null — File objects, so never persisted
  const [linkOpen, setLinkOpen] = useState(storedDraft?.linkOpen || false);
  const [linkUrl, setLinkUrl] = useState(storedDraft?.linkUrl || "");
  const [linkPreview, setLinkPreview] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [compressingVideo, setCompressingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // 0-1 while a video uploads, else null
  const [errors, setErrors] = useState({});
  const [justSubmitted, setJustSubmitted] = useState(null); // tile-shaped object for the thanks screen
  const [showRequestAccess, setShowRequestAccess] = useState(false);

  const photoVideoInputRef = useRef();
  const batchUploaderRef = useRef();
  const textareaRef = useRef();
  const contentSectionRef = useRef();
  const nameSectionRef = useRef();
  const relationshipSectionRef = useRef();
  const viewAllRequestedRef = useRef(false);

  // Autosave the serializable half of the draft on every change. Deliberately
  // NOT gated to `open` — a contributor mid-attachment-upload who taps away
  // should still have their typed text recovered after a stray reload.
  useEffect(() => {
    saveShareDraft(memorial.id, { name, relationship, otherRelationshipText, text, linkOpen, linkUrl });
  }, [memorial.id, name, relationship, otherRelationshipText, text, linkOpen, linkUrl]);

  // The scroll-lock effect (useScrollLock) restores the page's own scroll
  // position the moment `open` goes false. "See all memories" additionally
  // wants to land on the grid, which has to happen strictly after that
  // restore or it gets clobbered — hence the rAF, which always runs after
  // the commit that ran the scroll-lock's cleanup.
  useEffect(() => {
    if (open || !viewAllRequestedRef.current) return;
    viewAllRequestedRef.current = false;
    requestAnimationFrame(() => {
      document.getElementById("archive")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [open]);

  useEffect(() => {
    if (screen === "compose") textareaRef.current?.focus();
  }, [screen]);

  if (!open) return null;

  // No chip picked yet still needs a prompt to show if "Not sure what to
  // say?" is tapped — falls back to the relationship list's last ("Someone
  // else") entry for that, without marking any chip as selected.
  const effectiveRelationship = relationship || relationships[relationships.length - 1].id;
  const questionList = (SHARE_QUESTION_BANK[subjectType].banks[livingStatus][effectiveRelationship] || []).concat(universalTexts);
  const question = questionList[questionIndex % questionList.length];
  const showQuestion = questionRequested && !text.trim();

  const selectRelationship = (relId) => {
    setRelationship(relId);
    setQuestionIndex(0);
    setErrors((e) => ({ ...e, relationship: null }));
  };

  const revealQuestion = () => { setQuestionRequested(true); setQuestionIndex(0); };
  const cycleQuestion = () => setQuestionIndex((i) => (i + 1) % questionList.length);

  const clearAttachment = () => { setAttachment(null); setCompressingVideo(false); };

  // "Photo or video" takes one attachment for the memory being written.
  // Picking several there means "share these", so hand them to the batch
  // uploader instead of quietly dropping all but the first.
  const handlePhotoVideoPick = (files) => {
    if (files.length > 1 && canShareMany) batchUploaderRef.current?.addFiles(files);
    else handlePhotoVideoSelect(files[0]);
  };

  const handlePhotoVideoSelect = async (file) => {
    if (!file) return;
    setLinkOpen(false); setLinkUrl(""); setLinkPreview(null); // mutually exclusive with a link — one primary attachment per memory
    setErrors((e) => ({ ...e, content: null }));
    if (file.type.startsWith("video/")) {
      if (!(await shareVideoWithinCap(file))) { showToast("Videos must be 60 seconds or less.", "error"); return; }
      setCompressingVideo(true);
      const finalFile = await compressVideo(file);
      const poster = await generateVideoPoster(finalFile);
      setCompressingVideo(false);
      setAttachment({ kind: "video", file: finalFile, preview: URL.createObjectURL(finalFile), posterFile: poster, posterPreview: poster ? URL.createObjectURL(poster) : null });
    } else {
      const preview = await fileToDataURL(file);
      const cropPos = await detectCropPosition(file);
      setAttachment({ kind: "photo", file, preview, cropPos });
    }
  };

  const openLink = () => {
    if (linkOpen) { setLinkOpen(false); setLinkUrl(""); setLinkPreview(null); return; }
    setAttachment(null); // mutually exclusive with a photo/video attachment
    setLinkOpen(true);
    setErrors((e) => ({ ...e, content: null }));
  };

  // Preview fetch runs on blur, same as before — a failed fetch still lets
  // the link be shared (handleSubmit falls back to the bare url as the title).
  const fetchLinkPreview = async () => {
    const url = normalizeShareUrl(linkUrl);
    if (!url) { setLinkPreview(null); return; }
    setLinkLoading(true);
    try {
      const res = await fetch("/api/link-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.href }) });
      if (!res.ok) throw new Error("preview failed");
      const data = await res.json();
      setLinkPreview({ ...data, hostname: url.hostname.replace(/^www\./, "") });
    } catch { setLinkPreview(null); }
    finally { setLinkLoading(false); }
  };

  // Invite-only pages: the batch uploader is only offered to someone who
  // already has access — it has no access-code field of its own.
  const canShareMany = !requireCode || !!verifiedCode;

  const hasLinkText = linkOpen && linkUrl.trim().length > 0;
  const hasContent = text.trim() || attachment || hasLinkText;

  const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const validate = () => {
    const next = {};
    let normalizedLink = null;
    if (hasLinkText) {
      normalizedLink = normalizeShareUrl(linkUrl);
      if (!normalizedLink) next.content = "That doesn't look like a link.";
    }
    if (!next.content && !hasContent) next.content = "Add something to share.";
    if (!name.trim()) next.name = "Add your name.";
    else if (requireCode && !verifiedCode && !accessCodeInput.trim()) next.name = "Add the access code.";
    if (!relationship || (relationship === "other" && !otherRelationshipText.trim())) next.relationship = `Choose how you knew ${firstName}.`;

    setErrors(next);
    if (next.content) scrollToRef(contentSectionRef);
    else if (next.name) scrollToRef(nameSectionRef);
    else if (next.relationship) scrollToRef(relationshipSectionRef);
    return { ok: Object.keys(next).length === 0, normalizedLink };
  };

  const handleSubmit = async () => {
    const { ok, normalizedLink } = validate();
    if (!ok) return;

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
      } else if (normalizedLink) {
        type = "url";
        mediaUrl = linkPreview?.image || null;
        linkMeta = {
          url: normalizedLink.href,
          provider: linkPreview?.provider || null,
          videoId: linkPreview?.videoId || null,
          start: linkPreview?.start ?? null,
          title: linkPreview?.title || null,
          hostname: linkPreview?.hostname || normalizedLink.hostname.replace(/^www\./, ""),
        };
      }

      const relLabel = relationship === "other" ? otherRelationshipText.trim() : relationships.find((r) => r.id === relationship)?.label || null;

      const row = {
        memorial_id: memorial.id,
        contributor_name: name.trim(),
        contributor_relation: relLabel,
        contributor_email: null,
        type,
        subtype: null,
        tags: [],
        text: text.trim() || null,
        media_url: mediaUrl,
        secondary_media_url: secondaryMediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
        crop_x: cropX,
        crop_y: cropY,
        link_meta: linkMeta,
        submitted_code: verifiedCode || accessCodeInput.trim() || null,
      };

      if (memorial.require_approval) {
        // Pending rows are hidden from anonymous contributors by RLS, so we must
        // NOT ask for them back — a plain insert, or the insert itself is rejected.
        const { error } = await supabase.from("contributions").insert(row);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contributions").insert(row).select("id");
        if (error) throw error;
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

      setJustSubmitted({ ...row, id: "just-submitted" });
      setScreen("thanks");
      // Keep the signature (name + relationship) so "Add another memory" and
      // any future reload arrive prefilled — everything else about the
      // draft is done with, once it's actually been shared.
      saveShareDraft(memorial.id, { name, relationship, otherRelationshipText, text: "", linkOpen: false, linkUrl: "" });
      onSubmitted?.();
    } catch { showToast("Something went wrong. Please try again.", "error"); }
    finally { setSubmitting(false); setUploadProgress(null); }
  };

  // From the thanks screen's "Add another memory" — keeps name + relationship,
  // clears everything else, and returns focus to the textarea (via the
  // screen-change effect above).
  const addAnother = () => {
    setScreen("compose");
    setText("");
    clearAttachment();
    setLinkOpen(false);
    setLinkUrl("");
    setLinkPreview(null);
    setQuestionRequested(false);
    setQuestionIndex(0);
    setErrors({});
  };

  const openPreview = () => setScreen("preview");
  const backFromPreview = () => setScreen("compose");
  const viewAllMemories = () => {
    viewAllRequestedRef.current = true;
    setScreen("compose"); // so a later reopen lands back on the form, not the preview
    onViewAllMemories();
  };

  const previewStories = stories.slice(0, 3);
  const hasDraftContent = text.trim() || attachment || hasLinkText || name.trim();

  return (
    <div className="share-sheet-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="share-sheet" role="dialog" aria-label={`Share a memory of ${memorial.name}`}>
        <div className="share-sheet-header">
          <h2>Share a memory of {firstName}</h2>
          <button type="button" className="share-sheet-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>

        {screen === "preview" && (
          <div className="share-sheet-body">
            <div className="share-preview-grid">
              {previewStories.map((s) => (
                <MemoryTile key={s.id} story={s} hidden={false} onOpen={viewAllMemories} />
              ))}
            </div>
            <span className="share-preview-see-all" onClick={viewAllMemories}>
              See all {stories.length} {stories.length === 1 ? "memory" : "memories"}
            </span>
          </div>
        )}

        {screen === "compose" && (
          <div className="share-sheet-body">
            <p className="share-intro">
              You don't need to write the whole story. Add what comes to mind now, and come back when you think of more.
            </p>
            {stories.length > 0 && (
              <span className="share-see-shared-link" onClick={openPreview}>See what others have shared.</span>
            )}

            <div ref={contentSectionRef} className="share-content-section">
              {showQuestion && (
                <div className="share-question-box">
                  <p className="share-question-text">{question}</p>
                  <span className="share-shuffle-link" onClick={cycleQuestion}>Try a different question</span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                autoFocus
                className="form-input share-textarea"
                placeholder="Type the memory here…"
                value={text}
                onChange={(e) => { setText(e.target.value); setErrors((er) => ({ ...er, content: null })); }}
              />
              {!text.trim() && !showQuestion && (
                <span className="share-nudge-link" onClick={revealQuestion}>Not sure what to say?</span>
              )}

              {attachment?.kind === "photo" && (
                <div className="share-attach-preview photo-preview-crop">
                  <img src={attachment.preview} alt="" style={{ objectPosition: `${attachment.cropPos.x}% ${attachment.cropPos.y}%` }} />
                  <button type="button" className="share-attach-remove" onClick={clearAttachment}>Remove</button>
                </div>
              )}
              {attachment?.kind === "video" && (
                <div className="share-attach-preview">
                  <video src={attachment.preview} poster={attachment.posterPreview || undefined} controls style={{ width: "100%", maxHeight: 260, borderRadius: 8 }} />
                  <button type="button" className="share-attach-remove" onClick={clearAttachment}>Remove</button>
                </div>
              )}
              {compressingVideo && (
                <div className="share-attach-preview"><span className="spinner spinner-dark" /> Getting your video ready…</div>
              )}
              {linkOpen && (
                <div className="share-attach-preview">
                  <input
                    className="form-input"
                    type="text"
                    autoFocus
                    placeholder="Paste a link, such as an obituary or a video"
                    value={linkUrl}
                    onChange={(e) => { setLinkUrl(e.target.value); setLinkPreview(null); setErrors((er) => ({ ...er, content: null })); }}
                    onBlur={fetchLinkPreview}
                  />
                  {linkLoading && <span className="form-hint">Loading preview…</span>}
                  {linkPreview && (
                    <div className="link-preview-card">
                      {linkPreview.image ? <img src={linkPreview.image} alt="" className="link-preview-thumb" /> : <div className="link-preview-thumb link-preview-thumb-fallback">🔗</div>}
                      <div>
                        <div className="link-preview-title">{linkPreview.title || linkUrl.trim()}</div>
                        <div className="link-preview-provider">{linkPreview.provider === "youtube" ? "YouTube" : linkPreview.hostname}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!attachment && !linkOpen && !compressingVideo && (
                <div className="share-attach-buttons">
                  <button type="button" className="share-attach-choice" onClick={() => photoVideoInputRef.current?.click()}>Photo or video</button>
                  <button type="button" className="share-attach-choice" onClick={openLink}>Link</button>
                </div>
              )}
              {!attachment && !linkOpen && !compressingVideo && canShareMany && (
                <button type="button" className="share-attach-choice share-attach-many" onClick={() => batchUploaderRef.current?.openPicker()}>Share photos or videos</button>
              )}
              <input ref={photoVideoInputRef} type="file" accept="image/*,video/*" multiple={canShareMany} style={{ display: "none" }} onChange={(e) => { handlePhotoVideoPick(Array.from(e.target.files)); e.target.value = ""; }} />

              {errors.content && <p className="share-error">{errors.content}</p>}
            </div>

            <div ref={nameSectionRef} className="share-field-section">
              <label className="form-label" htmlFor="share-name">Your name</label>
              <input id="share-name" className="form-input" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: null })); }} />
              {requireCode && !verifiedCode && (
                <>
                  <input className="form-input" style={{ marginTop: 8 }} placeholder="Access code — ask the family if you don't have it" value={accessCodeInput} onChange={(e) => { setAccessCodeInput(e.target.value); setErrors((er) => ({ ...er, name: null })); }} />
                  <span className="share-nudge-link" style={{ marginTop: 6 }} onClick={() => setShowRequestAccess(true)}>Don't have the code? Ask for access</span>
                </>
              )}
              {errors.name && <p className="share-error">{errors.name}</p>}
            </div>

            <div ref={relationshipSectionRef} className="share-field-section">
              <label className="form-label">How did you know {firstName}?</label>
              <div className="share-rel-row">
                {relationships.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`share-rel-pill${relationship === r.id ? " active" : ""}`}
                    onClick={() => selectRelationship(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {relationship === "other" && (
                <input
                  className="form-input"
                  style={{ marginTop: 8 }}
                  placeholder="How did you know them?"
                  value={otherRelationshipText}
                  onChange={(e) => { setOtherRelationshipText(e.target.value); setErrors((er) => ({ ...er, relationship: null })); }}
                />
              )}
              {errors.relationship && <p className="share-error">{errors.relationship}</p>}
            </div>
          </div>
        )}

        {screen === "thanks" && (
          <div className="share-sheet-body">
            <div className="share-thanks-icon">&#10003;</div>
            <h2 style={{ textAlign: "center" }}>That's a great one.</h2>
            <p className="share-thanks-text">
              {moderationMode === "moderated"
                ? `Thank you — ${firstName}'s family will see this soon.`
                : `It's been added to ${firstName}'s page.`}
            </p>
            {justSubmitted && (
              <div className="share-preview-grid share-preview-grid-single">
                <MemoryTile story={justSubmitted} hidden={false} onOpen={() => {}} />
              </div>
            )}
            <p className="share-thanks-text">
              You can add more whenever you think of it. Your name and how you knew {firstName} will already be filled in.
            </p>
            <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={addAnother}>Add another memory</button>
            <span className="share-back-link" onClick={onClose}>Back to {firstName}'s page</span>
            <ShareNudge memorial={memorial} showToast={showToast} />
          </div>
        )}

        <div className="share-sheet-footer">
          {screen === "compose" && (
            <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={handleSubmit} disabled={submitting || compressingVideo}>
              {submitting
                ? <><span className="spinner" /> {uploadProgress != null ? `Uploading… ${Math.round(uploadProgress * 100)}%` : "Sharing…"}</>
                : "Share"}
            </button>
          )}
          {screen === "preview" && (
            <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={backFromPreview}>
              {hasDraftContent ? "Back to your draft" : "Write your own"}
            </button>
          )}
        </div>
      </div>

      {showRequestAccess && (
        <AccessRequestModal memorial={memorial} showToast={showToast} onClose={() => setShowRequestAccess(false)} />
      )}

      {canShareMany && (
        <MediaBatchUploader
          ref={batchUploaderRef}
          memorial={memorial}
          mode={isCreator ? "creator" : "contributor"}
          showToast={showToast}
          relationships={relationships}
          creatorRelation={isCreator ? memorial.steward_relation || null : null}
          defaultContact={{ name, relationship, otherRelationshipText }}
          onContactUsed={(c) => { setName(c.name); if (!isCreator) { setRelationship(c.relationship); setOtherRelationshipText(c.otherRelationshipText); } }}
          submittedCode={verifiedCode || null}
          contributeToken={contributeToken}
          onPublished={() => onSubmitted?.()}
          // Done with the batch means done with the sheet too — back to the page.
          onDone={(result) => { if (result) onClose(); }}
        />
      )}
    </div>
  );
}

// "Ask to add a memory" — the escape hatch for a visitor who hits the access
// code field inside ShareMemoryModal without actually having the code. A
// short standalone form (name/email/relationship/note), not the full
// compose flow — uses the plain .share-modal-overlay/.share-modal shell
// rather than the full-screen sheet, since this has nowhere near that much content. A 23505
// (the visitor already has a pending request on file) reads as a fresh
// success — same confirmation either way, so asking twice after some days
// of silence never looks like an error.
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
    // A pending row isn't visible back to anon under RLS (only approved rows
    // are — see the "approved tokens are checkable" policy), so this can't
    // ask for the inserted row back with .select(). Same fix contributions'
    // own pending case needs: a plain insert.
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
              <div className="share-rel-row">
                {relationships.map((r) => (
                  <button key={r.id} type="button" className={`share-rel-pill${relationship === r.id ? " active" : ""}`} onClick={() => setRelationship(r.id)}>
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

// The confirmation screen's quiet third option — reuses the message shape
// and Text/Email/Copy-link actions from the creator's SharePagePanel
// invite flow (../components/SharePagePanel), minus the QR code and
// printable card, which are a steward-side tool for programs and guest
// books and don't apply to a contributor tapping through from their phone
// right after adding a memory.
function ShareNudge({ memorial, showToast }) {
  const [open, setOpen] = useState(false);
  const firstName = memorial.name.split(" ")[0];
  const link = memorialUrl(memorial);
  const message = `I just added a memory of ${firstName}, I bet you have one too: ${link}`;

  const openText = () => {
    trackEvent("share_clicked", { share_option: "text", page_label: memorial.name, source: "contributor_nudge" });
    window.location.href = `sms:&body=${encodeURIComponent(message)}`;
  };
  const openEmail = () => {
    trackEvent("share_clicked", { share_option: "email", page_label: memorial.name, source: "contributor_nudge" });
    window.location.href = `mailto:?subject=${encodeURIComponent(`Would you share a memory of ${memorial.name}?`)}&body=${encodeURIComponent(message)}`;
  };
  const copyLink = () => {
    trackEvent("share_clicked", { share_option: "copy_link", page_label: memorial.name, source: "contributor_nudge" });
    navigator.clipboard.writeText(link).then(() => showToast("Link copied!"));
  };

  return (
    <div className="share-nudge">
      <p className="share-nudge-prompt">Know someone else who has a memory of {firstName}?</p>
      <span className="share-nudge-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "Share the page →"}
      </span>
      {open && (
        <div className="share-nudge-panel fade-in">
          <p className="share-nudge-message">{message}</p>
          <div className="share-nudge-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={openText}>Text</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={openEmail}>Email</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copyLink}>Copy link</button>
          </div>
        </div>
      )}
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
  // Written stories (no attached media) and links get the Stone/Sand
  // "card" treatment — Clay border, Playfair quote mark, Caveat signature
  // — instead of the dark media caption bar photo/video/voicemail tiles use.
  const isCard = s.type === "url" || (s.type === "story" && !s.media_url);
  // A text tile may be showing a truncated preview (see TileStory), so give
  // screen readers the whole memory rather than the visible excerpt.
  const fullTextLabel = isTextTile(s) && s.text ? `${tileLabel} from ${relLabel}: ${s.text}` : undefined;

  return (
    <button
      type="button"
      data-memory-id={s.id}
      aria-label={fullTextLabel}
      className={`mem-tile${isCard ? " mem-tile-card" : ""}${hidden ? " hidden-card" : ""}`}
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

// True when TileBody falls through to the plain text render — i.e. none of
// its media branches below apply.
function isTextTile(s) {
  if (s.type === "url") return !s.link_meta;
  if (["photo", "story", "video", "voice"].includes(s.type)) return !s.media_url;
  return true;
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
  return <TileStory story={s} />;
}

// Text preview. A memory too long for the tile ends on a whole word plus
// the brand dots rather than clipping mid-line — useDotTruncation fills the
// blockquote itself, which is why it's rendered with no children.
function TileStory({ story: s }) {
  const textRef = useDotTruncation(s.text);
  return (
    <div className="mem-tile-body mem-tile-story">
      {s.text ? (
        <>
          <span className="mem-tile-quote-mark" aria-hidden="true">&ldquo;</span>
          <blockquote ref={textRef} />
        </>
      ) : null}
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
  useScrollLock();
  const story = stories[index];
  const touchStartRef = useRef(null);

  // Always wraps — past the last memory back to the first, and back past
  // the first to the last — rather than stopping dead at either end.
  const goPrev = () => onNavigate((index - 1 + stories.length) % stories.length);
  const goNext = () => onNavigate((index + 1) % stories.length);

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
        className="reader-nav prev"
        aria-label="Previous memory"
        onClick={goPrev}
      >
        &lsaquo;
      </button>
      <button
        type="button"
        className="reader-nav next"
        aria-label="Next memory"
        onClick={goNext}
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
    const isRecipe = entryHasTag(s, "Recipe");
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
