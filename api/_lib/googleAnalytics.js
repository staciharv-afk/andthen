// Minimal GA4 Data API client — hand-rolled service-account auth (RS256 JWT
// via Node's built-in crypto, no @google-cloud/* or googleapis dependency)
// rather than pulling in a large SDK for two report calls.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   GA_PROPERTY_ID              = the numeric GA4 property id (from the
//                                 Analytics URL, e.g. .../p550169211/... → 550169211)
//   GA_SERVICE_ACCOUNT_EMAIL    = the service account's client_email
//   GA_SERVICE_ACCOUNT_PRIVATE_KEY = the service account's private_key,
//                                 exactly as it appears in the downloaded
//                                 JSON key file (including the BEGIN/END
//                                 lines) — Vercel stores \n literally, so
//                                 it's unescaped below before signing.
// See GUIDE.md-adjacent setup notes in Admin.jsx for how to create these.
import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Exchanges the service account's key for a short-lived OAuth2 access
// token — standard "JWT bearer" server-to-server flow, no user consent step.
async function getAccessToken() {
  const email = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("GA service account not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Google token exchange failed");
  return data.access_token;
}

// Runs one GA4 report. `body` is the raw runReport request body (dateRanges,
// dimensions, metrics, dimensionFilter, etc. — see
// https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport).
export async function runReport(body) {
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!propertyId) throw new Error("GA_PROPERTY_ID not configured");

  const accessToken = await getAccessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "GA4 report failed");
  return data;
}

export function gaConfigured() {
  return Boolean(process.env.GA_PROPERTY_ID && process.env.GA_SERVICE_ACCOUNT_EMAIL && process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY);
}
