import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { timeAgo, uid, notifyStewardInvite } from "../lib/utils";

// Per-page settings — reached from the dashboard's "Settings" button, not
// nested inside the Share dropdown (Share distributes the page, this
// governs it). Two sections: moderation (moved here from CreateMemorial,
// not duplicated) and page stewards.
export function PageSettingsPage({ currentUser, memorial: initialMemorial, onNavigate, showToast }) {
  const [memorial, setMemorial] = useState(initialMemorial);
  const [requireApproval, setRequireApproval] = useState(!!initialMemorial.require_approval);
  const [savingModeration, setSavingModeration] = useState(false);

  const [stewards, setStewards] = useState([]);
  const [loadingStewards, setLoadingStewards] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [stewardBusyIds, setStewardBusyIds] = useState(new Set());

  useEffect(() => {
    loadStewards();
  }, [memorial.id]);

  const loadStewards = async () => {
    setLoadingStewards(true);
    const { data } = await supabase
      .from("memorial_stewards")
      .select("id, invited_email, status, created_at")
      .eq("memorial_id", memorial.id)
      .order("created_at", { ascending: false });
    setStewards(data || []);
    setLoadingStewards(false);
  };

  const inviteSteward = async () => {
    const email = inviteEmail.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showToast("Please enter a valid email.", "error"); return; }
    setInviting(true);
    const token = uid() + uid(); // same doubled-generator idiom access_requests' contribute_token uses
    const { data, error } = await supabase
      .from("memorial_stewards")
      .insert({ memorial_id: memorial.id, invited_email: email, invite_token: token, invited_by: currentUser.id })
      .select()
      .single();
    setInviting(false);
    if (error) {
      showToast(error.code === "23505" ? "That person already has a pending invite." : "Couldn't send the invite — please try again.", "error");
      return;
    }
    setInviteEmail("");
    setStewards((s) => [data, ...s]);
    notifyStewardInvite(data.id); // server re-derives everything and sends the email
    showToast(`Invite sent to ${email}.`);
  };

  const removeSteward = async (row) => {
    setStewardBusyIds((s) => new Set(s).add(row.id));
    const { error } = await supabase.from("memorial_stewards").delete().eq("id", row.id);
    setStewardBusyIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
    if (error) { showToast("Couldn't remove — please try again.", "error"); return; }
    setStewards((s) => s.filter((r) => r.id !== row.id));
    showToast(row.status === "accepted" ? "Removed as a page steward." : "Invite canceled.");
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

          <div className="settings-section">
            <div className="settings-section-title">Page stewards</div>
            <p className="settings-section-desc">Other people who can manage this page just like you — edit it, review memories, and invite more stewards.</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="email"
                placeholder="their@email.com"
                className="form-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") inviteSteward(); }}
                disabled={inviting}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-sm btn-rust" onClick={inviteSteward} disabled={inviting}>
                {inviting ? <><span className="spinner" /> Inviting...</> : "Invite"}
              </button>
            </div>

            {loadingStewards ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                <span className="spinner spinner-dark" />
              </div>
            ) : stewards.length === 0 ? (
              <p className="settings-hint">Just you, for now.</p>
            ) : (
              <div className="access-req-list">
                {stewards.map((s) => (
                  <div className="access-req-row" key={s.id}>
                    <div className="avatar">{s.invited_email[0].toUpperCase()}</div>
                    <div className="access-req-info">
                      <div className="access-req-name">{s.invited_email}</div>
                      <div className="access-req-meta">{s.status === "accepted" ? "Steward" : "Invite pending"} · {timeAgo(s.created_at)}</div>
                    </div>
                    <div className="access-req-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeSteward(s)} disabled={stewardBusyIds.has(s.id)}>
                        {s.status === "accepted" ? "Remove" : "Cancel invite"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!memorial.is_paid && (
            <div className="settings-section">
              <div className="settings-section-title">Who can add memories</div>
              <p className="settings-warning">
                {/* 5 mirrors FREE_MEMORY_LIMIT in Memorial.jsx / the contributions
                    INSERT policy — keep all three in sync if this ever changes. */}
                This page is still on the free plan — only you can add memories to it (up to 5), and there's no way to invite anyone else yet.
                Upgrading unlocks sharing the page and unlimited memories.
              </p>
              <button type="button" className="btn btn-sm btn-rust" style={{ marginTop: 12 }} onClick={() => onNavigate("pricing")}>See upgrade options</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
