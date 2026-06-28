import { useState } from "react";
import { supabase, CONFIG_OK } from "../lib/supabase";
import { STYLES } from "../styles";

export function AuthPage({ showToast }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
      setSent(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{STYLES}</style>
      <div className="auth-card fade-up">
        <div className="auth-logo">And Then<em>...</em></div>

        {sent ? (
          <>
            <p className="auth-tagline">
              Check your email — we sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device and you'll be signed in.
            </p>
            <button className="btn btn-ghost btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={() => { setSent(false); setEmail(""); }}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <p className="auth-tagline">Enter your email and we'll send you a link to sign in. No password to remember.</p>
            <div className="create-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} autoFocus />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="btn btn-rust btn-lg" onClick={handleSend} disabled={loading} style={{ justifyContent: "center" }}>
                {loading ? <span className="spinner" /> : "Email me a sign-in link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
