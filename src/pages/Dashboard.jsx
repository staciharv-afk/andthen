import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { fmtDate, timeAgo, sendThankYou } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { exportMemorial } from "../lib/export";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { ShareMemoryModal } from "./Memorial";

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
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  const [upgrading, setUpgrading] = useState(false); // true while a checkout redirect is starting
  const [addingMemory, setAddingMemory] = useState(false);

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
      loadPendingAccessRequests(data[0].id);
    }
  };

  const loadSubmissions = async (memorialId) => {
    setSubmissionsLoading(true);
    const { data } = await supabase.from("contributions").select("*").eq("memorial_id", memorialId).order("created_at", { ascending: false });
    setSubmissionsLoading(false);
    setSubmissions(data || []);
  };

  // Just the count, for the Settings button's badge — the full list lives
  // on the Settings screen itself.
  const loadPendingAccessRequests = async (memorialId) => {
    const { count } = await supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("memorial_id", memorialId)
      .eq("status", "pending");
    setPendingAccessRequests(count || 0);
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

  // Prefer the steward's custom vanity URL (myandthen.com/<slug>) once set;
  // the invite-code link always works too, so it's the fallback. Used for
  // viewing/sharing the page itself — NOT for inviting contributors, since
  // invite_only mode only recognizes the code link (see inviteUrl below).
  const memorialUrl = (memorial) =>
    memorial.slug ? `${window.location.origin}/${memorial.slug}` : `${window.location.origin}?memorial=${memorial.invite_code}`;

  // The code link specifically — this is what counts as "a valid invite"
  // once a page is invite-only, regardless of whether a vanity slug is also
  // set, so the "Copy invite" button always hands out a link that works.
  const inviteUrl = (memorial) => `${window.location.origin}?memorial=${memorial.invite_code}`;

  const copyInviteLink = (memorial) => {
    trackEvent("share_clicked", { share_option: "copy_link" });
    navigator.clipboard.writeText(memorialUrl(memorial)).then(() => showToast("Link copied! Share it with family and friends."));
  };

  const copyInvite = (memorial) => {
    trackEvent("share_clicked", { share_option: "copy_invite" });
    const msg = memorial.invite_message || `I'm gathering memories of ${memorial.name}. Would you share one?`;
    navigator.clipboard.writeText(`${msg}\n\n${inviteUrl(memorial)}`).then(() => showToast("Invitation copied — message + link."));
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
          <div className="empty-state-title">No stories yet</div>
          <p className="empty-state-sub" style={{ marginBottom: 24 }}>Create your first page and start gathering stories.</p>
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
            <div className="dashboard-title">Your Stories</div>
            <div className="dashboard-sub">Manage stories and submissions</div>
          </div>
          <button className="btn btn-rust btn-sm" onClick={() => onNavigate("create")}>+ New story</button>
        </div>

        {memorials.length > 1 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {memorials.map((m) => (
              <button
                key={m.id}
                className={`btn btn-sm ${activeMemorial?.id === m.id ? "btn-rust" : "btn-ghost"}`}
                onClick={() => { setActiveMemorial(m); loadSubmissions(m.id); loadPendingAccessRequests(m.id); }}
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
                  <span className="invite-url">{memorialUrl(activeMemorial)}</span>
                </div>

                <div className="dashboard-actions">
                  <div className="dashboard-actions-row">
                    <button className="btn btn-sm btn-rust" onClick={() => setAddingMemory(true)}>+ Add a memory</button>
                    <ShareMenu onCopyLink={() => copyInviteLink(activeMemorial)} onCopyInvite={() => copyInvite(activeMemorial)} inviteDisabled={!activeMemorial.is_paid} />
                    <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("memorial", activeMemorial.invite_code)}>Preview</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("edit", activeMemorial)}>Edit</button>
                    <button className="btn btn-sm btn-ghost settings-btn" onClick={() => onNavigate("page-settings", activeMemorial)}>
                      Settings
                      {pendingAccessRequests > 0 && <span className="settings-btn-badge">{pendingAccessRequests}</span>}
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

      {deleteTarget && (
        <DeleteMemorialModal memorial={deleteTarget} onCancel={() => setDeleteTarget(null)} onDeleted={handleDeleted} showToast={showToast} />
      )}

      {addingMemory && activeMemorial && (
        <ShareMemoryModal
          memorial={activeMemorial}
          showToast={showToast}
          contributeToken={null}
          onClose={() => { setAddingMemory(false); loadSubmissions(activeMemorial.id); }}
        />
      )}
    </div>
  );
}

// Type-the-name-to-confirm pattern (same friction as GitHub/Vercel resource
// deletion) — deliberately no "are you sure" single click, since this is
// permanent and cascades to every memory shared on the page.
// "Copy link" and "Copy invite" stay functionally distinct (different
// clipboard payloads) — this only changes how they're presented, collapsing
// two always-visible buttons into one "Share" trigger + dropdown.
function ShareMenu({ onCopyLink, onCopyInvite, inviteDisabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="share-menu" ref={rootRef}>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)}>
        Share
      </button>
      {open && (
        <div className="share-menu-dropdown">
          <button type="button" className="share-menu-item" onClick={() => { onCopyLink(); setOpen(false); }}>
            <span className="share-menu-item-label">Copy link</span>
            <span className="share-menu-item-sub">The page itself, for anyone to view</span>
          </button>
          <button
            type="button"
            className="share-menu-item"
            disabled={inviteDisabled}
            onClick={() => { if (inviteDisabled) return; onCopyInvite(); setOpen(false); }}
          >
            <span className="share-menu-item-label">Copy invite</span>
            <span className="share-menu-item-sub">{inviteDisabled ? "Upgrade to invite others to contribute" : "Ask someone to contribute a memory"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteMemorialModal({ memorial, onCancel, onDeleted, showToast }) {
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
