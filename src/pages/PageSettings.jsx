import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { timeAgo, uid, notifyAccessApproved } from "../lib/utils";

// Per-page settings — reached from the dashboard's "Settings" button, not
// nested inside the Share dropdown (Share distributes the page, this
// governs it). Three sections: moderation (moved here from CreateMemorial,
// not duplicated), who can add memories, and — only when that's invite-only
// — the access request queue.
export function PageSettingsPage({ currentUser, memorial: initialMemorial, onNavigate, showToast }) {
  const [memorial, setMemorial] = useState(initialMemorial);
  const [requireApproval, setRequireApproval] = useState(!!initialMemorial.require_approval);
  const [accessMode, setAccessMode] = useState(initialMemorial.access_mode || "invite_only");
  const [savingModeration, setSavingModeration] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [checked, setChecked] = useState(new Set());
  const [busyIds, setBusyIds] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [memorial.id]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    const { data } = await supabase
      .from("access_requests")
      .select("id, requester_name, relationship, note, created_at")
      .eq("memorial_id", memorial.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoadingRequests(false);
  };

  const saveModeration = async (value) => {
    const prev = requireApproval;
    setRequireApproval(value);
    setSavingModeration(true);
    const { error } = await supabase.from("memorials").update({ require_approval: value }).eq("id", memorial.id);
    setSavingModeration(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); setRequireApproval(prev); return; }
    showToast(value ? "New memories will need your approval." : "New memories will publish automatically.");
  };

  const saveAccessMode = async (value) => {
    const prev = accessMode;
    setAccessMode(value);
    setSavingAccess(true);
    const { error } = await supabase.from("memorials").update({ access_mode: value }).eq("id", memorial.id);
    setSavingAccess(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); setAccessMode(prev); return; }
    setMemorial((m) => ({ ...m, access_mode: value }));
    showToast(value === "invite_only" ? "Only invited people can add memories now." : "Anyone who finds this page can add a memory now.");
  };

  // Returns true on success so bulk-approve can count how many actually went through.
  const approveRequest = async (req) => {
    setBusyIds((s) => new Set(s).add(req.id));
    const token = uid() + uid(); // same generator invite_code uses, doubled — this one grants standing access
    const { error } = await supabase
      .from("access_requests")
      .update({ status: "approved", contribute_token: token, approved_at: new Date().toISOString() })
      .eq("id", req.id);
    setBusyIds((s) => { const n = new Set(s); n.delete(req.id); return n; });
    if (error) return false;
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    notifyAccessApproved(req.id); // server re-derives the token/email and sends it — client never sees or sends the email itself
    return true;
  };

  const declineRequest = async (req) => {
    setBusyIds((s) => new Set(s).add(req.id));
    const { error } = await supabase.from("access_requests").update({ status: "declined" }).eq("id", req.id);
    setBusyIds((s) => { const n = new Set(s); n.delete(req.id); return n; });
    if (error) { showToast("Couldn't decline — please try again.", "error"); return; }
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
  };

  const handleApprove = async (req) => {
    const ok = await approveRequest(req);
    showToast(ok ? `Approved — ${req.requester_name || "they"}'ll get an email with their link.` : "Couldn't approve — please try again.", ok ? undefined : "error");
  };

  const toggleChecked = (id) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (e) => setChecked(e.target.checked ? new Set(requests.map((r) => r.id)) : new Set());

  const approveSelected = async () => {
    setBulkApproving(true);
    const targets = requests.filter((r) => checked.has(r.id));
    const results = await Promise.all(targets.map((r) => approveRequest(r)));
    setBulkApproving(false);
    setChecked(new Set());
    const n = results.filter(Boolean).length;
    showToast(n ? `Approved ${n} ${n === 1 ? "request" : "requests"} — each gets their own email with their own link.` : "Couldn't approve — please try again.", n ? undefined : "error");
  };

  return (
    <div className="create-page">
      <div className="create-inner">
        <div className="create-header fade-up">
          <span className="share-back-link" style={{ display: "inline-block", marginBottom: 10 }} onClick={() => onNavigate("dashboard")}>&larr; back to dashboard</span>
          <h1 className="create-title">Settings — {memorial.name}'s page</h1>
          <p className="create-sub">Controls how memories get added and reviewed.</p>
        </div>

        <div className="create-form fade-up-2">
          <div className="settings-section">
            <div className="settings-section-title">Reviewing new memories</div>
            <p className="settings-section-desc">Decide whether memories go straight onto the page or wait for you to look them over first.</p>
            <div className="moderation-toggle">
              <div>
                <div className="toggle-label">Approve stories before they appear</div>
                <div className="toggle-sub">{requireApproval ? "You'll review each submission before it goes live." : "Stories appear immediately — you can still remove them."}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={requireApproval} disabled={savingModeration} onChange={(e) => saveModeration(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {memorial.is_paid ? (
            <>
              <div className="settings-section">
                <div className="settings-section-title">Who can add memories</div>
                <p className="settings-section-desc">This controls what happens when someone finds the page without an invite link.</p>

                <label className={`access-mode-option${accessMode === "invite_only" ? " selected" : ""}`}>
                  <input type="radio" name="access_mode" checked={accessMode === "invite_only"} disabled={savingAccess} onChange={() => saveAccessMode("invite_only")} />
                  <div>
                    <div className="access-mode-label">Invite only <span className="settings-default-tag">Default</span></div>
                    <div className="access-mode-sub">Only people you've invited can add memories. Anyone else can view the page and ask for access.</div>
                  </div>
                </label>
                <label className={`access-mode-option${accessMode === "public" ? " selected" : ""}`}>
                  <input type="radio" name="access_mode" checked={accessMode === "public"} disabled={savingAccess} onChange={() => saveAccessMode("public")} />
                  <div>
                    <div className="access-mode-label">Public</div>
                    <div className="access-mode-sub">Anyone who finds this page can add a memory, no request needed.</div>
                  </div>
                </label>

                {accessMode === "public" && memorial.slug && (
                  <p className="settings-warning">
                    Switching back to invite only will mean people using your page address (myandthen.com/{memorial.slug}) will need to ask for access — share the invite link from Share instead.
                  </p>
                )}
              </div>

              {accessMode === "invite_only" && (
                <div className="settings-section">
                  <div className="settings-section-title">Access requests</div>
                  <p className="settings-section-desc">Approving emails them a personal link to add a memory — same no-signup flow as anyone you invite directly.</p>

                  {loadingRequests ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                      <span className="spinner spinner-dark" />
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="empty-state" style={{ padding: "32px 24px" }}>
                      <div className="empty-state-icon">✉️</div>
                      <div className="empty-state-title">No pending requests</div>
                      <p className="empty-state-sub">When someone asks to add a memory, they'll show up here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="access-req-bulkbar">
                        <label className="access-req-selectall">
                          <input type="checkbox" checked={checked.size > 0 && checked.size === requests.length} onChange={toggleSelectAll} />
                          Select all
                        </label>
                        {checked.size > 0 && (
                          <button type="button" className="btn btn-sm btn-rust" onClick={approveSelected} disabled={bulkApproving}>
                            {bulkApproving ? <><span className="spinner" /> Approving...</> : `Approve selected (${checked.size})`}
                          </button>
                        )}
                      </div>
                      <div className="access-req-list">
                        {requests.map((r) => (
                          <AccessRequestRow
                            key={r.id}
                            request={r}
                            checked={checked.has(r.id)}
                            onToggleChecked={() => toggleChecked(r.id)}
                            busy={busyIds.has(r.id)}
                            onApprove={() => handleApprove(r)}
                            onDecline={() => declineRequest(r)}
                          />
                        ))}
                      </div>
                      <p className="settings-hint">Declined requests aren't notified — they stay a regular visitor.</p>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="settings-section">
              <div className="settings-section-title">Who can add memories</div>
              <p className="settings-warning">
                {/* 5 mirrors FREE_MEMORY_LIMIT in Memorial.jsx / the contributions
                    INSERT policy — keep all three in sync if this ever changes. */}
                This page is still on the free plan — only you can add memories to it (up to 5), and there's no way to invite anyone else yet.
                Upgrading unlocks invites, access requests, and unlimited memories.
              </p>
              <button type="button" className="btn btn-sm btn-rust" style={{ marginTop: 12 }} onClick={() => onNavigate("pricing")}>See upgrade options</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccessRequestRow({ request: r, checked, onToggleChecked, busy, onApprove, onDecline }) {
  return (
    <div className="access-req-row">
      <input type="checkbox" checked={checked} onChange={onToggleChecked} disabled={busy} />
      <div className="avatar">{(r.requester_name || "?")[0].toUpperCase()}</div>
      <div className="access-req-info">
        <div className="access-req-name">{r.requester_name || "Someone"}</div>
        <div className="access-req-meta">{r.relationship ? `${r.relationship} · ` : ""}{timeAgo(r.created_at)}</div>
        {r.note && <div className="access-req-note">"{r.note}"</div>}
      </div>
      <div className="access-req-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onDecline} disabled={busy}>Decline</button>
        <button type="button" className="btn btn-sm btn-rust" onClick={onApprove} disabled={busy}>Approve</button>
      </div>
    </div>
  );
}
