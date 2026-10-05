import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { FREE_MEMORY_LIMIT, sendThankYou, notifyCreator, startPageCheckout } from "../lib/utils";
import { publishContributions } from "../lib/contributions";
import { trackEvent } from "../lib/analytics";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { useScrollLock } from "../lib/useScrollLock";
import { useBatchUpload } from "../lib/useBatchUpload";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

export const BATCH_LIMIT = { creator: 50, contributor: 10 };
export const ADD_MEDIA_LABEL = "Add photos and videos";

const CREATOR_NAME_KEY = "andthen_creator_name";
const readCreatorName = () => { try { return localStorage.getItem(CREATOR_NAME_KEY) || ""; } catch { return ""; } };
const saveCreatorName = (name) => { try { localStorage.setItem(CREATOR_NAME_KEY, name); } catch { /* storage unavailable — they'll just be asked again */ } };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const mediaCount = (list) => {
  const photos = list.filter((it) => it.kind === "photo").length;
  const videos = list.length - photos;
  return [photos && plural(photos, "photo", "photos"), videos && plural(videos, "video", "videos")].filter(Boolean).join(", ");
};

// Add many photos and videos at once — the creator's fast path, behind
// the first-photos step after a page is created (FirstPhotos.jsx) and the
// "Add photos and videos" buttons (Memorial.jsx, Dashboard.jsx). Contributors
// add photos through the share-a-memory sheet instead (ShareMemoryModal),
// which runs on the same upload queue; the "contributor" mode here is kept
// for any future standalone use.
//
// Mount it once next to whatever button opens it and keep a ref:
//   ref.current.openPicker()    — opens the phone's/computer's file picker
//   ref.current.addFiles(files) — for a drop zone, or files already picked
// It renders nothing visible until there's a batch to review. Uploading
// starts as soon as files are picked (useBatchUpload); this component is the
// review grid, the once-per-batch contact fields, and the publish step.
//
// mode "creator": up to 50 at a time, published straight to the page (a
//   page's moderation setting is for other people's memories, not the
//   creator's own). On a free page, anything past the free limit is saved as
//   'held' and released when the page is paid for (see the
//   20261004_batch_upload.sql migration).
// mode "contributor": up to 10, name + relationship (+ optional email) asked
//   once for the whole batch, and the page's moderation setting applies.
//
// Each file becomes its own ordinary contributions row — type photo/video,
// with `text` set when a story was written for it.
export const MediaBatchUploader = forwardRef(function MediaBatchUploader(
  { memorial, mode, showToast, relationships = [], creatorRelation = null, defaultContact, onContactUsed, submittedCode = null, contributeToken = null, onPublished, onDone },
  ref
) {
  const isCreator = mode === "creator";
  const limit = BATCH_LIMIT[mode];
  const firstName = memorial.name.split(" ")[0];
  const batch = useBatchUpload({ pathPrefix: `contributions/${memorial.invite_code}` });
  const { items } = batch;

  const [screen, setScreen] = useState("review"); // review | done
  const [notice, setNotice] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // { added: [...], held: [...], unsaved, moderated }
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState(null);
  const [otherRelationshipText, setOtherRelationshipText] = useState("");
  const [email, setEmail] = useState("");

  const inputRef = useRef();
  const nameRef = useRef();
  const wasOpen = useRef(false);

  const open = items.length > 0 || screen === "done";
  useScrollLock(open);

  const addFiles = (fileList) => {
    // First files of a fresh batch: start from whatever the surrounding
    // form already knows about this person.
    if (!wasOpen.current) {
      wasOpen.current = true;
      setScreen("review");
      setResult(null);
      setErrors({});
      setName(defaultContact?.name || (isCreator ? readCreatorName() : ""));
      setRelationship(defaultContact?.relationship || null);
      setOtherRelationshipText(defaultContact?.otherRelationshipText || "");
    }
    const { ids, overLimit, unsupported } = batch.addFiles(fileList, { max: limit - batch.current().length });
    const added = ids.length;
    if (overLimit > 0) setNotice(`You can add ${limit} at a time. We kept the first ${limit} and left out the other ${overLimit}.`);
    else if (!added && unsupported > 0) showToast("Only photos and videos can be added here.", "error");
    else setNotice("");
    if (!added && !batch.current().length) wasOpen.current = false;
  };

  useImperativeHandle(ref, () => ({
    openPicker: () => inputRef.current?.click(),
    addFiles,
  }));

  const close = () => {
    wasOpen.current = false;
    batch.removeMany(batch.current().map((it) => it.id));
    setScreen("review");
    setNotice("");
    onDone?.(result);
  };

  const requestClose = () => {
    if (publishing) return;
    if (screen === "review" && items.length && !window.confirm("Leave without adding these?")) return;
    close();
  };

  const uploaded = items.filter((it) => it.status === "uploaded").length;
  const failed = items.filter((it) => it.status === "error");
  const inFlight = items.length - uploaded - failed.length;
  const withStories = items.filter((it) => it.text.trim()).length;
  const overallProgress = items.length ? items.reduce((sum, it) => sum + (it.status === "uploaded" ? 1 : it.status === "uploading" ? it.progress : 0), 0) / items.length : 0;

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Add your name.";
    if (!isCreator && (!relationship || (relationship === "other" && !otherRelationshipText.trim()))) next.relationship = `Choose how you knew ${firstName}.`;
    if (!isCreator && email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = "That email doesn't look right.";
    setErrors(next);
    if (Object.keys(next).length) nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !Object.keys(next).length;
  };

  const publish = async () => {
    if (!validate()) return;
    setPublishing(true);
    try {
      await batch.whenIdle();
      const ready = batch.current().filter((it) => it.status === "uploaded");
      if (!ready.length) { showToast("Nothing has uploaded yet. Retry the ones marked below.", "error"); return; }

      const relLabel = isCreator
        ? creatorRelation
        : relationship === "other" ? otherRelationshipText.trim() : relationships.find((r) => r.id === relationship)?.label || null;
      const toRow = (it) => ({
        memorial_id: memorial.id,
        contributor_name: name.trim(),
        contributor_relation: relLabel,
        contributor_email: isCreator ? null : email.trim() || null,
        type: it.kind,
        subtype: null,
        tags: [],
        text: it.text.trim() || null,
        media_url: it.mediaUrl,
        secondary_media_url: it.posterUrl,
        crop_x: it.cropPos?.x ?? null,
        crop_y: it.cropPos?.y ?? null,
        link_meta: null,
        submitted_code: submittedCode,
        taken_on: it.takenOn || null,
      });

      // Free page: published up to the limit in the order shown, the rest held.
      const saved = await publishContributions({ memorial, rows: ready.map(toRow), isCreator });
      const live = ready.slice(0, saved.added);
      const held = ready.slice(saved.added, saved.added + saved.held);
      const { unsaved, lastId } = saved;

      if (isCreator) saveCreatorName(name.trim());
      else if (live.length) {
        notifyCreator(memorial.id);
        if (email.trim() && lastId) sendThankYou(lastId);
        if (contributeToken) {
          supabase.from("access_requests").update({ token_used_at: new Date().toISOString() })
            .eq("contribute_token", contributeToken).is("token_used_at", null).then(() => {});
        }
      }
      trackEvent("memory_submitted", { content_type: "bulk_upload", count: live.length + held.length });
      onContactUsed?.({ name: name.trim(), relationship, otherRelationshipText });

      const outcome = { added: live, held, unsaved, moderated: saved.moderated };
      batch.removeMany([...live, ...held].map((it) => it.id));
      setResult(outcome);
      setScreen("done");
      onPublished?.(outcome);
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const unlock = async () => {
    setUnlocking(true);
    const message = await startPageCheckout(memorial.id, BUILD.tier); // null = off to Stripe Checkout
    if (message) { showToast(message, "error"); setUnlocking(false); }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (screen === "review" && !publishing) addFiles(e.dataTransfer.files);
  };

  const title = isCreator ? ADD_MEDIA_LABEL : `Share photos or videos of ${firstName}`;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />

      {open && (
        <div className="share-sheet-overlay fade-in">
          <div
            className={`share-sheet batch-sheet${dragOver ? " drag-over" : ""}`}
            role="dialog"
            aria-label={title}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <div className="share-sheet-header">
              <h2>{title}</h2>
              <button type="button" className="share-sheet-close" aria-label="Close" onClick={requestClose}>&times;</button>
            </div>

            {screen === "review" && (
              <div className="share-sheet-body">
                <div className="batch-tray" role="status">
                  <div className="batch-tray-line">
                    <span>
                      {inFlight > 0
                        ? `Uploading ${uploaded + failed.length + 1} of ${items.length}`
                        : failed.length === 0 ? `All ${items.length} uploaded` : `${uploaded} of ${items.length} uploaded`}
                    </span>
                    {failed.length > 0 && <span className="batch-tray-failed">{failed.length} didn't upload</span>}
                  </div>
                  <div className="batch-tray-bar"><span style={{ width: `${Math.round(overallProgress * 100)}%` }} /></div>
                </div>

                {notice && <p className="batch-notice">{notice}</p>}

                <p className="batch-count">
                  {mediaCount(items)}{withStories > 0 ? `, ${withStories} with ${withStories === 1 ? "a story" : "stories"}` : ""}.
                </p>

                <div className="batch-grid">
                  {items.map((it) => (
                    <BatchItem key={it.id} item={it} disabled={publishing} onChange={batch.updateItem} onRemove={batch.removeItem} onRetry={batch.retry} />
                  ))}
                </div>

                {items.length < limit && (
                  <button type="button" className="share-attach-choice batch-add-more" disabled={publishing} onClick={() => inputRef.current?.click()}>
                    Add more
                  </button>
                )}

                <div className="share-signature-divider" />
                <div className="share-signature" ref={nameRef}>
                  <div className="share-signature-field">
                    <label htmlFor="batch-name">Your name</label>
                    <input id="batch-name" className="share-signature-input" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: null })); }} />
                  </div>
                  {errors.name && <p className="share-error">{errors.name}</p>}
                  {!isCreator && (
                    <>
                      <div className="share-signature-field">
                        <label htmlFor="batch-email">Your email</label>
                        <input id="batch-email" className="share-signature-input" type="email" placeholder="Optional" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((er) => ({ ...er, email: null })); }} />
                      </div>
                      {errors.email && <p className="share-error">{errors.email}</p>}
                    </>
                  )}
                </div>

                {!isCreator && (
                  <div className="share-field-section">
                    <label className="form-label">How did you know {firstName}?</label>
                    <div className="share-rel-row">
                      {relationships.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`share-rel-pill${relationship === r.id ? " active" : ""}`}
                          onClick={() => { setRelationship(r.id); setErrors((er) => ({ ...er, relationship: null })); }}
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
                )}
              </div>
            )}

            {screen === "done" && result && (
              <div className="share-sheet-body">
                <div className="share-thanks-icon">&#10003;</div>
                {result.added.length > 0 ? (
                  <>
                    <h2 style={{ textAlign: "center" }}>{mediaCount(result.added)} {result.moderated ? "sent" : "added"}.</h2>
                    <p className="share-thanks-text">
                      {result.moderated
                        ? `Thank you — ${firstName}'s family will see ${result.added.length === 1 ? "this" : "these"} soon.`
                        : `${result.added.length === 1 ? "It's" : "They've"} been added to ${firstName}'s page.`}
                    </p>
                  </>
                ) : (
                  <h2 style={{ textAlign: "center" }}>{mediaCount(result.held)} saved.</h2>
                )}

                {result.held.length > 0 && (
                  <div className="batch-unlock">
                    <p>Your free page holds {FREE_MEMORY_LIMIT} memories. Unlock the rest for {BUILD.price}, one time, forever.</p>
                    <p className="batch-unlock-sub">
                      {plural(result.held.length, "more is", "more are")} saved and will show up on {firstName}'s page as soon as it's unlocked.
                    </p>
                    <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={unlock} disabled={unlocking}>
                      {unlocking ? <><span className="spinner" /> Starting…</> : "Unlock the rest"}
                    </button>
                  </div>
                )}
                {result.unsaved > 0 && (
                  <p className="share-thanks-text">
                    Your free page holds {FREE_MEMORY_LIMIT} memories, so {plural(result.unsaved, "other wasn't", "others weren't")} added.
                  </p>
                )}
                {items.length > 0 && (
                  <span className="share-back-link" onClick={() => setScreen("review")}>
                    {plural(items.length, "file", "files")} didn't upload. Go back and retry.
                  </span>
                )}
              </div>
            )}

            <div className="share-sheet-footer">
              {screen === "review" && (
                <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={publish} disabled={publishing || items.length === failed.length}>
                  {publishing
                    ? <><span className="spinner" /> {inFlight > 0 ? `Finishing uploads… ${uploaded} of ${items.length}` : "Adding…"}</>
                    : "Add all"}
                </button>
              )}
              {screen === "done" && (
                <button type="button" className={`mkt-btn share-cta-btn ${result?.held.length ? "mkt-btn-ghost" : "mkt-btn-solid"}`} onClick={close}>
                  {isCreator ? "Done" : `Back to ${firstName}'s page`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// One file in the review grid: thumbnail with its upload state, an optional
// one-line story, and the date it was taken (from EXIF when there is one).
function BatchItem({ item: it, disabled, onChange, onRemove, onRetry }) {
  return (
    <div className={`batch-item batch-item-${it.status}`}>
      <div className="batch-thumb">
        {it.thumbUrl ? <img src={it.thumbUrl} alt="" /> : <span className="batch-thumb-blank" aria-hidden="true" />}
        {it.kind === "video" && it.thumbUrl && <span className="batch-thumb-video" aria-hidden="true" />}
        {(it.status === "preparing" || it.status === "queued") && <span className="batch-thumb-status"><span className="spinner" /></span>}
        {it.status === "uploading" && (
          <span className="batch-thumb-progress" aria-label={`Uploading, ${Math.round(it.progress * 100)}%`}>
            <span style={{ width: `${Math.round(it.progress * 100)}%` }} />
          </span>
        )}
        {it.status === "error" && (
          <span className="batch-thumb-status batch-thumb-error">
            <span>{it.error}</span>
            {it.canRetry && <button type="button" className="batch-retry" onClick={() => onRetry(it.id)}>Retry</button>}
          </span>
        )}
        {!disabled && (
          <button type="button" className="batch-thumb-remove" aria-label={`Remove ${it.name || "this file"}`} onClick={() => onRemove(it.id)}>&times;</button>
        )}
      </div>
      <input
        className="batch-story"
        placeholder="What's happening here?"
        aria-label="What's happening here?"
        value={it.text}
        disabled={disabled}
        onChange={(e) => onChange(it.id, { text: e.target.value })}
      />
      <input
        className="batch-date"
        type="date"
        aria-label="Date taken"
        value={it.takenOn}
        disabled={disabled}
        onChange={(e) => onChange(it.id, { takenOn: e.target.value })}
      />
    </div>
  );
}
