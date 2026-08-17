// Google Analytics 4 (gtag.js), hand-rolled rather than a wrapper library —
// keeps this to a couple of thin exports matching the fire-and-forget style
// of the notify* helpers below. Disabled entirely outside production builds
// (import.meta.env.DEV is true under `vite dev`) and when no measurement ID
// is configured, so local dev never pollutes real GA4 data.
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
export const ANALYTICS_ENABLED = !import.meta.env.DEV && Boolean(MEASUREMENT_ID);

let initialized = false;

// Call once, on app mount. Loads gtag.js and configures it with
// send_page_view: false — this is a single-page app, so pageviews are sent
// manually on route change (see trackPageview) instead of relying on GA4's
// default page-load-only pageview.
export const initAnalytics = () => {
  if (!ANALYTICS_ENABLED || initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

// Virtual pageview for the SPA router — call on every route change.
export const trackPageview = (path) => {
  if (!ANALYTICS_ENABLED) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
};

// General-purpose custom event. No-ops (never throws) when analytics is
// disabled, so call sites don't need their own ANALYTICS_ENABLED checks.
export const trackEvent = (name, params = {}) => {
  if (!ANALYTICS_ENABLED) return;
  window.gtag("event", name, params);
};
