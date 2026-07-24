import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo, sendThankYou } from "../lib/utils";
import { exportMemorial } from "../lib/export";

export function DashboardPage({ currentUser, onNavigate, showToast }) {
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMemorial, setActiveMemorial] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadMemorials();
    // Returning from a successful Stripe checkout.
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1") {
      showToast("Payment received — your page is being upgraded. If the new options don't show in a few seconds, refresh.");
      params.delete("upgraded");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  const loadMemorials = async () => {
    setLoading(true);
    const { data } = await supabase.from("memorials").select("*").eq("steward_id", currentUser.id).order("created_at", { ascending: false });
    setLoading(false);
    if (data?.length) {
      setMemorials(data);
      setActiveMemorial(data[0]);
      loadSubmissions(data[0].id);
    }
  };

  const loadSubmissions = async (memorialId) => {
    setSubmissionsLoading(true);
    const { data } = await supabase.from("contributions").select("*").eq("memorial_id", memorialId).order("created_at", { ascending: false });
    setSubmissionsLoading(false);
    setSubmissions(data || []);
  };

  const handleApprove = async (submissionId) => {
    await supabase.from("contributions").update({ status: "approved" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "approved" } : x));
    sendThankYou(submissionId); // emails the contributor if they left an address
    showToast("Story approved and now visible on the memorial.");
  };

  const handleReject = async (submissionId) => {
    await supabase.from("contributions").update({ status: "rejected" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "rejected" } : x));
    showToast("Submission removed.");
  };

  const copyInviteLink = (code) => {
    const link = `${window.location.origin}?memorial=${code}`;
    navigator.clipboard.writeText(link).then(() => showToast("Link copied! Share it with family and friends."));
  };

  const copyInvite = (memorial) => {
    const link = `${window.location.origin}?memorial=${memorial.invite_code}`;
    const msg = memorial.invite_message || `I'm gathering memories of ${memorial.name}. Would you share one?`;
    navigator.clipboard.writeText(`${msg}\n\n${link}`).then(() => showToast("Invitation copied — message + link."));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const n = await exportMemorial(activeMemorial);
      showToast(n > 0 ? `Exported ${n} ${n === 1 ? "memory" : "memories"} as a ZIP.` : "No approved memories to export yet.");
    } catch {
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleUpgrade = async (memorialId) => {
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url; // off to Stripe Checkout
      else showToast(data.error || "Couldn't start checkout. Please try again.", "error");
    } catch {
      showToast("Couldn't start checkout. Please try again.", "error");
    }
  };

  const filtered = submissions.filter((s) => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "approved") return s.status === "approved";
    return true;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorials.length) return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="empty-state fade-up">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">No memorials yet</div>
          <p className="empty-state-sub" style={{ marginBottom: 24 }}>Create your first memorial and start gathering stories.</p>
          <button className="btn btn-rust" onClick={() => onNavigate("create")}>Start gathering their stories</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header fade-up">
          <div>
            <div className="dashboard-title">Your memorials</div>
            <div className="dashboard-sub">Manage stories and submissions</div>
          </div>
          <button className="btn btn-rust btn-sm" onClick={() => onNavigate("create")}>+ New memorial</button>
        </div>

        {memorials.length > 1 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {memorials.map((m) => (
              <button
                key={m.id}
                className={`btn btn-sm ${activeMemorial?.id === m.id ? "btn-rust" : "btn-ghost"}`}
                onClick={() => { setActiveMemorial(m); loadSubmissions(m.id); }}
              >{m.name}</button>
            ))}
          </div>
        )}

        {activeMemorial && (
          <>
            <div className="memorial-banner fade-up-2">
              {activeMemorial.photo_url && (
                <img className="memorial-banner-img" src={activeMemorial.photo_url} alt={activeMemorial.name} />
              )}
              <div className="memorial-banner-body">
                <div className="memorial-name">{activeMemorial.name}</div>
                {(activeMemorial.born || activeMemorial.passed) && (
                  <div className="memorial-dates">
                    {fmtDate(activeMemorial.born)}{activeMemorial.born && activeMemorial.passed && " — "}{fmtDate(activeMemorial.passed)}
                  </div>
                )}
                {activeMemorial.description && <div className="memorial-desc">{activeMemorial.description}</div>}

                <div className="invite-box">
                  <span className="invite-url">{window.location.origin}?memorial={activeMemorial.invite_code}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => copyInviteLink(activeMemorial.invite_code)}>Copy link</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => copyInvite(activeMemorial)}>Copy invite</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("memorial", activeMemorial.invite_code)}>Preview</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("edit", activeMemorial)}>Edit</button>
                  {activeMemorial.is_paid && (
                    <button className="btn btn-sm btn-ghost" onClick={handleExport} disabled={exporting}>
                      {exporting ? "Exporting…" : "Export"}
                    </button>
                  )}
                </div>

                {activeMemorial.is_paid ? (
                  <div className="invite-box" style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.25)" }}>
                    <span className="invite-url" style={{ color: "#27ae60" }}>✓ Upgraded — photo, video &amp; voice memories are unlocked.</span>
                  </div>
                ) : (
                  <div className="invite-box" style={{ flexWrap: "wrap" }}>
                    <span className="invite-url" style={{ whiteSpace: "normal" }}>
                      <strong>Free plan</strong> — written memories only. Unlock photo, video &amp; voice contributions (and exports, coming soon).
                    </span>
                    <button className="btn btn-sm btn-rust" onClick={() => handleUpgrade(activeMemorial.id)}>Upgrade — $149</button>
                  </div>
                )}
              </div>
            </div>

            <div className="fade-up-3">
              <div className="tab-bar">
                {[
                  { key: "pending", label: `Pending (${submissions.filter(s => s.status === "pending").length})` },
                  { key: "approved", label: `Approved (${submissions.filter(s => s.status === "approved").length})` },
                  { key: "all", label: "All" },
                ].map((t) => (
                  <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
                ))}
              </div>

              {submissionsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <span className="spinner spinner-dark" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✉️</div>
                  <div className="empty-state-title">{activeTab === "pending" ? "No pending submissions" : "No stories yet"}</div>
                  <p className="empty-state-sub">
                    {activeTab === "pending"
                      ? "You're all caught up. Share the invite link to get more stories coming in."
                      : "Share the link below to invite friends and family to contribute."}
                  </p>
                </div>
              ) : (
                filtered.map((s) => <SubmissionCard key={s.id} submission={s} requireApproval={activeMemorial.require_approval} onApprove={handleApprove} onReject={handleReject} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ submission: s, requireApproval, onApprove, onReject }) {
  const typeLabel = { story: "Story", photo: "Photo", video: "Video", voice: "Voice memo" }[s.type] || "Story";
  const typeBadge = { story: "badge-story", photo: "badge-photo", video: "badge-video", voice: "badge-voice" }[s.type] || "badge-story";

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div className="avatar">{(s.contributor_name || "?")[0].toUpperCase()}</div>
        <div className="submission-name">{s.contributor_name || "Anonymous"}</div>
        <span className={`submission-type-badge ${typeBadge}`}>{typeLabel}</span>
        {requireApproval && (
          <span className={`submission-type-badge ${s.status === "approved" ? "badge-approved" : s.status === "rejected" ? "" : "badge-pending"}`}>
            {s.status === "approved" ? "Approved" : s.status === "rejected" ? "Removed" : "Pending"}
          </span>
        )}
        <span className="submission-time">{timeAgo(s.created_at)}</span>
      </div>

      {s.text && <p className="submission-text">"{s.text}"</p>}
      {s.media_url && s.type === "photo" && <img className="submission-media" src={s.media_url} alt="" />}
      {s.media_url && s.type === "video" && (
        <video className="submission-media" controls src={s.media_url} style={{ maxHeight: 240 }} />
      )}
      {s.media_url && s.type === "voice" && <audio controls src={s.media_url} style={{ width: "100%", marginBottom: 12 }} />}

      {requireApproval && s.status === "pending" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-rust" onClick={() => onApprove(s.id)}>Approve</button>
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
        </div>
      )}
      {(!requireApproval || s.status === "approved") && s.status !== "rejected" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
        </div>
      )}
    </div>
  );
}
