import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo, fmtTime } from "../lib/utils";

// Turns a GA4 runReport response into plain row objects keyed by dimension/
// metric name, instead of the API's parallel dimensionValues/metricValues
// arrays — much easier to read in the JSX below.
function parseReport(report) {
  if (!report?.rows) return [];
  const dims = (report.dimensionHeaders || []).map((h) => h.name);
  const mets = (report.metricHeaders || []).map((h) => h.name);
  return report.rows.map((row) => {
    const out = {};
    row.dimensionValues.forEach((v, i) => { out[dims[i]] = v.value; });
    row.metricValues.forEach((v, i) => { out[mets[i]] = Number(v.value); });
    return out;
  });
}

// Operator-only view — every memorial ever created, its URL, creator email,
// paid status, plus a few GA4 numbers (traffic, time on page, shares per
// page) so there's no need for a separate Google Analytics tab for the
// basics. Not linked from anywhere in the nav; reached by going straight to
// /?view=admin. That's not the access control — api/admin-memorials.js and
// api/admin-analytics.js independently verify the caller's own Supabase
// session against ADMIN_EMAIL server-side and return a plain 403 to anyone
// else, so hiding the link is just about not inviting the question, not security.
export function AdminPage({ currentUser }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [ga, setGa] = useState({ loading: true, data: null });
  const [days, setDays] = useState("28");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadAnalytics(days);
  }, [days]);

  const withToken = async (path) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { ok: false, data: { error: "Not signed in." } };
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    return { ok: res.ok, data: await res.json() };
  };

  const load = async () => {
    setState({ loading: true, error: null, data: null });
    try {
      const { ok, data } = await withToken("/api/admin-memorials");
      if (!ok) { setState({ loading: false, error: data.error || "Couldn't load.", data: null }); return; }
      setState({ loading: false, error: null, data });
    } catch {
      setState({ loading: false, error: "Couldn't load. Please try again.", data: null });
    }
  };

  const loadAnalytics = async (d) => {
    setGa({ loading: true, data: null });
    try {
      const { data } = await withToken(`/api/admin-analytics?days=${d}`);
      setGa({ loading: false, data });
    } catch {
      setGa({ loading: false, data: null });
    }
  };

  const copyUrl = (url) => navigator.clipboard.writeText(url).catch(() => {});

  const overviewRows = ga.data?.overview?.data ? parseReport(ga.data.overview.data) : [];
  const overview = overviewRows[0];
  const topPages = ga.data?.topPages?.data ? parseReport(ga.data.topPages.data) : [];
  const sharesByPage = ga.data?.sharesByPage?.data ? parseReport(ga.data.sharesByPage.data) : [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header fade-up">
          <div>
            <div className="dashboard-title">Admin</div>
            <div className="dashboard-sub">Every page created, across all users — plus traffic from Google Analytics.</div>
          </div>
        </div>

        {/* ── Google Analytics ── */}
        <div className="settings-section" style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div className="settings-section-title">Traffic (Google Analytics)</div>
            {ga.data?.configured && (
              <div style={{ display: "flex", gap: 6 }}>
                {["7", "28"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn btn-sm ${days === d ? "btn-rust" : "btn-ghost"}`}
                    onClick={() => setDays(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            )}
          </div>

          {ga.loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <span className="spinner spinner-dark" />
            </div>
          ) : !ga.data?.configured ? (
            <p className="form-hint">
              Not connected yet — this needs a Google Cloud service account with read access to your GA4 property.
              Ask Claude for the setup steps, or see the comments in api/_lib/googleAnalytics.js.
            </p>
          ) : (
            <>
              {overview ? (
                <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <div className="invite-box" style={{ flex: "1 1 160px" }}>
                    <span className="invite-url">{Math.round(overview.sessions || 0).toLocaleString()} sessions</span>
                  </div>
                  <div className="invite-box" style={{ flex: "1 1 160px" }}>
                    <span className="invite-url">{Math.round(overview.activeUsers || 0).toLocaleString()} visitors</span>
                  </div>
                  <div className="invite-box" style={{ flex: "1 1 160px" }}>
                    <span className="invite-url">{fmtTime(overview.averageSessionDuration || 0)} avg. session</span>
                  </div>
                </div>
              ) : ga.data.overview?.error ? (
                <p className="form-error">Traffic totals: {ga.data.overview.error}</p>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <div className="toggle-label" style={{ marginBottom: 8 }}>Top pages by views</div>
                  {ga.data.topPages?.error ? (
                    <p className="form-hint">{ga.data.topPages.error}</p>
                  ) : topPages.length === 0 ? (
                    <p className="form-hint">No page views yet in this range.</p>
                  ) : (
                    topPages.slice(0, 8).map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--warm-faint)", fontSize: 13 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.pagePath}>{p.pageTitle || p.pagePath}</span>
                        <span style={{ color: "var(--warm-light)", flexShrink: 0 }}>
                          {p.screenPageViews} views · {fmtTime(p.screenPageViews ? p.userEngagementDuration / p.screenPageViews : 0)} avg
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div className="toggle-label" style={{ marginBottom: 8 }}>Shares by page</div>
                  {ga.data.sharesByPage?.error ? (
                    <p className="form-hint">
                      Not available yet — this needs a custom dimension registered in GA4 (Admin → Custom definitions → Create custom dimension, event parameter <code>page_label</code>). Ask Claude if you want help with this step.
                    </p>
                  ) : sharesByPage.length === 0 ? (
                    <p className="form-hint">No shares tracked yet in this range.</p>
                  ) : (
                    sharesByPage.slice(0, 8).map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--warm-faint)", fontSize: 13 }}>
                        <span>{p["customEvent:page_label"] || "(unknown page)"}</span>
                        <span style={{ color: "var(--warm-light)" }}>{p.eventCount} shares</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Pages ── */}
        {state.loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <span className="spinner spinner-dark" />
          </div>
        )}

        {state.error && (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">{state.error}</div>
            <p className="empty-state-sub">
              {state.error === "Not authorized."
                ? `Signed in as ${currentUser?.email || "unknown"} — this view is restricted to the admin account.`
                : "Something went wrong loading this."}
            </p>
          </div>
        )}

        {state.data && (
          <>
            <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
              <div className="invite-box" style={{ flex: 1 }}>
                <span className="invite-url">{state.data.total_pages} {state.data.total_pages === 1 ? "page" : "pages"} created</span>
              </div>
              <div className="invite-box" style={{ flex: 1 }}>
                <span className="invite-url">{state.data.total_creators} {state.data.total_creators === 1 ? "user" : "users"}</span>
              </div>
            </div>

            {state.data.memorials.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📖</div>
                <div className="empty-state-title">No pages yet</div>
              </div>
            ) : (
              <div className="access-req-list">
                {state.data.memorials.map((m) => (
                  <div className="access-req-row" key={m.id}>
                    <div className="avatar">{(m.name || "?")[0].toUpperCase()}</div>
                    <div className="access-req-info">
                      <div className="access-req-name">
                        {m.name}
                        {m.is_paid && <span className="settings-default-tag" style={{ marginLeft: 8 }}>Paid</span>}
                      </div>
                      <div className="access-req-meta">
                        {m.creator_email || "unknown creator"} · {timeAgo(m.created_at)} · {fmtDate(m.created_at)}
                      </div>
                      <div className="access-req-note">{m.url}</div>
                    </div>
                    <div className="access-req-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => copyUrl(m.url)}>Copy URL</button>
                      <a className="btn btn-sm btn-ghost" href={m.url} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
