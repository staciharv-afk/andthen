import { useState } from "react";
import { supabase } from "../lib/supabase";
import { notifyAccessRequest } from "../lib/utils";
import { SHARE_QUESTION_BANK, deriveSubjectType } from "../lib/shareQuestions";

// "Ask to add a memory" — the escape hatch for a visitor who hits the access
// code field in ShareMemoryModal's last step without actually having the code. A
// short standalone form (name/email/relationship/note), not the full
// compose flow — uses the plain .share-modal-overlay/.share-modal shell
// rather than the full-screen sheet, since this has nowhere near that much content. A 23505
// (the visitor already has a pending request on file) reads as a fresh
// success — same confirmation either way, so asking twice after some days
// of silence never looks like an error.
export function AccessRequestModal({ memorial, showToast, onClose }) {
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
