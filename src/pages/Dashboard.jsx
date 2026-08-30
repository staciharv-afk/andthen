import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo, sendThankYou, FREE_MEMORY_LIMIT } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { exportMemorial } from "../lib/export";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { ShareMemoryModal } from "./Memorial";
import { EmbeddedCheckoutModal } from "../components/EmbeddedCheckoutModal";
import { MemoryLimitModal } from "../components/MemoryLimitModal";
import { SharePagePanel } from "../components/SharePagePanel";
import { useScrollLock } from "../lib/useScrollLock";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

export function DashboardPage({ currentUser, onNavigate, showToast }) {
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMemorial, setActiveMemorial] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // memorial pending delete confirmation, or null
  const [upgrading, setUpgrading] = useState(false); // true while a checkout redirect is starting
  const [addingMemory, setAddingMemory] = useState(false);
  const [showMemoryLimit, setShowMemoryLimit] = useState(false);
  const [showPagePaywall, setShowPagePaywall] = useState(false);
  const [showShare, setShowShare] = useState(false);

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

  // Includes both memorials this user created (steward_id) and ones they've
  // accepted a co-steward invite on (memorial_stewards) — see the
  // 20260817_page_stewards.sql migration and is_memorial_steward().
  const loadMemorials = async () => {
    setLoading(true);
    const { data: coStewardRows } = await supabase
      .from("memorial_stewards")
      .select("memorial_id")
      .eq("user_id", currentUser.id)
      .eq("status", "accepted");
    const coStewardIds = (coStewardRows || []).map((r) => r.memorial_id);
    let query = supabase.from("memorials").select("*").order("created_at", { ascending: false });
    query = coStewardIds.length
      ? query.or(`steward_id.eq.${currentUser.id},id.in.(${coStewardIds.join(",")})`)
      : query.eq("steward_id", currentUser.id);
    const { data } = await query;
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
    return data || [];
  };

  const handleApprove = async (submissionId) => {
    await supabase.from("contributions").update({ status: "approved" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "approved" } : x));
    sendThankYou(submissionId); // emails the contributor if they left an address
    showToast("Story approved and now visible on the page.");
  };

  const handleReject = async (submissionId) => {
    await supabase.from("contributions").update({ status: "rejected" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "rejected" } : x));
    showToast("Submission removed.");
  };

  // Keys off whatever this submission actually captured — email if they
  // left one, else the exact name they signed with (the only identity
  // signal a contributor has, with no accounts/sessions in the picture).
  const handleBlock = async (submission) => {
    const email = submission.contributor_email?.trim().toLowerCase();
    const name = submission.contributor_name?.trim().toLowerCase();
    if (!email && !name) { showToast("Nothing to block this contributor by.", "error"); return; }
    const { error } = await supabase.from("blocked_contributors").insert({
      memorial_id: submission.memorial_id,
      identifier: email || name,
      identifier_type: email ? "email" : "name",
      blocked_by: currentUser.id,
    });
    if (error) { showToast(error.code === "23505" ? "Already blocked." : "Couldn't block — please try again.", "error"); return; }
    showToast(`${submission.contributor_name || "They"} won't be able to add another memory.`);
  };

  // Prefer the steward's custom vanity URL (myandthen.com/<slug>) once set;
  // the invite-code link always works too, so it's the fallback. Either
  // shape grants the same access (see Memorial.jsx's canContribute) — this
  // is the one link the app shows/hands out everywhere, including
  // SharePagePanel.
  const memorialUrl = (memorial) =>
    memorial.slug ? `${window.location.origin}/${memorial.slug}` : `${window.location.origin}?memorial=${memorial.invite_code}`;

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

  // $49 one-time build fee — same tier as the Pricing page, via api/create-checkout.js.
  const handleUpgrade = async (memorialId) => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memorialId, tier: BUILD.tier }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; } // off to Stripe Checkout
      showToast(data.error || "Couldn't start checkout. Please try again.", "error");
    } catch {
      showToast("Couldn't start checkout. Please try again.", "error");
    } finally {
      setUpgrading(false);
    }
  };

  const handleDeleted = (memorialId) => {
    setDeleteTarget(null);
    setMemorials((list) => {
      const remaining = list.filter((m) => m.id !== memorialId);
      if (activeMemorial?.id === memorialId) {
        if (remaining.length) { setActiveMemorial(remaining[0]); loadSubmissions(remaining[0].id); }
        else { setActiveMemorial(null); setSubmissions([]); }
      }
      return remaining;
    });
  };

  const filtered = submissions.filter((s) => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "approved") return s.status === "approved";
    return true;
  });

  // Mirrors can_insert_contribution()'s own count (status <> 'rejected') —
  // submissions is already loaded unfiltered, so no extra query needed.
  const atFreeLimit = !!activeMemorial && !activeMemorial.is_paid
    && submissions.filter((s) => s.status !== "rejected").length >= FREE_MEMORY_LIMIT;

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
          <div className="empty-state-title">No pages yet</div>
          <p className="empty-state-sub" style={{ marginBottom: 24 }}>Create your first page and start gathering memories.</p>
          <button className="btn btn-rust" onClick={() => onNavigate("create")}>Start their page</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header fade-up">
          <div>
            <div className="dashboard-title">Your People</div>
            <div className="dashboard-sub">Manage memories and submissions</div>
          </div>
          <button className="btn btn-rust btn-sm" onClick={() => setShowPagePaywall(true)}>+ Start another page</button>
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
                <img
                  className="memorial-banner-img"
                  src={activeMemorial.photo_url}
                  alt={activeMemorial.name}
                  style={{ objectPosition: `${activeMemorial.crop_x ?? 50}% ${activeMemorial.crop_y ?? 50}%` }}
                />
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
                  <span className="invite-url">{memorialUrl(activeMemorial)}</span>
                </div>

                <div className="dashboard-actions">
                  <div className="dashboard-actions-row">
                    <button className="btn btn-sm btn-rust" onClick={() => (atFreeLimit ? setShowMemoryLimit(true) : setAddingMemory(true))}>+ Add a memory</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setShowShare(true)}>Share this page</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("memorial", activeMemorial.invite_code)}>View page</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("edit", activeMemorial)}>Edit</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("page-settings", activeMemorial)}>
                      Settings
                    </button>
                  </div>
                  <div className="dashboard-actions-divider" />
                  <div className="dashboard-actions-row">
                    {activeMemorial.is_paid && (
                      <button className="btn btn-sm btn-ghost" onClick={handleExport} disabled={exporting}>
                        {exporting ? "Exporting…" : "Export"}
                      </button>
                    )}
                    <button type="button" className="link-danger" onClick={() => setDeleteTarget(activeMemorial)}>Delete</button>
                  </div>
                </div>

                {activeMemorial.is_paid ? (
                  <div className="invite-box" style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.25)" }}>
                    <span className="invite-url" style={{ color: "#27ae60" }}>✓ Upgraded — photo, video &amp; voice memories are unlocked.</span>
                  </div>
                ) : (
                  <div className="invite-box" style={{ flexWrap: "wrap" }}>
                    <span className="invite-url" style={{ whiteSpace: "normal" }}>
                      <strong>Free plan</strong> — written memories only. Unlock photo, video &amp; voice contributions (and exports, coming soon) — same one-time fee as the Pricing page.
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-sm btn-rust" onClick={() => handleUpgrade(activeMemorial.id)} disabled={upgrading}>
                        {upgrading ? "Starting…" : `${BUILD.label} — ${BUILD.price}`}
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" className="promise-callout-link" onClick={() => onNavigate("our-promise")}>
                  Wondering what happens to this page over time? Read our promise →
                </button>
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
                  <div className="empty-state-title">{activeTab === "pending" ? "No pending submissions" : "No memories yet"}</div>
                  <p className="empty-state-sub">
                    {activeTab === "pending"
                      ? "You're all caught up. Share the invite link to get more memories coming in."
                      : "Share the link below to invite friends and family to contribute."}
                  </p>
                </div>
              ) : (
                filtered.map((s) => <SubmissionCard key={s.id} submission={s} requireApproval={activeMemorial.require_approval} onApprove={handleApprove} onReject={handleReject} onBlock={activeMemorial.is_paid ? handleBlock : null} />)
              )}
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <DeleteMemorialModal memorial={deleteTarget} onCancel={() => setDeleteTarget(null)} onDeleted={handleDeleted} showToast={showToast} />
      )}

      {addingMemory && activeMemorial && (
        <ShareMemoryModal
          memorial={activeMemorial}
          showToast={showToast}
          contributeToken={null}
          onClose={async () => {
            setAddingMemory(false);
            const rows = await loadSubmissions(activeMemorial.id);
            // Just used their last free memory — surface the upgrade
            // prompt now rather than waiting for their next add attempt.
            if (!activeMemorial.is_paid && rows.filter((s) => s.status !== "rejected").length >= FREE_MEMORY_LIMIT) {
              setShowMemoryLimit(true);
            }
          }}
        />
      )}

      {showMemoryLimit && activeMemorial && (
        <MemoryLimitModal memorial={activeMemorial} onClose={() => setShowMemoryLimit(false)} />
      )}

      {showPagePaywall && (
        <EmbeddedCheckoutModal
          tier={BUILD.tier}
          returnView="create"
          title={`One more page — ${BUILD.price}`}
          subtitle={`Your first page includes a free trial. Every page after that is ${BUILD.price}, one-time — same as the Pricing page, no separate free tier.`}
          onCancel={() => setShowPagePaywall(false)}
        />
      )}

      {showShare && activeMemorial && (
        <SharePagePanel
          memorial={activeMemorial}
          link={memorialUrl(activeMemorial)}
          showToast={showToast}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function DeleteMemorialModal({ memorial, onCancel, onDeleted, showToast }) {
  useScrollLock();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmText.trim() === memorial.name;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("memorials").delete().eq("id", memorial.id);
    setDeleting(false);
    if (error) { showToast("Couldn't delete — please try again.", "error"); return; }
    showToast(`"${memorial.name}" has been deleted.`);
    onDeleted(memorial.id);
  };

  return (
    <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="crop-adjust-card confirm-delete-card" role="dialog" aria-label={`Delete ${memorial.name}`}>
        <h3 className="crop-adjust-title">Delete {memorial.name}'s page?</h3>
        <p className="crop-adjust-sub confirm-delete-warning">
          This permanently deletes the page and every memory shared on it — {memorial.name.split(" ")[0]}'s photos, stories, voice memos, everything. Anyone with the link will no longer be able to view it. This can't be undone.
        </p>
        <div className="form-group">
          <label className="form-label">Type <strong>{memorial.name}</strong> to confirm</label>
          <input
            className="form-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={memorial.name}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && canDelete) handleDelete(); }}
          />
        </div>
        <div className="crop-adjust-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={!canDelete || deleting}>
            {deleting ? <><span className="spinner" /> Deleting...</> : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ submission: s, requireApproval, onApprove, onReject, onBlock }) {
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
      {s.media_url && s.type === "photo" && (
        <img className="submission-media" src={s.media_url} alt="" style={{ objectPosition: `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%` }} />
      )}
      {s.media_url && s.type === "video" && (
        <video className="submission-media" controls src={s.media_url} style={{ maxHeight: 240 }} />
      )}
      {s.media_url && s.type === "voice" && <audio controls src={s.media_url} style={{ width: "100%", marginBottom: 12 }} />}

      {requireApproval && s.status === "pending" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-rust" onClick={() => onApprove(s.id)}>Approve</button>
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
          {onBlock && <button className="btn btn-sm btn-ghost" onClick={() => onBlock(s)}>Block</button>}
        </div>
      )}
      {(!requireApproval || s.status === "approved") && s.status !== "rejected" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
          {onBlock && <button className="btn btn-sm btn-ghost" onClick={() => onBlock(s)}>Block</button>}
        </div>
      )}
    </div>
  );
}
