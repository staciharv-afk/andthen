import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtTime, sendThankYou, notifyCreator, startPageCheckout, FREE_MEMORY_LIMIT } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { useScrollLock } from "../lib/useScrollLock";
import { useBatchUpload } from "../lib/useBatchUpload";
import { useAudioRecorder } from "../lib/useAudioRecorder";
import { shareQuestionsFor } from "../lib/shareQuestions";
import { normalizeShareUrl, publishContributions, loadContributorIdentity, saveContributorIdentity } from "../lib/contributions";
import { AccessRequestModal } from "./AccessRequestModal";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

const MAX_PER_SELECTION = 10;
const MAX_RECORDING_SECONDS = 5 * 60;
const WAVE_BARS = 28;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>{ICON_PATHS[name]}</svg>
);
const ICON_PATHS = {
  photo: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>,
  voicemail: <><circle cx="6.5" cy="12" r="3.5" /><circle cx="17.5" cy="12" r="3.5" /><path d="M6.5 15.5h11" /></>,
  recipe: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  redo: <path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4" />,
};

// Header copy for each "type" screen.
const TYPE_SCREENS = {
  photos: ["Photos and videos", "Pick as many as you like. Stories are optional."],
  write: ["Write it", "A sentence is enough."],
  record: ["Tell it out loud", "Talk like you would at the table. Up to 5 minutes."],
  voicemail: ["Voicemail", "Hearing their voice means a lot to the family."],
  recipe: ["Recipe", "The card itself is part of the memory."],
  link: ["Link", "We'll show a preview on the page."],
};

const memories = (n) => (n === 1 ? "memory" : `${n} memories`);

