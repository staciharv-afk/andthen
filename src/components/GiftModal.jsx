import { useState } from "react";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Opened from the Pricing page's gift pill. Two steps: fork ("For me" hands
// straight back to the existing $49 checkout the pill sits under — see
// Pricing.jsx's onContinueForMe — "A gift for someone else" continues to the
// form below), then the gift details form, which starts a hosted Stripe
// Checkout via api/create-gift-checkout.js and redirects there. No account
// needed to buy a gift, same as the pre-signup $49 flow.
export function GiftModal({ onClose, onContinueForMe }) {
  const [step, setStep] = useState("fork"); // fork | form
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
        {step === "fork" && (
          <>
            <h3 className="crop-adjust-title">Who's this for?</h3>
            <p className="crop-adjust-sub">Either way, it's the same $49 page — everything unlocked, no renewals.</p>
            <div className="gift-fork-options">
              <button type="button" className="gift-fork-option" onClick={onContinueForMe}>
                <span className="gift-fork-option-label">For me</span>
                <span className="gift-fork-option-body">I'm building this page myself.</span>
              </button>
              <button type="button" className="gift-fork-option" onClick={() => setStep("form")}>
                <span className="gift-fork-option-label">A gift for someone else</span>
                <span className="gift-fork-option-body">They'll get an email with everything they need, whenever they're ready.</span>
              </button>
            </div>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {step === "form" && (
          <>
            <h3 className="crop-adjust-title">Send this as a gift</h3>
            <p className="crop-adjust-sub">We'll email them a link to claim it — no code to forward, nothing for you to remember.</p>
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
                <button type="button" className="btn btn-ghost" onClick={() => setStep("fork")} disabled={submitting}>Back</button>
                <button type="button" className="btn btn-rust" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Starting...</> : "Continue to payment — $49"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
