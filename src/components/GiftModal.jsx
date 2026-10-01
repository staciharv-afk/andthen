import { useState } from "react";
import { useScrollLock } from "../lib/useScrollLock";
import { savePendingGiftConfirmation } from "../lib/pendingGiftConfirmation";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_COSTEWARDS = 6;
const firstName = (full) => (full || "").trim().split(/\s+/)[0] || "";
const uidLocal = () => Math.random().toString(36).slice(2, 10);

// Opened from the Pricing page's gift pill. A single gift-details form that
// starts a hosted Stripe Checkout via api/create-gift-checkout.js and
// redirects there. No account needed to buy a gift, same as the pre-signup
// $49 flow. (Someone buying for themselves just uses the $49 card the pill
// sits under — no "for me" branch here.)
//
// "Add co-stewards" suggests people (e.g. the recipient's siblings) who get
// the same access to the page once the recipient reviews and confirms —
// nobody on that list is contacted at purchase time. See
// api/stripe-webhook.js (stages the suggestions), api/claim-gift.js (links
// them to the real memorial), and api/send-gift-costeward-invites.js (the
// only place any of them are actually emailed).
export function GiftModal({ onClose }) {
  const [subjectName, setSubjectName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [gifterName, setGifterName] = useState("");
  const [gifterEmail, setGifterEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [costewards, setCostewards] = useState([{ id: uidLocal(), name: "", email: "" }]);
  const [gifterWantsCosteward, setGifterWantsCosteward] = useState(false);
  useScrollLock();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const recipientFirst = firstName(recipientName) || "them";

  const updateRow = (id, field, value) => {
    setCostewards((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const addRow = () => {
    if (costewards.length >= MAX_COSTEWARDS) return;
    setCostewards((rows) => [...rows, { id: uidLocal(), name: "", email: "" }]);
  };
  const removeRow = (id) => setCostewards((rows) => rows.filter((r) => r.id !== id));

  const handleSubmit = async () => {
    setError("");
    if (!subjectName.trim()) { setError("Please enter who this page is for."); return; }
    if (!recipientName.trim()) { setError("Please enter their name."); return; }
    if (!EMAIL_RE.test(recipientEmail.trim())) { setError("Please enter a valid recipient email."); return; }

    // Skip empty rows, validate the rest, de-dupe by email, drop anyone
    // matching the recipient — same rules the server re-checks.
    const recipientEmailLower = recipientEmail.trim().toLowerCase();
    const seen = new Set([recipientEmailLower]);
    const cleanCostewards = [];
    for (const row of costewards) {
      const name = row.name.trim();
      const email = row.email.trim().toLowerCase();
      if (!name && !email) continue;
      if (!name || !EMAIL_RE.test(email)) { setError("Please fix the co-steward name or email, or remove that row."); return; }
      if (seen.has(email)) continue;
      seen.add(email);
      cleanCostewards.push({ name, email });
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/create-gift-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName: subjectName.trim(),
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
          giftMessage: giftMessage.trim(),
          gifterName: gifterName.trim(),
          gifterEmail: gifterEmail.trim(),
          costewards: cleanCostewards,
          gifterWantsCosteward,
        }),
      });
      const data = await res.json();
      if (data.url) {
        savePendingGiftConfirmation({
          subjectName: subjectName.trim(),
          recipientName: recipientName.trim(),
          costewards: cleanCostewards,
        });
        window.location.href = data.url; // off to Stripe Checkout
        return;
      }
      setError(data.error || "Couldn't start checkout. Please try again.");
    } catch {
      setError("Couldn't start checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crop-adjust-card gift-modal-card" role="dialog" aria-label="Buy And Then as a gift">
        <h3 className="crop-adjust-title">Send this as a gift</h3>
        <p className="crop-adjust-sub">We'll email them a link to claim it — no code to forward, nothing for you to remember. It's the same $49 page, everything unlocked, no renewals.</p>
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">Who is this page for?</label>
            <input className="form-input" placeholder="Their name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Recipient's name</label>
            <input className="form-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Recipient's email</label>
            <input className="form-input" type="email" placeholder="them@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Your name <span className="form-label-optional">(optional)</span></label>
            <input className="form-input" value={gifterName} onChange={(e) => setGifterName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Your email <span className="form-label-optional">(optional)</span></label>
            <input className="form-input" type="email" placeholder="you@example.com" value={gifterEmail} onChange={(e) => setGifterEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">A message from you <span className="form-label-optional">(optional)</span></label>
            <textarea className="form-input" rows={3} placeholder="I thought you might want a place to gather..." value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
          </div>

          <div className="gift-costeward-section">
            <div className="gift-costeward-heading">Add co-stewards <span className="form-label-optional gift-costeward-tag">Optional</span></div>
            <p className="gift-costeward-helper">
              Co-stewards share the page with {recipientFirst}. They can add memories, invite people and approve what comes in. The person you're gifting this to stays the owner. Their siblings are a good place to start. Nobody hears anything until {recipientFirst} opens their gift and says yes.
            </p>

            {costewards.map((row) => (
              <div className="gift-costeward-row" key={row.id}>
                <input className="form-input" placeholder="Name" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} />
                <input className="form-input" type="email" placeholder="Email" value={row.email} onChange={(e) => updateRow(row.id, "email", e.target.value)} />
                <button type="button" className="gift-costeward-remove" aria-label="Remove" onClick={() => removeRow(row.id)}>&times;</button>
              </div>
            ))}
            {costewards.length < MAX_COSTEWARDS && (
              <button type="button" className="gift-costeward-add" onClick={addRow}>
                <span className="dash-dashed-plus" aria-hidden="true">+</span> Add a co-steward
              </button>
            )}

            <label className="gift-costeward-check">
              <input type="checkbox" checked={gifterWantsCosteward} onChange={(e) => setGifterWantsCosteward(e.target.checked)} />
              <span>
                Make me a co-steward too.
                <span className="gift-costeward-check-helper">The person you're gifting this to sees this as a suggestion and decides.</span>
              </span>
            </label>
          </div>

          <div className="gift-price-summary">
            <div className="gift-price-summary-line">
              {subjectName.trim() ? `${subjectName.trim()}'s page, forever` : "Their page, forever"} <span>· $49</span>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="crop-adjust-actions gift-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-rust" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner" /> Starting...</> : "Continue to payment · $49"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
