import { useState } from "react";
import { memorialUrl } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { colorForContributor, initialsFor } from "./Memorial";

const firstName = (full) => (full || "").trim().split(/\s+/)[0] || "";

// Lands here right after ANY co-steward's first successful accept — gift-
// sourced or a plain dashboard invite, both go through the same
// tryAcceptPendingStewardInvite() in app.jsx, which routes here instead of
// straight to the dashboard now. `memorial` and `stewardNames` come back
// from api/accept-steward-invite.js's own response, no extra fetch needed.
export function CoStewardWelcomePage({ currentUser, memorial, stewardNames, onNavigate, showToast }) {
  const subjectFirst = firstName(memorial.name);
  const myFirst = firstName(currentUser?.email?.split("@")[0]) || "there";
  // The owner is always stewardNames[0] (see accept-steward-invite.js) —
  // the "recipient" this screen's copy refers to.
  const recipientFirst = firstName(stewardNames?.[0]) || "the owner";
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = memorialUrl(memorial);
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      showToast?.("Link copied.");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const inviteByEmail = () => {
    trackEvent("share_clicked", { share_option: "email", page_label: memorial.name, source: "costeward_welcome" });
    const subject = `Help look after ${memorial.name}'s page`;
    const body = `I'm helping look after a page for ${memorial.name} on And Then — you knew them too, so I thought you'd want in: ${inviteLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="costeward-welcome-page">
      <div className="costeward-welcome-inner">
        <div className="gift-review-eyebrow">Welcome, {myFirst}</div>
        <h1 className="gift-review-heading">You're helping {recipientFirst} look after {subjectFirst}'s page</h1>

        {stewardNames?.length > 0 && (
          <div className="costeward-welcome-avatars">
            <div className="dash-avatar-stack">
              {stewardNames.slice(0, 5).map((name) => (
                <span key={name} className="dash-stack-avatar" style={{ background: colorForContributor(name) }} title={name}>{initialsFor(name)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="costeward-step-card">
          <div className="costeward-step-label">Step 1</div>
          <h2 className="costeward-step-title">Start with a memory of your own</h2>
          <p className="costeward-step-body">What did {subjectFirst} do that nobody else would think to mention?</p>
          <div className="costeward-step-actions">
            <button type="button" className="btn-dash-primary" onClick={() => onNavigate("memorial", memorial.invite_code)}>Add a memory</button>
          </div>
        </div>

        <div className="costeward-step-card">
          <div className="costeward-step-label">Step 2</div>
          <h2 className="costeward-step-title">Invite your people</h2>
          <p className="costeward-step-body">
            You know people {recipientFirst} doesn't. Your kids, your in-laws, the neighbors who knew {subjectFirst}. Send them the invite link and they'll go straight to the questions.
          </p>
          <div className="costeward-step-actions">
            <button type="button" className="btn-dash-outline" onClick={copyLink}>{copied ? "Copied!" : "Copy invite link"}</button>
            <button type="button" className="btn-dash-outline" onClick={inviteByEmail}>Invite by email</button>
          </div>
        </div>

        <ul className="costeward-can-list">
          <li>Add photos, stories, voice memos and video</li>
          <li>Invite anyone who knew {subjectFirst}</li>
          <li>Approve memories, if the page is set to review first</li>
          <li>{recipientFirst} owns the page. It never costs you anything.</li>
        </ul>

        <span className="dash-share-more" onClick={() => onNavigate("dashboard")}>Go to the dashboard →</span>
      </div>
    </div>
  );
}
