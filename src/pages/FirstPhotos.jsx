import { useRef, useState } from "react";
import { MediaBatchUploader, ADD_MEDIA_LABEL } from "../components/MediaBatchUploader";

// The step between the onboarding intro (name, relationship, description)
// and the page itself: "Start with a few photos of [Name]." The page already
// exists by the time this renders — it's created the moment the magic link
// signs the creator in (see finishSignIn in app.jsx), because nothing can be
// uploaded or saved before there's a signed-in steward to own it.
// Either way out (published a batch, or "I'll do this later") lands on the
// page.
export function FirstPhotosPage({ memorial, showToast, onContinue }) {
  const uploaderRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const firstName = memorial.name.split(" ")[0];

  return (
    <div className="auth-page onboarding-page">
      <div
        className={`auth-card onboarding-card onboarding-card-wide first-photos-drop fade-up${dragOver ? " drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploaderRef.current?.addFiles(e.dataTransfer.files); }}
      >
        <div className="auth-logo"><em>And Then...</em></div>
        <h1 className="onboarding-headline">Start with a few photos of {firstName}.</h1>
        <p className="auth-tagline">Pick as many as you like. You can add stories now or later.</p>
        <button className="btn btn-rust btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={() => uploaderRef.current?.openPicker()}>
          {ADD_MEDIA_LABEL}
        </button>
        <button type="button" className="first-photos-skip" onClick={onContinue}>I'll do this later</button>
      </div>

      <MediaBatchUploader
        ref={uploaderRef}
        memorial={memorial}
        mode="creator"
        showToast={showToast}
        creatorRelation={memorial.steward_relation || null}
        // Closing the review without publishing stays on this step; only a
        // finished batch moves on to the page.
        onDone={(result) => { if (result) onContinue(); }}
      />
    </div>
  );
}