// "Share a memory" — a two-step flow. Step 1 is a grid of types (photos and
// videos, write, record, voicemail, recipe, link, or a guided question); each
// one adds to a tray, and any mix can go in one submission. Step 2 asks who
// is sharing, once. Design: design/share-a-memory-mobile.html.
//
// One submission writes one contributions row per tray item, all signed the
// same way (see toRow for how each type maps onto type/subtype/tags).
//
// Files start uploading the moment they're picked (useBatchUpload) — photos,
// videos, voicemails, the recording, a recipe card — so sharing only has to
// wait for whatever's left.
//
// The parent mounts this once and keeps it mounted, toggling `open`: closing
// the sheet never throws away a tray, a half-written story, or an upload in
// progress.
export function ShareMemoryModal({ memorial, showToast, open, onClose, onSubmitted, contributeToken, requireCode, verifiedCode, isCreator = false }) {
  useScrollLock(open);
  const firstName = memorial.name.split(" ")[0];
  const { relationships, questionsFor, universal } = shareQuestionsFor(memorial);
  const uploads = useBatchUpload({ pathPrefix: `contributions/${memorial.invite_code}` });
  const upload = (id) => uploads.items.find((u) => u.id === id);

  const [screen, setScreen] = useState("pick");
  const [history, setHistory] = useState([]);
  const [tray, setTray] = useState([]); // see the add* functions for item shapes

  // Drafts — one per type screen, cleared each time that screen is entered.
  const [photoIds, setPhotoIds] = useState([]);
  const [writeText, setWriteText] = useState("");
  const [writeQuestion, setWriteQuestion] = useState(null);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [writePhotoId, setWritePhotoId] = useState(null);
  const [recordQuestion, setRecordQuestion] = useState(null);
  const [voicemailIds, setVoicemailIds] = useState([]);
  const [recipeMode, setRecipeMode] = useState("snap"); // snap | type
  const [recipeIds, setRecipeIds] = useState([]);
  const [recipeName, setRecipeName] = useState("");
  const [recipeBody, setRecipeBody] = useState("");
  const [recipeStory, setRecipeStory] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNote, setLinkNote] = useState("");
  const [linkPreview, setLinkPreview] = useState(null);

  // Guide path
  const [guideRelationship, setGuideRelationship] = useState(null);
  const [questionOffset, setQuestionOffset] = useState(0);

  // Step 2 — prefilled from the last visit on this device.
  const remembered = useRef(loadContributorIdentity(memorial.id)).current;
  const [name, setName] = useState(remembered.name);
  const [relationship, setRelationship] = useState(remembered.relationship);
  const [otherRelationshipText, setOtherRelationshipText] = useState(remembered.otherRelationshipText);
  const [email, setEmail] = useState(remembered.email);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [aboutError, setAboutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [result, setResult] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const overlayRef = useRef();
  const mainRef = useRef();
  const waveRef = useRef();
  const photoInputRef = useRef();
  const writePhotoInputRef = useRef();
  const voicemailInputRef = useRef();
  const recipeInputRef = useRef();
  const recorder = useAudioRecorder({ maxSeconds: MAX_RECORDING_SECONDS, barsRef: waveRef });

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [screen]);

  // Closing the sheet mid-recording lets go of the microphone, and closing
  // it on the thank-you screen means the next open starts a fresh Step 1.
  useEffect(() => {
    if (open) return;
    if (recorder.state === "recording") recorder.reset();
    if (screen === "done") { setResult(null); setHistory([]); setScreen("pick"); }
  }, [open]);

  // On a phone the keyboard covers the bottom of a full-height sheet, and
  // with it the footer button. Size the sheet to the part of the screen
  // that's actually visible instead, and lift the app's toasts clear of the
  // footer while the sheet is up.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("has-share-sheet");
    const vv = window.visualViewport;
    const fit = () => {
      const el = overlayRef.current;
      if (!el || !vv) return;
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    return () => {
      document.body.classList.remove("has-share-sheet");
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
    };
  }, [open]);

  // Link preview — fetched server-side (api/link-preview.js) so obituary and
  // article sites work, not just YouTube. A failed fetch still leaves a
  // shareable link; the card just shows the site name.
  const parsedLink = normalizeShareUrl(linkUrl);
  const linkHref = parsedLink?.href || null;
  useEffect(() => {
    setLinkPreview(null);
    if (!linkHref) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/link-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: linkHref }) });
        if (!res.ok) return;
        const data = await res.json();
        if (!stale) setLinkPreview(data);
      } catch { /* no preview — see above */ }
    }, 500);
    return () => { stale = true; clearTimeout(timer); };
  }, [linkHref]);

  if (!open) return null;

  // ── navigation ────────────────────────────────────────────────────────
  const go = (next) => { setHistory((h) => [...h, screen]); setScreen(next); };

  // Uploads belonging to the draft on `s` (not yet in the tray).
  const draftUploadIds = (s) => ({ photos: photoIds, write: writePhotoId ? [writePhotoId] : [], voicemail: voicemailIds, recipe: recipeIds }[s] || []);

  const back = () => {
    // Backing out of a type screen abandons what was picked there.
    uploads.removeMany(draftUploadIds(screen));
    if (screen === "record") recorder.reset();
    setScreen(history[history.length - 1] || "pick");
    setHistory((h) => h.slice(0, -1));
  };

  // Every type screen starts clean. `question` is set when arriving from the
  // guide path.
  const startType = (type, { question = null, openPicker = false } = {}) => {
    if (type === "photos") { setPhotoIds([]); if (openPicker) photoInputRef.current?.click(); }
    if (type === "write") { setWriteText(""); setWriteQuestion(question); setNudgeIndex(0); setWritePhotoId(null); }
    if (type === "record") { recorder.reset(); setRecordQuestion(question); }
    if (type === "voicemail") setVoicemailIds([]);
    if (type === "recipe") { setRecipeMode("snap"); setRecipeIds([]); setRecipeName(""); setRecipeBody(""); setRecipeStory(""); }
    if (type === "link") { setLinkUrl(""); setLinkNote(""); }
    go(type);
  };

  // ── picking files ─────────────────────────────────────────────────────
  const pickPhotos = (files) => {
    const { ids, overLimit, unsupported } = uploads.addFiles(files, { accept: "media", max: MAX_PER_SELECTION });
    setPhotoIds((cur) => [...cur, ...ids]);
    if (overLimit > 0) showToast(`Added the first ${MAX_PER_SELECTION}. You can add more after these.`);
    else if (!ids.length && unsupported > 0) showToast("Only photos and videos can be added here.", "error");
  };
  const pickWritePhoto = (files) => {
    const { ids } = uploads.addFiles(files, { accept: "image", max: 1 });
    if (!ids.length) return;
    if (writePhotoId) uploads.removeItem(writePhotoId);
    setWritePhotoId(ids[0]);
  };
  const pickVoicemails = (files) => {
    const { ids, unsupported } = uploads.addFiles(files, { accept: "audio" });
    setVoicemailIds((cur) => [...cur, ...ids]);
    if (!ids.length && unsupported > 0) showToast("That doesn't look like an audio file.", "error");
  };
  const pickRecipePhotos = (files) => {
    const { ids } = uploads.addFiles(files, { accept: "image" });
    setRecipeIds((cur) => [...cur, ...ids]);
  };
  const removeDraftUpload = (id, setIds) => { uploads.removeItem(id); setIds((cur) => cur.filter((x) => x !== id)); };

  // A file that can't be used at all (unreadable, a video over the cap) says
  // so on its row and is left out when the rest are added.
  const usable = (ids) => ids.filter((id) => { const u = upload(id); return u && !(u.status === "error" && !u.canRetry); });

  // ── adding to the tray ────────────────────────────────────────────────
  const questionList = questionsFor(guideRelationship || relationship);
  const recordPrompt = recordQuestion || questionList[0];

  const pendingCount = {
    photos: usable(photoIds).length,
    write: writeText.trim() ? 1 : 0,
    record: recorder.state === "done" ? 1 : 0,
    voicemail: usable(voicemailIds).length,
    recipe: recipeMode === "snap" ? usable(recipeIds).length : (recipeName.trim() || recipeBody.trim() ? 1 : 0),
    link: parsedLink ? 1 : 0,
  }[screen] || 0;

  const addToTray = () => {
    let added = [];
    if (screen === "photos") {
      added = usable(photoIds).map((id) => ({ id: uid(), kind: "media", uploadId: id }));
    } else if (screen === "write") {
      const photoId = usable(writePhotoId ? [writePhotoId] : [])[0] || null;
      added = [{ id: uid(), kind: "story", text: writeText.trim(), uploadId: photoId }];
    } else if (screen === "record") {
      const { ids } = uploads.addFiles([recorder.file], { accept: "audio" });
      added = [{ id: uid(), kind: "spoken", uploadId: ids[0], seconds: recorder.seconds }];
      recorder.reset();
    } else if (screen === "voicemail") {
      added = usable(voicemailIds).map((id) => ({ id: uid(), kind: "voicemail", uploadId: id }));
    } else if (screen === "recipe" && recipeMode === "snap") {
      // One memory per card photo (front, back); the story rides on the first.
      added = usable(recipeIds).map((id, i) => ({ id: uid(), kind: "recipePhoto", uploadId: id, text: i === 0 ? recipeStory.trim() : "" }));
    } else if (screen === "recipe") {
      const text = [recipeName.trim(), recipeBody.trim(), recipeStory.trim()].filter(Boolean).join("\n\n");
      added = [{ id: uid(), kind: "recipeText", text }];
    } else if (screen === "link") {
      added = [{
        id: uid(), kind: "link", text: linkNote.trim(), image: linkPreview?.image || null,
        linkMeta: {
          url: parsedLink.href,
          provider: linkPreview?.provider || null,
          videoId: linkPreview?.videoId || null,
          start: linkPreview?.start ?? null,
          title: linkPreview?.title || null,
          hostname: parsedLink.hostname.replace(/^www\./, ""),
        },
      }];
    }
    // Anything picked on this screen that isn't going into the tray is dropped.
    const kept = new Set(added.map((it) => it.uploadId).filter(Boolean));
    uploads.removeMany(draftUploadIds(screen).filter((id) => !kept.has(id)));

    const total = tray.length + added.length;
    setTray((cur) => [...cur, ...added]);
    showToast(total > 1 ? `${total} memories ready. Add more or tap Next.` : "Added. Add more or tap Next.");
    setHistory([]);
    setScreen("pick");
  };

  const removeFromTray = (item) => {
    if (item.uploadId) uploads.removeItem(item.uploadId);
    setTray((cur) => cur.filter((it) => it.id !== item.id));
  };

  const TRAY_LABEL = { story: "Story", spoken: "Spoken", voicemail: "Voicemail", recipePhoto: "Recipe", recipeText: "Recipe", link: "Link" };
  const TRAY_ICON = { story: "pen", spoken: "mic", voicemail: "voicemail", recipePhoto: "recipe", recipeText: "recipe", link: "link" };
  const trayLabel = (item) => (item.kind === "media" ? (upload(item.uploadId)?.kind === "video" ? "Video" : "Photo") : TRAY_LABEL[item.kind]);
  const trayThumb = (item) => (item.kind === "link" ? item.image : upload(item.uploadId)?.thumbUrl) || null;

  // ── sharing ───────────────────────────────────────────────────────────
  const needsCode = requireCode && !verifiedCode;
  const relationLabel = relationship === "other"
    ? otherRelationshipText.trim() || null
    : relationships.find((r) => r.id === relationship)?.label || null;
  const canShare = !!name.trim() && !!relationship && tray.length > 0;

  // How each tray item is stored. Spoken stories and voicemails are both
  // type "voice"; `subtype` is what keeps the page's two filters apart.
  // Recipes are a tag, not a type, so a recipe card is still a photo.
  const toRow = (item) => {
    const u = item.uploadId ? uploads.current().find((x) => x.id === item.uploadId) : null;
    const base = {
      memorial_id: memorial.id,
      contributor_name: name.trim(),
      contributor_relation: relationLabel,
      contributor_email: email.trim() || null,
      type: "story", subtype: null, tags: [],
      text: null, media_url: null, secondary_media_url: null,
      crop_x: null, crop_y: null, link_meta: null,
      submitted_code: verifiedCode || accessCodeInput.trim() || null,
      taken_on: null,
    };
    const photo = u ? { media_url: u.mediaUrl, crop_x: u.cropPos?.x ?? null, crop_y: u.cropPos?.y ?? null, taken_on: u.takenOn || null } : {};
    switch (item.kind) {
      case "media":
        return u.kind === "video"
          ? { ...base, type: "video", text: u.text.trim() || null, media_url: u.mediaUrl, secondary_media_url: u.posterUrl }
          : { ...base, ...photo, type: "photo", text: u.text.trim() || null };
      case "story":
        return u ? { ...base, ...photo, type: "photo", text: item.text } : { ...base, text: item.text };
      case "spoken":
        return { ...base, type: "voice", subtype: "recording", media_url: u.mediaUrl };
      case "voicemail":
        return { ...base, type: "voice", subtype: "voicemail", text: u.text.trim() || null, media_url: u.mediaUrl };
      case "recipePhoto":
        return { ...base, ...photo, type: "photo", tags: ["Recipe"], text: item.text || null };
      case "recipeText":
        return { ...base, tags: ["Recipe"], text: item.text };
      case "link":
        return { ...base, type: "url", text: item.text || null, media_url: item.image, link_meta: item.linkMeta };
      default:
        return base;
    }
  };

  const share = async () => {
    setAboutError("");
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setAboutError("That email doesn't look right."); return; }
    if (needsCode && !accessCodeInput.trim()) { setAboutError("Add the access code."); return; }

    setSubmitting(true);
    try {
      await uploads.whenIdle();
      const failed = tray.filter((it) => it.uploadId && uploads.current().find((u) => u.id === it.uploadId)?.status !== "uploaded");
      if (failed.length) {
        showToast(failed.length === 1 ? "One file didn't upload. Retry it or remove it, then share." : `${failed.length} files didn't upload. Retry or remove them, then share.`, "error");
        setHistory([]);
        setScreen("pick");
        return;
      }

      const saved = await publishContributions({ memorial, rows: tray.map(toRow), isCreator });
      if (!saved.added && !saved.held) throw new Error("nothing saved");

      if (!isCreator && saved.added) notifyCreator(memorial.id);
      if (email.trim() && saved.lastId) sendThankYou(saved.lastId);
      if (contributeToken) {
        // Reusable, so this is pure record-keeping (first-use timestamp).
        supabase.from("access_requests").update({ token_used_at: new Date().toISOString() })
          .eq("contribute_token", contributeToken).is("token_used_at", null).then(() => {});
      }
      trackEvent("memory_submitted", { content_type: tray.length === 1 ? trayLabel(tray[0]) : "mixed", count: tray.length });
      saveContributorIdentity(memorial.id, { name: name.trim(), email: email.trim(), relationship, otherRelationshipText: otherRelationshipText.trim() });

      uploads.removeMany(tray.map((it) => it.uploadId).filter(Boolean));
      setTray([]);
      setHistory([]);
      setResult({ ...saved, count: saved.added });
      setScreen("done");
      onSubmitted?.();
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const unlock = async () => {
    setUnlocking(true);
    const message = await startPageCheckout(memorial.id, BUILD.tier); // null = off to Stripe Checkout
    if (message) { showToast(message, "error"); setUnlocking(false); }
  };

  const shareSomethingElse = () => { setResult(null); setHistory([]); setScreen("pick"); };

  // ── header / footer ───────────────────────────────────────────────────
  const [title, sub] =
    screen === "pick" ? [`Share a memory of ${firstName}`, tray.length ? "Add more, or tap Next when you're done." : "Add one thing or a whole camera roll. You can mix types."]
    : screen === "questions" ? ["Pick a question", "Tell us how you knew them and we'll suggest a few. Any one will do."]
    : screen === "about" ? ["Last step", `So their family knows who shared ${tray.length > 1 ? "these" : "this"}.`]
    : screen === "done" ? ["", ""]
    : TYPE_SCREENS[screen];

  const uploadsBusy = uploads.items.some((u) => u.status !== "uploaded" && u.status !== "error");

  const uploadRow = (id, { label, placeholder, ariaLabel, onRemove, icon }) => {
    const u = upload(id);
    if (!u) return null;
    return (
      <div className="sm-row" key={id}>
        <div className="sm-row-thumb" style={u.thumbUrl ? { backgroundImage: `url(${u.thumbUrl})` } : undefined}>
          {!u.thumbUrl && icon && <Icon name={icon} />}
          {u.kind === "video" && u.thumbUrl && <span className="sm-row-play" aria-hidden="true" />}
          {u.status !== "uploaded" && u.status !== "error" && (
            <span className="sm-row-bar" aria-label={`Uploading, ${Math.round(u.progress * 100)}%`}><i style={{ width: `${Math.round(u.progress * 100)}%` }} /></span>
          )}
        </div>
        <div className="sm-row-body">
          {u.status === "error" ? (
            <>
              <span className="sm-row-error">{u.error}</span>
              {u.canRetry && <button type="button" className="sm-link" onClick={() => uploads.retry(id)}>Retry</button>}
            </>
          ) : (
            <>
              <span className="sm-row-label">{label || u.name}</span>
              {placeholder && (
                <input placeholder={placeholder} aria-label={ariaLabel} value={u.text} onChange={(e) => uploads.updateItem(id, { text: e.target.value })} />
              )}
            </>
          )}
        </div>
        <button type="button" className="sm-row-remove" aria-label="Remove" onClick={onRemove}>&times;</button>
      </div>
    );
  };

  const fileInput = (ref, accept, multiple, onPick) => (
    <input ref={ref} className="sm-file" type="file" accept={accept} multiple={multiple} tabIndex={-1} onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
  );

  const universalPrompt = universal[(questionOffset / 2) % universal.length];
  const universalAction = universalPrompt?.kind === "voice"
    ? { label: "Choose audio file", icon: "voicemail", run: () => startType("voicemail") }
    : { label: universalPrompt?.kind === "video" ? "Choose a video" : "Choose photos", icon: "photo", run: () => startType("photos", { openPicker: true }) };

  return (
    <div className="share-sheet-overlay sm-overlay fade-in" ref={overlayRef} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="share-sheet sm-sheet" role="dialog" aria-label={`Share a memory of ${memorial.name}`}>
        <header className="sm-header">
          {screen !== "pick" && screen !== "done" && (
            <button type="button" className="sm-icon-btn sm-back" aria-label="Back" onClick={back} disabled={submitting}><Icon name="back" size={22} /></button>
          )}
          <div className="sm-heading">
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          <button type="button" className="sm-icon-btn sm-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </header>
        {screen !== "done" && (
          <div className="sm-steps" role="img" aria-label={screen === "about" ? "Step 2 of 2" : "Step 1 of 2"}>
            <i className="on" /><i className={screen === "about" ? "on" : ""} />
          </div>
        )}

        <main className="sm-main" ref={mainRef}>
          {tray.length > 0 && (screen === "pick" || screen === "about") && (
            <div className="sm-tray">
              <div className="sm-tray-head"><b>{tray.length} {tray.length === 1 ? "memory" : "memories"} ready</b><span>Tap x to remove</span></div>
              <div className="sm-tray-items">
                {tray.map((item) => {
                  const u = item.uploadId ? upload(item.uploadId) : null;
                  const thumb = trayThumb(item);
                  const failed = u?.status === "error";
                  return (
                    <div className={`sm-tray-item${failed ? " failed" : ""}`} key={item.id} style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}>
                      {!thumb && <Icon name={TRAY_ICON[item.kind] || "photo"} />}
                      {failed && u.canRetry
                        ? <button type="button" className="sm-tray-tag sm-tray-retry" onClick={() => uploads.retry(u.id)}>Retry</button>
                        : <span className="sm-tray-tag">{trayLabel(item)}</span>}
                      <button type="button" className="sm-tray-remove" aria-label={`Remove ${trayLabel(item).toLowerCase()}`} disabled={submitting} onClick={() => removeFromTray(item)}>&times;</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {screen === "pick" && (
            <div className="sm-grid">
              <button type="button" className="sm-tile sm-tile-big" onClick={() => startType("photos", { openPicker: true })}>
                <span className="sm-tile-icon"><Icon name="photo" /></span>
                <span><b>Photos and videos</b><small>Pick one or many from your phone</small></span>
              </button>
              <button type="button" className="sm-tile" onClick={() => startType("write")}>
                <span className="sm-tile-icon"><Icon name="pen" /></span><span><b>Write it</b><small>A story or a few words</small></span>
              </button>
              <button type="button" className="sm-tile" onClick={() => startType("record")}>
                <span className="sm-tile-icon"><Icon name="mic" /></span><span><b>Tell it out loud</b><small>Record yourself</small></span>
              </button>
              <button type="button" className="sm-tile" onClick={() => startType("voicemail")}>
                <span className="sm-tile-icon"><Icon name="voicemail" /></span><span><b>Voicemail</b><small>An audio file you saved</small></span>
              </button>
              <button type="button" className="sm-tile" onClick={() => startType("recipe")}>
                <span className="sm-tile-icon"><Icon name="recipe" /></span><span><b>Recipe</b><small>Snap the card or type it</small></span>
              </button>
              <button type="button" className="sm-tile" onClick={() => startType("link")}>
                <span className="sm-tile-icon"><Icon name="link" /></span><span><b>Link</b><small>Obituary, YouTube, article</small></span>
              </button>
              <button type="button" className="sm-tile sm-tile-guide" onClick={() => go("questions")}>
                <span className="sm-tile-icon"><Icon name="question" /></span><span><b>Not sure?</b><small>Answer a question</small></span>
              </button>
            </div>
          )}

          {screen === "questions" && (
            <>
              <p className="sm-label sm-label-first">How did you know them?</p>
              <div className="sm-chips sm-chips-gap">
                {relationships.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`sm-chip${guideRelationship === r.id ? " on" : ""}`}
                    // Also the answer to the same question in the last step.
                    onClick={() => { setGuideRelationship(r.id); setRelationship(r.id); setQuestionOffset(0); }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {guideRelationship && (
                <>
                  {[0, 1].map((i) => questionList[(questionOffset + i) % questionList.length]).filter((q, i, all) => q && all.indexOf(q) === i).map((q) => (
                    <div className="sm-question" key={q}>
                      <div className="sm-eyebrow">Question</div>
                      <p>{q}</p>
                      <div className="sm-chips">
                        <button type="button" className="sm-chip sm-chip-action" onClick={() => startType("write", { question: q })}><Icon name="pen" /> Write it</button>
                        <button type="button" className="sm-chip sm-chip-action" onClick={() => startType("record", { question: q })}><Icon name="mic" /> Say it</button>
                      </div>
                    </div>
                  ))}
                  {universalPrompt && (
                    <div className="sm-question">
                      <div className="sm-eyebrow">Question</div>
                      <p>{universalPrompt.text}</p>
                      <div className="sm-chips">
                        <button type="button" className="sm-chip sm-chip-action" onClick={universalAction.run}><Icon name={universalAction.icon} /> {universalAction.label}</button>
                      </div>
                    </div>
                  )}
                  <button type="button" className="sm-link" onClick={() => setQuestionOffset((o) => o + 2)}>Show different questions</button>
                </>
              )}
            </>
          )}

          {screen === "photos" && (
            <>
              <button type="button" className={`sm-drop${photoIds.length ? " compact" : ""}`} onClick={() => photoInputRef.current?.click()}>
                <span className="sm-drop-icon"><Icon name="photo" size={photoIds.length ? 24 : 34} /></span>
                <b>{photoIds.length ? "Add more photos or videos" : "Choose photos and videos"}</b>
                <small>Select as many as you like, up to {MAX_PER_SELECTION} at a time</small>
              </button>
              <div className="sm-rows">
                {photoIds.map((id) => uploadRow(id, {
                  label: "What's happening here?",
                  placeholder: "Optional",
                  ariaLabel: `Story for this ${upload(id)?.kind === "video" ? "video" : "photo"}`,
                  onRemove: () => removeDraftUpload(id, setPhotoIds),
                }))}
              </div>
              {photoIds.length > 0 && <p className="sm-note">Stories are optional. Add one to any photo, or leave them as they are.</p>}
            </>
          )}

          {screen === "write" && (
            <>
              {writeQuestion && (
                <div className="sm-question"><div className="sm-eyebrow">Your question</div><p>{writeQuestion}</p></div>
              )}
              <textarea className="sm-input sm-textarea" autoFocus placeholder="What do you remember?" value={writeText} onChange={(e) => setWriteText(e.target.value)} />
              <div className="sm-write-links">
                <button
                  type="button"
                  className="sm-link"
                  onClick={() => { setWriteQuestion(questionList[nudgeIndex % questionList.length]); setNudgeIndex((i) => i + 1); }}
                >
                  {writeQuestion ? "Try another question" : "Need a nudge?"}
                </button>
                {!writePhotoId && <button type="button" className="sm-link" onClick={() => writePhotoInputRef.current?.click()}>Add a photo</button>}
              </div>
              {writePhotoId && (
                <div className="sm-rows">
                  {uploadRow(writePhotoId, { label: "Photo attached", onRemove: () => { uploads.removeItem(writePhotoId); setWritePhotoId(null); } })}
                </div>
              )}
            </>
          )}

          {screen === "record" && (
            <>
              {recordPrompt && (
                <div className="sm-question"><div className="sm-eyebrow">{recordQuestion ? "Your question" : "Try this"}</div><p>{recordPrompt}</p></div>
              )}
              <div className="sm-record">
                <button
                  type="button"
                  className={`sm-record-btn${recorder.state === "recording" ? " on" : ""}`}
                  aria-label={recorder.state === "recording" ? "Stop recording" : recorder.state === "done" ? "Record again" : "Start recording"}
                  onClick={() => (recorder.state === "recording" ? recorder.stop() : recorder.state === "done" ? recorder.reset() : recorder.start())}
                >
                  <Icon name={recorder.state === "recording" ? "stop" : recorder.state === "done" ? "redo" : "mic"} size={34} />
                </button>
                <div className="sm-wave" ref={waveRef} aria-hidden="true">{Array.from({ length: WAVE_BARS }).map((_, i) => <i key={i} />)}</div>
                <div className="sm-timer" role="status">
                  {recorder.state === "recording" && `Recording  ${fmtTime(recorder.seconds)}  ·  tap to stop`}
                  {recorder.state === "done" && <>Recorded {fmtTime(recorder.seconds)}. <button type="button" className="sm-link" onClick={recorder.reset}>Tap to re-record</button></>}
                  {recorder.state === "idle" && "Tap to start recording"}
                </div>
                {recorder.error && <p className="sm-error">{recorder.error}</p>}
              </div>
            </>
          )}

          {screen === "voicemail" && (
            <>
              <button type="button" className={`sm-drop${voicemailIds.length ? " compact" : ""}`} onClick={() => voicemailInputRef.current?.click()}>
                <span className="sm-drop-icon"><Icon name="voicemail" size={voicemailIds.length ? 24 : 34} /></span>
                <b>{voicemailIds.length ? "Add another audio file" : "Choose an audio file"}</b>
                <small>Saved voicemails, voice memos, .m4a or .mp3</small>
              </button>
              <div className="sm-rows">
                {voicemailIds.map((id) => uploadRow(id, {
                  icon: "voicemail",
                  placeholder: "Who is it from? What's it about? (optional)",
                  ariaLabel: "Note for this audio file",
                  onRemove: () => removeDraftUpload(id, setVoicemailIds),
                }))}
              </div>
              <p className="sm-note">On iPhone: open the voicemail, tap Share, then Save to Files. It will show up here.</p>
            </>
          )}

          {screen === "recipe" && (
            <>
              <div className="sm-seg" role="tablist">
                <button type="button" role="tab" aria-selected={recipeMode === "snap"} className={recipeMode === "snap" ? "on" : ""} onClick={() => setRecipeMode("snap")}>Snap the card</button>
                <button type="button" role="tab" aria-selected={recipeMode === "type"} className={recipeMode === "type" ? "on" : ""} onClick={() => setRecipeMode("type")}>Type it out</button>
              </div>
              {recipeMode === "snap" ? (
                <>
                  <button type="button" className={`sm-drop${recipeIds.length ? " compact" : ""}`} onClick={() => recipeInputRef.current?.click()}>
                    <span className="sm-drop-icon"><Icon name="camera" size={recipeIds.length ? 24 : 34} /></span>
                    <b>{recipeIds.length ? "Add another photo" : "Take or choose a photo"}</b>
                    <small>Handwritten cards look great. Add front and back.</small>
                  </button>
                  <div className="sm-rows">
                    {recipeIds.map((id) => uploadRow(id, { label: "Recipe photo", onRemove: () => removeDraftUpload(id, setRecipeIds) }))}
                  </div>
                </>
              ) : (
                <>
                  <input className="sm-input" placeholder="Recipe name, like Gray cake" aria-label="Recipe name" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
                  <textarea className="sm-input sm-textarea sm-gap-top" placeholder="Ingredients and steps, however you remember them" aria-label="Ingredients and steps" value={recipeBody} onChange={(e) => setRecipeBody(e.target.value)} />
                </>
              )}
              <label className="sm-label" htmlFor="sm-recipe-story">The story behind it <span>(optional)</span></label>
              <input id="sm-recipe-story" className="sm-input" placeholder="When did they make it?" value={recipeStory} onChange={(e) => setRecipeStory(e.target.value)} />
            </>
          )}

          {screen === "link" && (
            <>
              <input className="sm-input" inputMode="url" autoCapitalize="none" autoCorrect="off" autoFocus placeholder="Paste a link" aria-label="Link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              {parsedLink && (
                <div className="sm-preview">
                  <div className="sm-preview-image" style={linkPreview?.image ? { backgroundImage: `url(${linkPreview.image})` } : undefined}>
                    {!linkPreview?.image && <Icon name="link" size={36} />}
                  </div>
                  <div className="sm-preview-text">
                    <small>{linkPreview?.provider === "youtube" ? "YouTube" : parsedLink.hostname.replace(/^www\./, "")}</small>
                    <b>{linkPreview?.title || parsedLink.href}</b>
                  </div>
                </div>
              )}
              <label className="sm-label" htmlFor="sm-link-note">Why are you sharing it? <span>(optional)</span></label>
              <input id="sm-link-note" className="sm-input" placeholder="A line or two" value={linkNote} onChange={(e) => setLinkNote(e.target.value)} />
            </>
          )}

          {screen === "about" && (
            <>
              <label className="sm-label sm-label-first" htmlFor="sm-name">Your name</label>
              <input id="sm-name" className="sm-input" autoComplete="name" placeholder="First name is fine" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="sm-label">How did you know them?</p>
              <div className="sm-chips">
                {relationships.map((r) => (
                  <button key={r.id} type="button" className={`sm-chip${relationship === r.id ? " on" : ""}`} aria-pressed={relationship === r.id} onClick={() => setRelationship(r.id)}>{r.label}</button>
                ))}
              </div>
              {relationship === "other" && (
                <input className="sm-input sm-gap-top" placeholder="How did you know them? (optional)" aria-label="How did you know them?" value={otherRelationshipText} onChange={(e) => setOtherRelationshipText(e.target.value)} />
              )}
              <label className="sm-label" htmlFor="sm-email">Email <span>(optional)</span></label>
              <input id="sm-email" className="sm-input" type="email" autoComplete="email" placeholder="So we can tell you when it's added" value={email} onChange={(e) => { setEmail(e.target.value); setAboutError(""); }} />
              {needsCode && (
                <>
                  <label className="sm-label" htmlFor="sm-code">Access code</label>
                  <input id="sm-code" className="sm-input" autoCapitalize="characters" autoCorrect="off" placeholder="Ask the family if you don't have it" value={accessCodeInput} onChange={(e) => { setAccessCodeInput(e.target.value); setAboutError(""); }} />
                  <button type="button" className="sm-link sm-gap-top" onClick={() => setShowRequestAccess(true)}>Don't have the code? Ask for access</button>
                </>
              )}
              {aboutError && <p className="sm-error">{aboutError}</p>}
              <p className="sm-note">We'll remember you on this device next time. No account needed.</p>
            </>
          )}

          {screen === "done" && result && (
            <div className="sm-done">
              <span className="sm-done-dots" aria-hidden="true"><i /><i /><i /></span>
              <h2>Thank you, {name.trim().split(" ")[0]}.</h2>
              {result.count > 0 && (
                <p>
                  {result.moderated
                    ? `Their family will see ${result.count === 1 ? "it" : "these"} soon.`
                    : `${result.count === 1 ? "It's" : "They've"} been added to ${firstName}'s page.`}
                </p>
              )}
              {result.held > 0 && (
                <div className="batch-unlock sm-gap-top">
                  <p>Your free page holds {FREE_MEMORY_LIMIT} memories. Unlock the rest for {BUILD.price}, one time, forever.</p>
                  <p className="batch-unlock-sub">{result.held} more {result.held === 1 ? "is" : "are"} saved and will show up on {firstName}'s page as soon as it's unlocked.</p>
                  <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={unlock} disabled={unlocking}>
                    {unlocking ? <><span className="spinner" /> Starting…</> : "Unlock the rest"}
                  </button>
                </div>
              )}
              {result.unsaved > 0 && <p>Your free page holds {FREE_MEMORY_LIMIT} memories, so {result.unsaved} {result.unsaved === 1 ? "wasn't" : "weren't"} added.</p>}
            </div>
          )}
        </main>

        {screen !== "questions" && (
          <footer className="sm-footer">
            {screen === "pick" && (
              <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" disabled={!tray.length} onClick={() => go("about")}>Next</button>
            )}
            {TYPE_SCREENS[screen] && (
              <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" disabled={!pendingCount} onClick={addToTray}>
                {pendingCount > 1 ? `Add ${pendingCount} to my memories` : "Add to my memories"}
              </button>
            )}
            {screen === "about" && (
              <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" disabled={!canShare || submitting} onClick={share}>
                {submitting
                  ? <><span className="spinner" /> {uploadsBusy ? "Finishing uploads…" : "Sharing…"}</>
                  : `Share ${memories(tray.length)}`}
              </button>
            )}
            {screen === "done" && (
              <>
                <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={shareSomethingElse}>Share something else</button>
                <button type="button" className="sm-ghost" onClick={onClose}>See their page</button>
              </>
            )}
          </footer>
        )}

        {fileInput(photoInputRef, "image/*,video/*", true, pickPhotos)}
        {fileInput(writePhotoInputRef, "image/*", false, pickWritePhoto)}
        {fileInput(voicemailInputRef, "audio/*", true, pickVoicemails)}
        {fileInput(recipeInputRef, "image/*", true, pickRecipePhotos)}
      </div>

      {showRequestAccess && (
        <AccessRequestModal memorial={memorial} showToast={showToast} onClose={() => setShowRequestAccess(false)} />
      )}
    </div>
  );
}
