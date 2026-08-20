import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { timeAgo, uid, genAccessCode, notifyStewardInvite } from "../lib/utils";

// Per-page settings — reached from the dashboard's "Settings" button, not
// nested inside the Share dropdown (Share distributes the page, this
// governs it). Sections: moderation timing, page stewards, then (paid pages
// only) visibility, contribution access, the shared access code, the
// lifecycle lock, and blocked contributors.
export function PageSettingsPage({ currentUser, memorial: initialMemorial, onNavigate, showToast }) {
  const [memorial, setMemorial] = useState(initialMemorial);
  const [requireApproval, setRequireApproval] = useState(!!initialMemorial.require_approval);
  const [savingModeration, setSavingModeration] = useState(false);

  const [stewards, setStewards] = useState([]);
  const [loadingStewards, setLoadingStewards] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [stewardBusyIds, setStewardBusyIds] = useState(new Set());

  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingContributionAccess, setSavingContributionAccess] = useState(false);
  const [savingClosed, setSavingClosed] = useState(false);
  const [resettingCode, setResettingCode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [blocked, setBlocked] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [unblockingIds, setUnblockingIds] = useState(new Set());

  useEffect(() => {
    loadStewards();
    if (memorial.is_paid) loadBlocked();
  }, [memorial.id]);

  const loadBlocked = async () => {
    setLoadingBlocked(true);
    const { data } = await supabase
      .from("blocked_contributors")
      .select("id, identifier, identifier_type, created_at")
      .eq("memorial_id", memorial.id)
      .order("created_at", { ascending: false });
    setBlocked(data || []);
    setLoadingBlocked(false);
  };

  const unblock = async (row) => {
    setUnblockingIds((s) => new Set(s).add(row.id));
    const { error } = await supabase.from("blocked_contributors").delete().eq("id", row.id);
    setUnblockingIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
    if (error) { showToast("Couldn't unblock — please try again.", "error"); return; }
    setBlocked((b) => b.filter((r) => r.id !== row.id));
    showToast("Unblocked — they can add memories again.");
  };

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

  const saveVisibility = async (value) => {
    const prev = memorial.visibility;
    setSavingVisibility(true);
    // Switching to Private needs a code to gate on — generate one now if
    // there isn't one yet, same code Contribution access would also use.
    // Also nudges moderation on by default for a page going private (see
    // requirement 4) — a one-time default, not enforced afterward, so the
    // steward can still turn it back off immediately.
    const patch = { visibility: value };
    if (value === "private" && !memorial.access_code) patch.access_code = genAccessCode();
    if (value === "private" && prev !== "private") patch.require_approval = true;
    const { error } = await supabase.from("memorials").update(patch).eq("id", memorial.id);
    setSavingVisibility(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); return; }
    setMemorial((m) => ({ ...m, ...patch }));
    if (patch.require_approval) setRequireApproval(true);
    showToast(`Page set to ${value === "public" ? "Public" : value === "unlisted" ? "Unlisted" : "Private"}.`);
  };

  const saveContributionAccess = async (value) => {
    setSavingContributionAccess(true);
    const patch = { contribution_access: value };
    if (value === "code_required" && !memorial.access_code) patch.access_code = genAccessCode();
    const { error } = await supabase.from("memorials").update(patch).eq("id", memorial.id);
    setSavingContributionAccess(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); return; }
    setMemorial((m) => ({ ...m, ...patch }));
    showToast(value === "open" ? "Anyone who can view the page can now add a memory." : "Adding a memory now requires the access code.");
  };

  const saveClosedToSubmissions = async (value) => {
    setSavingClosed(true);
    const { error } = await supabase.from("memorials").update({ closed_to_submissions: value }).eq("id", memorial.id);
    setSavingClosed(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); return; }
    setMemorial((m) => ({ ...m, closed_to_submissions: value }));
    showToast(value ? "New submissions are closed — the page stays viewable." : "The page is open to new submissions again.");
  };

  const resetAccessCode = async () => {
    setResettingCode(true);
    const newCode = genAccessCode();
    const { error } = await supabase.from("memorials").update({ access_code: newCode }).eq("id", memorial.id);
    setResettingCode(false);
    setShowResetConfirm(false);
    if (error) { showToast("Couldn't reset — please try again.", "error"); return; }
    setMemorial((m) => ({ ...m, access_code: newCode }));
    showToast("Code reset — the old code (and any link or QR code with it embedded) no longer works.");
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

          {memorial.is_paid ? (
            <>
              <div className="settings-section">
                <div className="settings-section-title">Visibility</div>
                <p className="settings-section-desc">Who can find and view this page.</p>

                <label className={`privacy-option${memorial.visibility === "public" ? " selected" : ""}`}>
                  <input type="radio" name="visibility" checked={memorial.visibility === "public"} disabled={savingVisibility} onChange={() => saveVisibility("public")} />
                  <div>
                    <div className="privacy-option-label">Public</div>
                    <div className="privacy-option-sub">Viewable by anyone with the link, and can be found through search engines.</div>
                  </div>
                </label>
                <label className={`privacy-option${memorial.visibility === "unlisted" ? " selected" : ""}`}>
                  <input type="radio" name="visibility" checked={memorial.visibility === "unlisted"} disabled={savingVisibility} onChange={() => saveVisibility("unlisted")} />
                  <div>
                    <div className="privacy-option-label">Unlisted</div>
                    <div className="privacy-option-sub">Viewable by anyone with the link, but not searchable — search engines are asked not to index it.</div>
                  </div>
                </label>
                <label className={`privacy-option${memorial.visibility === "private" ? " selected" : ""}`}>
                  <input type="radio" name="visibility" checked={memorial.visibility === "private"} disabled={savingVisibility} onChange={() => saveVisibility("private")} />
                  <div>
                    <div className="privacy-option-label">Private</div>
                    <div className="privacy-option-sub">Requires the access code below just to view it — viewing and adding a memory use the same code.</div>
                  </div>
                </label>
              </div>

              {memorial.visibility !== "private" && (
                <div className="settings-section">
                  <div className="settings-section-title">Who can add a memory</div>
                  <p className="settings-section-desc">Separate from visibility — a page can be freely viewable and still require a code just to contribute.</p>

                  <label className={`privacy-option${memorial.contribution_access === "open" ? " selected" : ""}`}>
                    <input type="radio" name="contribution_access" checked={memorial.contribution_access === "open"} disabled={savingContributionAccess} onChange={() => saveContributionAccess("open")} />
                    <div>
                      <div className="privacy-option-label">Open</div>
                      <div className="privacy-option-sub">Anyone who can view the page can add a memory.</div>
                    </div>
                  </label>
                  <label className={`privacy-option${memorial.contribution_access === "code_required" ? " selected" : ""}`}>
                    <input type="radio" name="contribution_access" checked={memorial.contribution_access === "code_required"} disabled={savingContributionAccess} onChange={() => saveContributionAccess("code_required")} />
                    <div>
                      <div className="privacy-option-label">Requires a code</div>
                      <div className="privacy-option-sub">Viewing stays open, but adding a memory needs the access code below.</div>
                    </div>
                  </label>
                </div>
              )}

              {(memorial.visibility === "private" || memorial.contribution_access === "code_required") && (
                <div className="settings-section">
                  <div className="settings-section-title">Access code</div>
                  <p className="settings-section-desc">Share this from the Share panel, or hand it out separately.</p>
                  <div className="chip-input" style={{ justifyContent: "space-between", cursor: "default" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 15, letterSpacing: "0.08em", color: "var(--bark)" }}>{memorial.access_code}</span>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowResetConfirm(true)}>Reset code</button>
                  </div>
                </div>
              )}

              <div className="settings-section">
                <div className="settings-section-title">New submissions</div>
                <div className="moderation-toggle">
                  <div>
                    <div className="toggle-label">Close new submissions</div>
                    <div className="toggle-sub">{memorial.closed_to_submissions ? "The page is view-only — nobody can add a memory right now." : "The page is open — anyone allowed to contribute still can."}</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={!!memorial.closed_to_submissions} disabled={savingClosed} onChange={(e) => saveClosedToSubmissions(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">Blocked contributors</div>
                <p className="settings-section-desc">Block someone from a memory they submitted (in the Pending/Approved list above) — they won't be able to add another.</p>

                {loadingBlocked ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                    <span className="spinner spinner-dark" />
                  </div>
                ) : blocked.length === 0 ? (
                  <p className="settings-hint">No one is blocked.</p>
                ) : (
                  <div className="access-req-list">
                    {blocked.map((b) => (
                      <div className="access-req-row" key={b.id}>
                        <div className="avatar">{b.identifier[0].toUpperCase()}</div>
                        <div className="access-req-info">
                          <div className="access-req-name">{b.identifier}</div>
                          <div className="access-req-meta">{b.identifier_type === "email" ? "Blocked by email" : "Blocked by name"} · {timeAgo(b.created_at)}</div>
                        </div>
                        <div className="access-req-actions">
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => unblock(b)} disabled={unblockingIds.has(b.id)}>Unblock</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
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

      {showResetConfirm && (
        <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}>
          <div className="crop-adjust-card" role="dialog" aria-label="Reset access code">
            <h3 className="crop-adjust-title">Reset the access code?</h3>
            <p className="crop-adjust-sub confirm-delete-warning">
              Anyone with the old code — including a link or QR code it's embedded in — loses access immediately. Anyone who still needs in will need the new code.
            </p>
            <div className="crop-adjust-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowResetConfirm(false)} disabled={resettingCode}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={resetAccessCode} disabled={resettingCode}>
                {resettingCode ? <><span className="spinner" /> Resetting...</> : "Reset code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
