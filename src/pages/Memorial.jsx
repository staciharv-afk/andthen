import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo, fmtTime, FREE_MEMORY_LIMIT } from "../lib/utils";
import { MemoryLimitModal } from "../components/MemoryLimitModal";
import { MediaBatchUploader, ADD_MEDIA_LABEL } from "../components/MediaBatchUploader";
import { ShareMemoryModal } from "../components/ShareMemoryModal";
import { loadContributorIdentity } from "../lib/contributions";
import { useScrollLock } from "../lib/useScrollLock";
import { useDotTruncation } from "../lib/useDotTruncation";

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

export function MemorialPage({ inviteCode, showToast, onNavigate, currentUser }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  // ShareMemoryModal is mounted once (contributeMounted) and then kept in
  // the tree for the rest of this page visit — showContribute just toggles
  // its visibility. That's what lets a contributor close the sheet to look
  // at the page and come back to the same tray, half-written story and
  // in-progress uploads (picked files can't be serialized to storage).
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
          // Just hides the sheet — refreshStories already ran from
          // onSubmitted the moment a memory was actually added, so this is
          // only about the free-tier upgrade nudge, which stays deferred to
          // an actual close (not mid-thanks-screen) same as before.
          onClose={async () => {
            setShowContribute(false);
            if ((await refreshFreeContributionCount()) >= FREE_MEMORY_LIMIT) setShowMemoryLimit(true);
          }}
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
          defaultContact={{ name: loadContributorIdentity(memorial.id).name }}
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
          {story.text && <blockquote className={`reader-text${entryHasTag(story, "Recipe") ? " reader-text-recipe" : ""}`}>{story.text}</blockquote>}
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
