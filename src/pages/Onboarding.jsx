import { useState } from "react";
import { supabase, CONFIG_OK } from "../lib/supabase";
import { saveDraft } from "../lib/onboardingDraft";

export function OnboardingPage({ showToast }) {
  const [step, setStep] = useState("orientation"); // orientation | email | intro
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [description, setDescription] = useState("");

  const handleSend = async () => {
    setError("");
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) { setError("Please enter a valid email address."); return; }
    if (!CONFIG_OK) { setError("Sign-in is unavailable until the backend is configured."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
      });
      if (err) { setError(err.msg || err.message || err.error_description || "Couldn't send the link. Please try again."); return; }
      setStep("intro");
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setError("");
    if (!name.trim()) { setError("Please enter their name."); return; }
    saveDraft({ name: name.trim(), relation: relation.trim(), description: description.trim() });
    setLinkSent(true);
  };

  return (
    <div className="auth-page onboarding-page">
      {step === "orientation" && (
        <div className="auth-card onboarding-card fade-up">
          <div className="auth-logo">And Then<em>...</em></div>
          <div className="onboarding-eyebrow">Before you start</div>
          <h1 className="onboarding-headline">You're about to build a page for someone you love.</h1>
          <p className="auth-tagline">
            You'll add the first few memories yourself. Then, if you choose, invite others to add theirs. Nothing is public until you decide it is.
          </p>
          <button className="btn btn-rust btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={() => setStep("email")}>
            Continue
          </button>
        </div>
      )}

      {step === "email" && (
        <div className="auth-card onboarding-card fade-up">
          <div className="auth-logo">And Then<em>...</em></div>
          <h1 className="onboarding-headline">Enter your email to start building the page</h1>
          <div className="create-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} autoFocus />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-rust btn-lg" onClick={handleSend} disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? <span className="spinner" /> : "Send my link"}
            </button>
            <span className="onboarding-caption">Five entries free, no card required.</span>
          </div>
        </div>
      )}

      {step === "intro" && (
        <div className="auth-card onboarding-card onboarding-card-wide fade-up">
          <div className="auth-logo">And Then<em>...</em></div>

          {linkSent ? (
            <>
              <div className="onboarding-eyebrow">Almost there</div>
              <h1 className="onboarding-headline">Check your email to finish.</h1>
              <p className="auth-tagline">
                Click the link we sent to <strong>{email.trim()}</strong> and we'll create {name.trim()}'s page with everything you just entered.
              </p>
              <span className="spinner spinner-dark" style={{ display: "block", margin: "4px auto 0" }} />
            </>
          ) : (
            <>
              <div className="onboarding-eyebrow">Link sent — while you wait</div>
              <h1 className="onboarding-headline">Tell us who this page is for.</h1>
              <p className="auth-tagline">
                A few words now shape the whole page — their name, how you knew them, and the start of their story.
              </p>
              <div className="create-form">
                <div className="form-group">
                  <label className="form-label">Their name</label>
                  <input className="form-input" placeholder='e.g. Margaret "Peggy" Owens' value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Your relationship to them</label>
                  <input className="form-input" placeholder="e.g. Daughter" value={relation} onChange={(e) => setRelation(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">In a sentence or two, who were they?</label>
                  <textarea className="form-input" placeholder="She had a way of making every room feel like home…" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                {error && <div className="form-error">{error}</div>}
                <button className="btn btn-rust btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={handleCreate}>
                  Create their page
                </button>
                <span className="onboarding-caption">You can change any of this later.</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
