import { useEffect, useState } from "react";
import { savePendingGiftClaim } from "../lib/pendingGiftClaim";

// /?view=claim-gift&session=<stripe checkout session id> — the link sent in
// the recipient's claim email (see api/stripe-webhook.js's handleGiftCheckout).
// The session id is looked up through api/get-gift.js, which is the only
// way in since gift_purchases has no direct grants (see the migration).
//
// "Get started" hands off to the exact same magic-link creator flow every
// other page uses (Onboarding.jsx if signed out, CreateMemorial.jsx if
// already signed in) — it just stashes the session id first
// (pendingGiftClaim.js) so app.jsx's finishSignIn can call api/claim-gift.js
// the moment the new memorial exists, the same handoff pendingPayment.js
// already does for a normal pre-signup purchase.
export function ClaimGiftPage({ currentUser, onNavigate, showToast }) {
  const [loading, setLoading] = useState(true);
  const [gift, setGift] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [declining, setDeclining] = useState(false);
  const sessionId = new URLSearchParams(window.location.search).get("session");

  useEffect(() => {
    if (!sessionId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch("/api/get-gift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (!res.ok || !data.gift) { setNotFound(true); return; }
        setGift(data.gift);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleGetStarted = () => {
    savePendingGiftClaim({ sessionId });
    onNavigate(currentUser ? "create" : "onboarding");
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await fetch("/api/decline-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setGift((g) => ({ ...g, status: "declined" }));
    } catch {
      showToast?.("Something went wrong — please try again.", "error");
    } finally {
      setDeclining(false);
    }
  };

  const gifter = gift?.gifter_name || "Someone";

  return (
    <div className="auth-page onboarding-page">
      <div className="auth-card onboarding-card onboarding-card-wide fade-up">
        <div className="auth-logo"><em>And Then...</em></div>

        {loading && (
          <span className="spinner spinner-dark" style={{ display: "block", margin: "24px auto" }} />
        )}

        {!loading && notFound && (
          <>
            <h1 className="onboarding-headline">This gift link isn't valid.</h1>
            <p className="auth-tagline">Double-check the link from your email, or reach out to whoever sent it.</p>
          </>
        )}

        {!loading && gift && gift.status === "sent" && (
          <>
            <div className="onboarding-eyebrow">You've been given a gift</div>
            <h1 className="onboarding-headline">{gifter} thought you might want a place to gather someone's stories.</h1>
            {gift.gift_message && (
              <blockquote className="gift-claim-message">{gift.gift_message}</blockquote>
            )}
            <p className="auth-tagline">
              And Then is a page for one person's stories — the photos, the voicemails, the small things
              people remember. You build it, and anyone you invite can add what they remember too. It's
              already paid for: nothing to buy, nothing that runs out, and no rush to start.
            </p>
            <button className="btn btn-rust btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={handleGetStarted}>
              Get started
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: "center", width: "100%", marginTop: 10 }} onClick={handleDecline} disabled={declining}>
              {declining ? <span className="spinner" /> : "Not right now"}
            </button>
          </>
        )}

        {!loading && gift && gift.status === "declined" && (
          <>
            <h1 className="onboarding-headline">That's okay.</h1>
            <p className="auth-tagline">
              This isn't the right moment, and that's completely fine. {gifter}'s gift doesn't expire — this same
              link will be here whenever you want it, with nothing to redo. We won't follow up or create anything
              until you come back.
            </p>
            <button className="btn btn-ghost" style={{ justifyContent: "center", width: "100%", marginTop: 10 }} onClick={handleGetStarted}>
              Actually, let's do this
            </button>
          </>
        )}

        {!loading && gift && gift.status === "claimed" && (
          <>
            <h1 className="onboarding-headline">This gift's already set up.</h1>
            <p className="auth-tagline">Sign in to see the page it built.</p>
            <button className="btn btn-rust btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={() => onNavigate("login")}>
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
