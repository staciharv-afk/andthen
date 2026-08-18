import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo } from "../lib/utils";

// Operator-only view — every memorial ever created, its URL, creator email,
// and paid status. Not linked from anywhere in the nav; reached by going
// straight to /?view=admin. That's not the access control — api/admin-
// memorials.js independently verifies the caller's own Supabase session
// against ADMIN_EMAIL server-side and returns a plain 403 to anyone else,
// so hiding the link is just about not inviting the question, not security.
export function AdminPage({ currentUser }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setState({ loading: true, error: null, data: null });
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { setState({ loading: false, error: "Not signed in.", data: null }); return; }
    try {
      const res = await fetch("/api/admin-memorials", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setState({ loading: false, error: data.error || "Couldn't load.", data: null }); return; }
      setState({ loading: false, error: null, data });
    } catch {
      setState({ loading: false, error: "Couldn't load. Please try again.", data: null });
    }
  };

  const copyUrl = (url) => navigator.clipboard.writeText(url).catch(() => {});

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header fade-up">
          <div>
            <div className="dashboard-title">Admin</div>
            <div className="dashboard-sub">Every page created, across all users.</div>
          </div>
        </div>

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
