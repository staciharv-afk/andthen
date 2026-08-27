import { useState } from "react";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Opened from the Pricing page's gift pill. A single gift-details form that
// starts a hosted Stripe Checkout via api/create-gift-checkout.js and
// redirects there. No account needed to buy a gift, same as the pre-signup
// $49 flow. (Someone buying for themselves just uses the $49 card the pill
// sits under — no "for me" branch here.)
export function GiftModal({ onClose }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [gifterName, setGifterName] = useState("");
  const [gifterEmail, setGifterEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!recipientName.trim()) { setError("Please enter their name."); return; }
    if (!EMAIL_RE.test(recipientEmail.trim())) { setError("Please enter a valid recipient email."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/create-gift-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
          giftMessage: giftMessage.trim(),
          gifterName: gifterName.trim(),
          gifterEmail: gifterEmail.trim(),
        }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; } // off to Stripe Checkout
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
            <label className="form-label">Recipient's name</label>
            <input className="form-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoFocus />
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
          {error && <div className="form-error">{error}</div>}
          <div className="crop-adjust-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-rust" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner" /> Starting...</> : "Continue to payment — $49"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
