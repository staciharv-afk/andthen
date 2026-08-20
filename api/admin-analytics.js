// Vercel serverless function — pulls a few GA4 numbers into the admin view
// so there's no need to jump to a separate Google Analytics tab for the
// basics: overall traffic, time spent per page, and shares per page.
//
// Same identity check as admin-memorials.js (see adminAuth.js) — this is
// the second operator-only endpoint, not something any signed-in user can hit.
//
// The "shares per page" report depends on a custom dimension
// (customEvent:page_label) that has to be registered by hand in the GA4 UI
// before Google will let it be queried — see Admin.jsx for the exact setup
// steps shown to the operator. Until that's done (or if GA isn't configured
// at all yet), each report degrades independently: a failing report comes
// back as { error } instead of taking the whole response down, so whichever
// pieces work still show.
//
// Required env: SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, plus
// GA_PROPERTY_ID/GA_SERVICE_ACCOUNT_EMAIL/GA_SERVICE_ACCOUNT_PRIVATE_KEY
// (see api/_lib/googleAnalytics.js).
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./_lib/adminAuth.js";
import { runReport, gaConfigured } from "./_lib/googleAnalytics.js";

async function safeReport(fn) {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Admin view is not configured on the server." });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await requireAdmin(req, res, admin))) return;

  if (!gaConfigured()) {
    return res.status(200).json({ configured: false });
  }

  const days = ["7", "28"].includes(req.query?.days) ? req.query.days : "28";
  const dateRange = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const [overview, topPages, sharesByPage] = await Promise.all([
    safeReport(() => runReport({
      dateRanges: dateRange,
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "averageSessionDuration" }],
    })),
    safeReport(() => runReport({
      dateRanges: dateRange,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "userEngagementDuration" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    })),
    safeReport(() => runReport({
      dateRanges: dateRange,
      dimensions: [{ name: "customEvent:page_label" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "share_clicked" } },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 20,
    })),
  ]);

  return res.status(200).json({ configured: true, days, overview, topPages, sharesByPage });
}
