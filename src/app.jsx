import { useState, useEffect, useRef } from "react";
import { supabase, CONFIG_OK, ARRIVED_VIA_MAGIC_LINK } from "./lib/supabase";
import { uid } from "./lib/utils";
import { readDraft, clearDraft } from "./lib/onboardingDraft";
import { savePendingPayment, readPendingPayment, clearPendingPayment } from "./lib/pendingPayment";
import { STYLES } from "./styles";
import { parseLocation, routeToUrl } from "./lib/router";
import { useToast, ToastContainer } from "./components/Toast";
import { Nav } from "./components/Nav";
import { HomePage } from "./pages/Home";
import { AuthPage } from "./pages/Auth";
import { OnboardingPage } from "./pages/Onboarding";
import { CreateMemorialPage } from "./pages/CreateMemorial";
import { DashboardPage } from "./pages/Dashboard";
import { MemorialPage } from "./pages/Memorial";
import { PageSettingsPage } from "./pages/PageSettings";
import { PricingPage } from "./pages/Pricing";
import { OurStoryPage } from "./pages/OurStory";
import { HowItWorksPage } from "./pages/HowItWorks";

export default function App() {
  const [route, setRoute] = useState(() => parseLocation().page);
  const [routeParam, setRouteParam] = useState(() => parseLocation().param);
  const [currentUser, setCurrentUser] = useState(null);
  const { toasts, show: showToast } = useToast();
  const magicHandled = useRef(false);

  // On load: seed history state, wire up the session (supabase-js persists it
  // and auto-detects the magic-link token in the URL), and listen for
  // Back/Forward.
  useEffect(() => {
    const { page, param } = parseLocation();
    window.history.replaceState({ page, param }, "");

    // Landing back from a pre-signup Stripe Checkout (see Pricing.jsx +
    // api/start-checkout.js) — stash the session id so finishSignIn can
    // attach it to the memorial once one actually exists, then strip the
    // params so they don't linger in the URL or get re-processed on refresh.
    const params = new URLSearchParams(window.location.search);
    const paidSession = params.get("paid_session");
    const paidTier = params.get("tier");
    if (paidSession && paidTier) {
      savePendingPayment({ sessionId: paidSession, tier: paidTier });
      params.delete("paid_session");
      params.delete("tier");
      const qs = params.toString();
      window.history.replaceState({ page, param }, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }

    const onPopState = (e) => {
      const loc = e.state && e.state.page ? e.state : parseLocation();
      setRoute(loc.page);
      setRouteParam(loc.param ?? null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);

    let subscription = null;
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) setCurrentUser(data.session.user);
      });
      const res = supabase.auth.onAuthStateChange((event, session) => {
        setCurrentUser(session?.user ?? null);
        // Land returning-from-email users on their dashboard, once — unless
        // they left an onboarding draft behind, in which case finish creating
        // their page instead (see finishSignIn).
        if (event === "SIGNED_IN" && ARRIVED_VIA_MAGIC_LINK && !magicHandled.current) {
          magicHandled.current = true;
          finishSignIn(session);
        }
      });
      subscription = res.data.subscription;
    }

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const navigate = (page, param = null) => {
    setRoute(page);
    setRouteParam(param);
    window.history.pushState({ page, param }, "", routeToUrl(page, param));
    window.scrollTo(0, 0);
  };

  // Runs once, right after a magic-link sign-in. If the user left an
  // onboarding draft (name/relation/description from the intro step)
  // before confirming their email, create their memorial now — this is
  // the earliest point a steward_id exists to satisfy the memorials
  // INSERT policy — and land them on it instead of the dashboard.
  const finishSignIn = async (session) => {
    const draft = readDraft();
    if (draft?.name && session?.user) {
      clearDraft();
      const { data, error } = await supabase.from("memorials").insert({
        name: draft.name,
        description: draft.description || null,
        steward_relation: draft.relation || null,
        steward_id: session.user.id,
        invite_code: uid(),
      }).select();
      if (!error && data?.[0]) {
        await attachPendingPaymentIfAny(data[0].id);
        showToast("You're signed in — your page is ready to finish.");
        navigate("edit", data[0]);
        return;
      }
      showToast("You're signed in — let's finish setting up your page.");
      navigate("create");
      return;
    }
    showToast("You're signed in.");
    navigate("dashboard");
  };

  // If this signup followed a pre-signup Checkout (Pricing.jsx's two
  // clickable cards), attach that payment to the memorial that was just
  // created — the earliest point a memorial id exists for it. Best-effort:
  // if it fails, the memorial is simply left on the free tier rather than
  // blocking sign-in; the Stripe payment still exists and can be
  // reconciled by hand. Always clears the stash so a stale/expired session
  // isn't retried against whatever memorial gets created next.
  const attachPendingPaymentIfAny = async (memorialId) => {
    const pending = readPendingPayment();
    if (!pending) return;
    clearPendingPayment();
    try {
      const res = await fetch("/api/attach-presignup-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId, sessionId: pending.sessionId }),
      });
      const data = await res.json();
      if (!res.ok || data?.skipped) {
        showToast("We couldn't confirm your payment automatically — contact us and we'll sort it out.", "error");
      }
    } catch {
      showToast("We couldn't confirm your payment automatically — contact us and we'll sort it out.", "error");
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
    navigate("home");
    showToast("Signed out.");
  };

  const handleMemorialCreated = (memorial) => {
    navigate("dashboard");
  };

  return (
    <>
      <style>{STYLES}</style>

      {!CONFIG_OK && (
        <div style={{ background: "#6B1F2E", color: "#F4ECD8", padding: "10px 24px", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
          Backend not configured — sign-in and saving are unavailable. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>.
        </div>
      )}

      {route !== "login" && route !== "memorial" && route !== "onboarding" && (
        <Nav currentUser={currentUser} onSignOut={handleSignOut} onNavigate={navigate} currentRoute={route} />
      )}

      {route === "home" && <HomePage onNavigate={navigate} />}

      {route === "pricing" && <PricingPage onNavigate={navigate} showToast={showToast} />}

      {route === "story" && <OurStoryPage onNavigate={navigate} />}

      {route === "how-it-works" && <HowItWorksPage onNavigate={navigate} />}

      {route === "onboarding" && (
        <OnboardingPage showToast={showToast} />
      )}

      {route === "login" && (
        <AuthPage showToast={showToast} />
      )}

      {route === "create" && currentUser && (
        <CreateMemorialPage currentUser={currentUser} onCreated={handleMemorialCreated} showToast={showToast} />
      )}
      {route === "create" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "dashboard" && currentUser && (
        <DashboardPage currentUser={currentUser} onNavigate={navigate} showToast={showToast} />
      )}
      {route === "dashboard" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "edit" && currentUser && routeParam && (
        <CreateMemorialPage
          currentUser={currentUser}
          existing={routeParam}
          onUpdated={() => navigate("dashboard")}
          onCancel={() => navigate("dashboard")}
          showToast={showToast}
        />
      )}
      {/* Reloaded straight onto /?view=edit with no memorial in history — fall back to the dashboard. */}
      {route === "edit" && currentUser && !routeParam && (
        <DashboardPage currentUser={currentUser} onNavigate={navigate} showToast={showToast} />
      )}
      {route === "edit" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "page-settings" && currentUser && routeParam && (
        <PageSettingsPage
          currentUser={currentUser}
          memorial={routeParam}
          onNavigate={navigate}
          showToast={showToast}
        />
      )}
      {/* Reloaded straight onto /?view=page-settings with no memorial in history — fall back to the dashboard. */}
      {route === "page-settings" && currentUser && !routeParam && (
        <DashboardPage currentUser={currentUser} onNavigate={navigate} showToast={showToast} />
      )}
      {route === "page-settings" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "memorial" && (
        <MemorialPage inviteCode={routeParam} showToast={showToast} onNavigate={navigate} currentUser={currentUser} />
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}
