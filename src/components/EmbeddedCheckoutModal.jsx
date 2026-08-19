import { useState, useEffect, useRef } from "react";
import { stripePromise } from "../lib/stripe";

// Stripe won't let its hosted checkout.stripe.com page be embedded in a
// plain iframe — this uses Stripe's own "Embedded Checkout" instead, which
// they explicitly built for this: it mounts their payment form inline,
// inside a container element Stripe manages, rather than redirecting the
// whole tab away. The container div below is never given React children —
// Stripe injects its own DOM into it via .mount(), and mixing that with
// React-rendered content in the same node causes reconciliation conflicts.
//
// return_url points back into this same app. When Stripe's iframe
// navigates there after payment, that's a whole fresh instance of the app
// booting inside a small embedded frame — app.jsx's mount effect detects
// that (window.self !== window.top) and immediately bounces the real
// top-level tab to the same URL, so the actual app takes over full-page
// from there, same as any other return from checkout.
export function EmbeddedCheckoutModal({ tier, returnView, title, subtitle, onCancel }) {
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState("");
  const containerRef = useRef(null);
  const checkoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/start-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, returnView }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.clientSecret) { setError(data.error || "Couldn't start checkout."); setStatus("error"); return; }

        const stripe = await stripePromise;
        if (cancelled) return;
        if (!stripe) { setError("Couldn't start checkout."); setStatus("error"); return; }
        const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
        if (cancelled) { checkout.destroy(); return; }
        checkoutRef.current = checkout;
        checkout.mount(containerRef.current);
        setStatus("ready");
      } catch {
        if (!cancelled) { setError("Couldn't start checkout. Please try again."); setStatus("error"); }
      }
    })();
    return () => {
      cancelled = true;
      checkoutRef.current?.destroy();
    };
  }, [tier, returnView]);

  return (
    <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="crop-adjust-card crop-adjust-card-wide" role="dialog" aria-label={title}>
        <h3 className="crop-adjust-title">{title}</h3>
        {subtitle && <p className="crop-adjust-sub">{subtitle}</p>}

        {status === "error" ? (
          <>
            <p className="form-error">{error}</p>
            <div className="crop-adjust-actions">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>Close</button>
            </div>
          </>
        ) : (
          <>
            {status === "loading" && (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                <span className="spinner spinner-dark" />
              </div>
            )}
            <div ref={containerRef} style={{ display: status === "ready" ? "block" : "none" }} />
            {status === "ready" && (
              <div className="crop-adjust-actions">
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
