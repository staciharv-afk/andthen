import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate } from "../lib/utils";
import { colorForContributor, initialsFor } from "./Memorial";

const firstName = (full) => (full || "").trim().split(/\s+/)[0] || "";

// Shown right after a gift claim (app.jsx's finishSignIn, when
// api/claim-gift.js reports suggested co-stewards) and reachable again
// later from the dashboard's "Waiting on you" → "Suggested by {giver}" →
// Review. Both paths land here with just the memorial — this always
// self-fetches the current suggestion list via
// api/get-gift-costeward-suggestions.js, so there's one source of truth
// regardless of how someone arrived. Sending is the one moment any of
// these people are actually contacted (api/send-gift-costeward-invites.js).
export function GiftCostewardReviewPage({ memorial, onNavigate, showToast }) {
  const subjectFirst = firstName(memorial.name);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [gifterName, setGifterName] = useState(null);
  const [gifterEmail, setGifterEmail] = useState(null);
  const [gifterWantsCosteward, setGifterWantsCosteward] = useState(false);
  const [gifterChecked, setGifterChecked] = useState(false); // unchecked by default even if offered
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentNames, setSentNames] = useState(null); // null until sent

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        const res = await fetch("/api/get-gift-costeward-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ memorialId: memorial.id }),
        });
        const data = await res.json();
        const rows = data.suggestedCostewards || [];
        setSuggestions(rows);
        setChecked(new Set(rows.map((r) => r.id))); // all checked by default
        setGifterName(data.gifterName || null);
        setGifterEmail(data.gifterEmail || null);
        setGifterWantsCosteward(!!data.gifterWantsCosteward);
      } catch {
        showToast?.("Couldn't load the suggested co-stewards.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [memorial.id]);

  const toggle = (id) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalToSend = checked.size + (gifterWantsCosteward && gifterChecked ? 1 : 0);

  const handleSend = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sentIds = suggestions.filter((s) => checked.has(s.id)).map((s) => s.id);
      const declinedIds = suggestions.filter((s) => !checked.has(s.id)).map((s) => s.id);

      const res = await fetch("/api/send-gift-costeward-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          memorialId: memorial.id,
          sentIds,
          declinedIds,
          includeGifter: gifterWantsCosteward && gifterChecked,
        }),
      });
      const data = await res.json();
      setSentNames(data?.sentNames?.length ? data.sentNames : suggestions.filter((s) => checked.has(s.id)).map((s) => s.name));
    } catch {
      showToast?.("Something went wrong sending those invites. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const listNames = (names) => {
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  };

  if (loading) {
    return (
      <div className="gift-review-page">
        <div className="gift-review-inner" style={{ textAlign: "center" }}><span className="spinner spinner-dark" /></div>
      </div>
    );
  }

  if (sentNames) {
    return (
      <div className="gift-review-page">
        <div className="gift-review-inner">
          <div className="gift-review-eyebrow">All set</div>
          <h1 className="gift-review-heading">Sent to {listNames(sentNames)}</h1>
          <p className="gift-review-helper">They'll each get their own link to help look after {subjectFirst}'s page.</p>
          <div className="dash-card" style={{ marginBottom: 16 }}>
            <div className="dash-settings-label" style={{ marginBottom: 6 }}>Add a memory</div>
            <p className="dash-settings-helper" style={{ marginBottom: 12 }}>
              What's something about {subjectFirst} that only you would know?
            </p>
            <button type="button" className="btn-dash-primary" onClick={() => onNavigate("dashboard")}>Add a memory</button>
          </div>
          <span className="dash-share-more" onClick={() => onNavigate("dashboard")}>Go to my dashboard →</span>
        </div>
      </div>
    );
  }

  return (
    <div className="gift-review-page">
      <div className="gift-review-inner">
        <div className="gift-review-eyebrow">A gift from {gifterName || "someone who loves them"}</div>

        <div className="dash-page-card" style={{ marginBottom: 20 }}>
          <div className="dash-page-card-top">
            <div className="dash-page-thumb">
              {memorial.photo_url ? <img src={memorial.photo_url} alt="" style={{ objectPosition: `${memorial.crop_x ?? 50}% ${memorial.crop_y ?? 50}%` }} /> : <span aria-hidden="true">🕊️</span>}
            </div>
            <div className="dash-page-card-info">
              <div className="dash-page-name">{memorial.name}</div>
              {(memorial.born || memorial.passed) && (
                <div className="dash-page-dates">{fmtDate(memorial.born)}{memorial.born && memorial.passed && " – "}{fmtDate(memorial.passed)}</div>
              )}
            </div>
          </div>
        </div>

        <h1 className="gift-review-heading">{gifterName || "They"} suggested these co-stewards</h1>
        <p className="gift-review-helper">
          Co-stewards help you look after {subjectFirst}'s page. Each of them can add memories, invite the people they know and approve what comes in. You stay the owner.
        </p>

        <div className="dash-card dash-stewards-card" style={{ marginBottom: 16 }}>
          {suggestions.map((s) => (
            <div className="gift-costeward-check-row" key={s.id}>
              <span className="dash-init-avatar" style={{ background: colorForContributor(s.name) }}>{initialsFor(s.name)}</span>
              <div className="gift-costeward-check-info">
                <div className="gift-costeward-check-name">{s.name}</div>
                <div className="gift-costeward-check-status">{checked.has(s.id) ? "Help look after the page" : "Won't be invited"}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}

          {gifterWantsCosteward && (
            <div className="gift-costeward-check-row" style={{ borderTop: suggestions.length ? "1px solid var(--warm-faint)" : "none" }}>
              <span className="dash-init-avatar" style={{ background: colorForContributor(gifterName || "?") }}>{initialsFor(gifterName || "?")}</span>
              <div className="gift-costeward-check-info">
                <div className="gift-costeward-check-name">{gifterName || "The gifter"} would like to help too</div>
                <div className="gift-costeward-check-status">{gifterChecked ? "Gave you this page" : "Won't be invited"}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={gifterChecked} onChange={(e) => setGifterChecked(e.target.checked)} disabled={!gifterEmail} />
                <span className="toggle-slider" />
              </label>
            </div>
          )}
        </div>

        <div className="gift-review-email-preview">
          <button type="button" className="gift-review-email-toggle" onClick={() => setShowEmailPreview((v) => !v)}>
            {showEmailPreview ? "Hide" : "See"} the email they'll get
          </button>
          {showEmailPreview && (
            <div className="gift-review-email-body">
{`From: You via And Then
Subject: A page for ${subjectFirst}, and you're part of it

Hi [name],

You made this for ${subjectFirst}, and want them to have it too. It's one place for everything we remember about ${subjectFirst}, from all of us and everyone who knew them. They can add their own memories, invite people and help you look after it.

Open ${subjectFirst}'s page: [link]

Love, you

No account needed. This link is just for you.`}
            </div>
          )}
        </div>

        <p className="gift-review-footer-note">
          {gifterName || "They"} covered the page for good, so there's nothing to pay. Only you can delete it. Anyone you uncheck won't be told.
        </p>

        <button type="button" className="mkt-btn mkt-btn-solid share-cta-btn" onClick={handleSend} disabled={sending || totalToSend === 0}>
          {sending ? <><span className="spinner" /> Sending…</> : totalToSend === 0 ? "Choose who to invite" : `Send to ${totalToSend} ${totalToSend === 1 ? "person" : "people"}`}
        </button>
        <span className="dash-share-more" onClick={() => onNavigate("dashboard")}>Not now. Take me to the page</span>
      </div>
    </div>
  );
}
