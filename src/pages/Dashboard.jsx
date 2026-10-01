import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { uid, fmtDate, fmtTime, timeAgo, genAccessCode, sendThankYou, notifyStewardInvite, notifyAccessApproved, FREE_MEMORY_LIMIT, memorialUrl } from "../lib/utils";
import { trackEvent } from "../lib/analytics";
import { exportMemorial } from "../lib/export";
import { PRICING_PLANS } from "../lib/pricingPlans";
import { ShareMemoryModal, CONTENT_TAGS, colorForContributor, initialsFor } from "./Memorial";
import { EmbeddedCheckoutModal } from "../components/EmbeddedCheckoutModal";
import { MemoryLimitModal } from "../components/MemoryLimitModal";
import { SharePagePanel } from "../components/SharePagePanel";
import { useScrollLock } from "../lib/useScrollLock";

const BUILD = PRICING_PLANS.find((p) => p.tier === "build");

// The label a pending-memory card and a recent-memory tile both show —
// combines type + "did they also write something" into one chip, per the
// redesign spec ("Written story", "Photo + story", "Voice memo", ...).
// Deliberately its own thing, not a reuse of Memorial.jsx's
// contentTypeLabel() — that one answers "what badge does a public grid
// tile show", which doesn't distinguish "photo alone" from "photo + text".
function dashContentLabel(s) {
  const hasText = !!s.text?.trim();
  if (s.type === "photo") return hasText ? "Photo + story" : "Photo";
  if (s.type === "video") return hasText ? "Video + story" : "Video";
  if (s.type === "voice") return "Voice memo";
  if (s.type === "url") return "Link";
  return "Written story";
}

export function DashboardPage({ currentUser, onNavigate, showToast }) {
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMemorial, setActiveMemorial] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessRequestBusyIds, setAccessRequestBusyIds] = useState(new Set());
  const [stewards, setStewards] = useState([]);
  const [stewardBusyIds, setStewardBusyIds] = useState(new Set());
  const [giftSuggestions, setGiftSuggestions] = useState([]);
  const [giftGifterName, setGiftGifterName] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // memorial pending delete confirmation, or null
  const [upgrading, setUpgrading] = useState(false); // true while a checkout redirect is starting
  const [addingMemory, setAddingMemory] = useState(false);
  const [showMemoryLimit, setShowMemoryLimit] = useState(false);
  const [showPagePaywall, setShowPagePaywall] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showFullSharePanel, setShowFullSharePanel] = useState(false); // the older, richer QR/printable-card panel — reachable from the new sheet, not replaced by it
  const [showCoStewardSheet, setShowCoStewardSheet] = useState(false);
  const [showStorySwitcher, setShowStorySwitcher] = useState(false);
  const [showAllMemories, setShowAllMemories] = useState(false); // expands Recent memories into the full Pending/Approved/All list
  const [allMemoriesTab, setAllMemoriesTab] = useState("pending");
  const [savingModeration, setSavingModeration] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  // The sticky bottom bar (mobile only) would otherwise sit right under a
  // toast — see ".has-dash-bottom-bar .toast-wrap" in styles.js.
  useEffect(() => {
    document.body.classList.add("has-dash-bottom-bar");
    return () => document.body.classList.remove("has-dash-bottom-bar");
  }, []);

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
      selectMemorial(data[0]);
    }
  };

  const selectMemorial = (m) => {
    setActiveMemorial(m);
    setShowAllMemories(false);
    loadSubmissions(m.id);
    loadAccessRequests(m.id);
    loadStewards(m.id);
    loadGiftSuggestions(m.id);
  };

  const loadSubmissions = async (memorialId) => {
    setSubmissionsLoading(true);
    const { data } = await supabase.from("contributions").select("*").eq("memorial_id", memorialId).order("created_at", { ascending: false });
    setSubmissionsLoading(false);
    setSubmissions(data || []);
    return data || [];
  };

  const loadAccessRequests = async (memorialId) => {
    const { data } = await supabase
      .from("access_requests")
      .select("id, requester_name, requester_email, relationship, note, created_at")
      .eq("memorial_id", memorialId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setAccessRequests(data || []);
  };

  const loadStewards = async (memorialId) => {
    const { data } = await supabase
      .from("memorial_stewards")
      .select("id, invited_email, invited_name, status, created_at")
      .eq("memorial_id", memorialId)
      .order("created_at", { ascending: false });
    setStewards(data || []);
  };

  // gift_purchases (where the gifter's name lives) has no client-facing
  // grants at all — reuses the same service-role endpoint the review
  // screen itself calls, rather than trying to read it directly under RLS.
  // Best-effort and silent: this only drives an optional dashboard prompt,
  // not something worth a toast if it fails to load.
  const loadGiftSuggestions = async (memorialId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/get-gift-costeward-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ memorialId }),
      });
      const data = await res.json();
      setGiftSuggestions(data.suggestedCostewards || []);
      setGiftGifterName(data.gifterName || null);
    } catch {
      setGiftSuggestions([]);
      setGiftGifterName(null);
    }
  };

  const updateActiveMemorial = (patch) => {
    setActiveMemorial((m) => ({ ...m, ...patch }));
    setMemorials((list) => list.map((m) => (m.id === activeMemorial.id ? { ...m, ...patch } : m)));
  };

  const firstName = activeMemorial?.name.split(" ")[0];

  const handleApprove = async (submissionId) => {
    await supabase.from("contributions").update({ status: "approved" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => (x.id === submissionId ? { ...x, status: "approved" } : x)));
    sendThankYou(submissionId); // emails the contributor if they left an address
    showToast(`Approved. It's on ${firstName}'s page now.`);
  };

  const handleApproveAll = async () => {
    const ids = submissions.filter((s) => s.status === "pending").map((s) => s.id);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => supabase.from("contributions").update({ status: "approved" }).eq("id", id)));
    setSubmissions((s) => s.map((x) => (ids.includes(x.id) ? { ...x, status: "approved" } : x)));
    ids.forEach((id) => sendThankYou(id));
    showToast(`Approved ${ids.length}. They're on ${firstName}'s page now.`);
  };

  // Descriptive tags are independent of a submission's type and can be
  // changed any time — during moderation or later from the full list.
  const handleSetTags = async (submissionId, tags) => {
    setSubmissions((s) => s.map((x) => (x.id === submissionId ? { ...x, tags } : x)));
    const { error } = await supabase.from("contributions").update({ tags }).eq("id", submissionId);
    if (error) {
      showToast("Couldn't update tags — please try again.", "error");
      loadSubmissions(activeMemorial.id);
    }
  };

  const handleReject = async (submissionId) => {
    await supabase.from("contributions").update({ status: "rejected" }).eq("id", submissionId);
    setSubmissions((s) => s.map((x) => (x.id === submissionId ? { ...x, status: "rejected" } : x)));
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

  const approveAccessRequest = async (req) => {
    setAccessRequestBusyIds((s) => new Set(s).add(req.id));
    const token = uid() + uid(); // same doubled-generator idiom contribute_token uses elsewhere
    const { error } = await supabase
      .from("access_requests")
      .update({ status: "approved", contribute_token: token, approved_at: new Date().toISOString() })
      .eq("id", req.id);
    setAccessRequestBusyIds((s) => { const n = new Set(s); n.delete(req.id); return n; });
    if (error) { showToast("Couldn't approve — please try again.", "error"); return; }
    setAccessRequests((rs) => rs.filter((r) => r.id !== req.id));
    notifyAccessApproved(req.id); // server re-derives the token/email and sends it — client never sees or sends the email itself
    showToast(`Approved — ${req.requester_name || "they"}'ll get an email with their link.`);
  };

  const declineAccessRequest = async (req) => {
    setAccessRequestBusyIds((s) => new Set(s).add(req.id));
    const { error } = await supabase.from("access_requests").update({ status: "declined" }).eq("id", req.id);
    setAccessRequestBusyIds((s) => { const n = new Set(s); n.delete(req.id); return n; });
    if (error) { showToast("Couldn't decline — please try again.", "error"); return; }
    setAccessRequests((rs) => rs.filter((r) => r.id !== req.id));
  };

  const inviteCoSteward = async ({ name, email }) => {
    const token = uid() + uid();
    const { data, error } = await supabase
      .from("memorial_stewards")
      .insert({ memorial_id: activeMemorial.id, invited_email: email, invited_name: name || null, invite_token: token, invited_by: currentUser.id })
      .select()
      .single();
    if (error) {
      showToast(error.code === "23505" ? "That person already has a pending invite." : "Couldn't send the invite — please try again.", "error");
      return false;
    }
    setStewards((s) => [data, ...s]);
    notifyStewardInvite(data.id);
    showToast(`Invite sent to ${email}.`);
    return true;
  };

  const removeSteward = async (row) => {
    setStewardBusyIds((s) => new Set(s).add(row.id));
    const { error } = await supabase.from("memorial_stewards").delete().eq("id", row.id);
    setStewardBusyIds((s) => { const n = new Set(s); n.delete(row.id); return n; });
    if (error) { showToast("Couldn't remove — please try again.", "error"); return; }
    setStewards((s) => s.filter((r) => r.id !== row.id));
    showToast(row.status === "accepted" ? "Removed as a co-steward." : "Invite canceled.");
  };

  const saveModeration = async (value) => {
    setSavingModeration(true);
    const { error } = await supabase.from("memorials").update({ require_approval: value }).eq("id", activeMemorial.id);
    setSavingModeration(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); return; }
    updateActiveMemorial({ require_approval: value });
    showToast(value ? "New memories will need your approval." : "New memories will publish automatically.");
  };

  // The dashboard's simplified two-way control — Invite only / Anyone —
  // maps onto the existing contribution_access field (open/code_required).
  // A fully private page (visibility='private') is a separate, bigger lock
  // still only reachable from Settings — this control just answers "does a
  // visitor who can already see the page need a code to add a memory too."
  const saveContributionAccess = async (value) => {
    setSavingAccess(true);
    const patch = { contribution_access: value };
    if (value === "code_required" && !activeMemorial.access_code) patch.access_code = genAccessCode();
    const { error } = await supabase.from("memorials").update(patch).eq("id", activeMemorial.id);
    setSavingAccess(false);
    if (error) { showToast("Couldn't save — please try again.", "error"); return; }
    updateActiveMemorial(patch);
    showToast(value === "open" ? "Anyone who can view the page can now add a memory." : "Adding a memory now needs an invite or the access code.");
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
        if (remaining.length) selectMemorial(remaining[0]);
        else { setActiveMemorial(null); setSubmissions([]); setAccessRequests([]); setStewards([]); }
      }
      return remaining;
    });
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorials.length) return (
    <div className="dash-page">
      <div className="dash-inner">
        <div className="empty-state fade-up">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">No pages yet</div>
          <p className="empty-state-sub" style={{ marginBottom: 24 }}>Create your first page and start gathering memories.</p>
          <button className="btn btn-rust" onClick={() => onNavigate("create")}>Start their page</button>
        </div>
      </div>
    </div>
  );

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");
  const contributorCount = new Set(approved.map((s) => s.contributor_name).filter(Boolean)).size;
  const contributionGated = activeMemorial.visibility === "private" || activeMemorial.contribution_access === "code_required";
  const waitingCount = pending.length + (contributionGated ? accessRequests.length : 0) + giftSuggestions.length;
  const atFreeLimit = !activeMemorial.is_paid && submissions.filter((s) => s.status !== "rejected").length >= FREE_MEMORY_LIMIT;

  const filteredAll = submissions.filter((s) => {
    if (allMemoriesTab === "pending") return s.status === "pending";
    if (allMemoriesTab === "approved") return s.status === "approved";
    return true;
  });

  return (
    <div className="dash-page">
      <div className="dash-inner">
        {memorials.length > 1 && (
          <StorySwitcher memorials={memorials} active={activeMemorial} onSelect={selectMemorial} open={showStorySwitcher} setOpen={setShowStorySwitcher} />
        )}

        <PageCard
          memorial={activeMemorial}
          submissions={approved}
          contributorCount={contributorCount}
          contributionGated={contributionGated}
          onAddMemory={() => (atFreeLimit ? setShowMemoryLimit(true) : setAddingMemory(true))}
          onShare={() => setShowShareSheet(true)}
          onView={() => onNavigate("memorial", activeMemorial.invite_code)}
          onEdit={() => onNavigate("edit", activeMemorial)}
        />

        <div className="dash-main-col">
        <section className="dash-section fade-up-2">
          <div className="dash-section-header">
            <h2>Waiting on you{waitingCount > 0 && <span className="dash-count-badge">{waitingCount}</span>}</h2>
            {pending.length >= 2 && (
              <button type="button" className="dash-text-btn" onClick={handleApproveAll}>Approve all {pending.length}</button>
            )}
          </div>

          {submissionsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}><span className="spinner spinner-dark" /></div>
          ) : waitingCount === 0 ? (
            <div className="dash-card dash-empty-waiting">You're all caught up. New memories and requests show up here first.</div>
          ) : (
            <>
              {pending.map((s) => (
                <PendingMemoryCard key={s.id} submission={s} onApprove={handleApprove} onDecline={handleReject} />
              ))}

              {contributionGated && accessRequests.length > 0 && (
                <div className="dash-access-requests">
                  <div className="dash-access-requests-title">Asking to add a memory</div>
                  <p className="dash-access-requests-helper">Approving emails them a personal link. Declining is quiet. They aren't told.</p>
                  <div className="dash-access-requests-grid">
                    {accessRequests.map((r) => (
                      <AccessRequestCard
                        key={r.id}
                        request={r}
                        busy={accessRequestBusyIds.has(r.id)}
                        onApprove={() => approveAccessRequest(r)}
                        onDecline={() => declineAccessRequest(r)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {giftSuggestions.length > 0 && (
                <div className="dash-card dash-pending-card">
                  <div className="dash-pending-name">Suggested by {giftGifterName || "whoever gave this page"}</div>
                  <p className="dash-pending-text" style={{ fontStyle: "normal", fontFamily: "'DM Sans', sans-serif", fontSize: 13.5 }}>
                    {giftSuggestions.length} {giftSuggestions.length === 1 ? "person" : "people"} suggested as co-stewards — {giftSuggestions.map((s) => s.name).join(", ")}.
                  </p>
                  <div className="dash-pending-actions">
                    <button type="button" className="btn-dash-primary" onClick={() => onNavigate("gift-costeward-review", { memorial: activeMemorial })}>Review</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="dash-quick-actions fade-up-2">
          <button type="button" className="dash-quick-tile" onClick={() => setShowCoStewardSheet(true)}>
            <span className="dash-quick-tile-icon" aria-hidden="true">+</span>
            <span>Add a co-steward</span>
          </button>
          <button type="button" className="dash-quick-tile" onClick={() => onNavigate("memorial", activeMemorial.invite_code)}>
            <span className="dash-quick-tile-icon" aria-hidden="true">↗</span>
            <span>View page</span>
          </button>
          <button type="button" className="dash-quick-tile" onClick={() => onNavigate("edit", activeMemorial)}>
            <span className="dash-quick-tile-icon" aria-hidden="true">✎</span>
            <span>Edit details</span>
          </button>
        </section>

        <section className="dash-section fade-up-3">
          <div className="dash-section-header">
            <h2>Recent memories</h2>
            {approved.length > 0 && (
              <button type="button" className="dash-text-btn" onClick={() => setShowAllMemories((v) => !v)}>
                {showAllMemories ? "Hide" : `See all ${submissions.length}`}
              </button>
            )}
          </div>

          {!showAllMemories ? (
            approved.length === 0 ? (
              <div className="dash-card dash-empty-waiting">Nothing approved yet — once you do, it'll show up here.</div>
            ) : (
              <div className="dash-recent-scroll">
                {approved.slice(0, 12).map((s) => <RecentMemoryTile key={s.id} story={s} />)}
              </div>
            )
          ) : (
            <div className="dash-all-memories">
              <div className="tab-bar">
                {[
                  { key: "pending", label: `Pending (${pending.length})` },
                  { key: "approved", label: `Approved (${approved.length})` },
                  { key: "all", label: "All" },
                ].map((t) => (
                  <button key={t.key} className={`tab ${allMemoriesTab === t.key ? "active" : ""}`} onClick={() => setAllMemoriesTab(t.key)}>{t.label}</button>
                ))}
              </div>
              {filteredAll.length === 0 ? (
                <div className="empty-state"><p className="empty-state-sub">Nothing here yet.</p></div>
              ) : (
                filteredAll.map((s) => (
                  <SubmissionCard key={s.id} submission={s} requireApproval={activeMemorial.require_approval} onApprove={handleApprove} onReject={handleReject} onSetTags={handleSetTags} onBlock={activeMemorial.is_paid ? handleBlock : null} />
                ))
              )}
            </div>
          )}
        </section>
        </div>

        <div className="dash-rail-col">
        <section className="dash-section fade-up-3">
          <div className="dash-section-header"><h2>Stewards</h2></div>
          <div className="dash-card dash-stewards-card">
            <StewardRow
              label={activeMemorial.steward_id === currentUser.id ? (currentUser.email || "You") : "Page owner"}
              chip="Owner"
            />
            {stewards.map((s) => (
              <StewardRow
                key={s.id}
                label={s.invited_name || s.invited_email}
                chip={s.status === "pending" ? "Invite sent" : null}
                onRemove={() => removeSteward(s)}
                busy={stewardBusyIds.has(s.id)}
              />
            ))}
            <button type="button" className="dash-add-steward-row" onClick={() => setShowCoStewardSheet(true)}>
              <span className="dash-dashed-plus" aria-hidden="true">+</span> Add a co-steward
            </button>
          </div>
          <p className="dash-helper-text">Co-stewards can approve memories and invite people. Only you can delete the page.</p>
        </section>

        <section className="dash-section fade-up-3">
          <div className="dash-section-header"><h2>Page settings</h2></div>
          <div className="dash-card dash-settings-card">
            {activeMemorial.is_paid && (
              <div className="dash-settings-row">
                <div className="dash-settings-label">Who can add memories</div>
                <div className="dash-segmented">
                  <button type="button" className={activeMemorial.contribution_access !== "code_required" ? "active" : ""} disabled={savingAccess} onClick={() => saveContributionAccess("open")}>Anyone</button>
                  <button type="button" className={activeMemorial.contribution_access === "code_required" ? "active" : ""} disabled={savingAccess} onClick={() => saveContributionAccess("code_required")}>Invite only</button>
                </div>
                <p className="dash-settings-helper">
                  {activeMemorial.contribution_access === "code_required"
                    ? "Only people with your invite link or access code can add a memory."
                    : "Anyone who can view the page can add a memory."}
                </p>
              </div>
            )}
            <div className="dash-settings-row">
              <div className="dash-settings-row-header">
                <div className="dash-settings-label">Review before memories go live</div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!activeMemorial.require_approval} disabled={savingModeration} onChange={(e) => saveModeration(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <p className="dash-settings-helper">
                {activeMemorial.require_approval
                  ? "On. You approve each memory before anyone else sees it."
                  : "Off. New memories appear on the page right away."}
              </p>
            </div>
          </div>
        </section>

        <section className="dash-section fade-up-3">
          <div className="dash-section-header"><h2>Page tools</h2></div>
          <div className="dash-card dash-tools-card">
            {activeMemorial.is_paid ? (
              <div className="dash-tools-row dash-tools-upgraded">✓ Upgraded — photo, video &amp; voice memories are unlocked.</div>
            ) : (
              <div className="dash-tools-row dash-tools-free">
                <span><strong>Free plan</strong> — written memories only.</span>
                <button className="btn btn-sm btn-rust" onClick={() => handleUpgrade(activeMemorial.id)} disabled={upgrading}>
                  {upgrading ? "Starting…" : `${BUILD.label} — ${BUILD.price}`}
                </button>
              </div>
            )}
            {activeMemorial.is_paid && (
              <button type="button" className="dash-tools-row dash-tools-action" onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting…" : "Export everything"}
              </button>
            )}
            <button type="button" className="dash-tools-row dash-tools-action" onClick={() => onNavigate("our-promise")}>
              What happens to this page over time
            </button>
            <button type="button" className="dash-tools-row dash-tools-action" onClick={() => onNavigate("page-settings", activeMemorial)}>
              More settings
            </button>
            <button type="button" className="link-danger dash-delete-link" onClick={() => setDeleteTarget(activeMemorial)}>Delete this page</button>
          </div>
        </section>
        </div>
      </div>

      <div className="dash-bottom-bar">
        <button type="button" className="btn-dash-outline" onClick={() => setShowShareSheet(true)}>Share</button>
        <button type="button" className="btn-dash-primary dash-bottom-add" onClick={() => (atFreeLimit ? setShowMemoryLimit(true) : setAddingMemory(true))}>+ Add a memory</button>
      </div>

      {deleteTarget && (
        <DeleteMemorialModal memorial={deleteTarget} onCancel={() => setDeleteTarget(null)} onDeleted={handleDeleted} showToast={showToast} />
      )}

      {addingMemory && activeMemorial && (
        <ShareMemoryModal
          memorial={activeMemorial}
          showToast={showToast}
          open={addingMemory}
          stories={submissions.filter((s) => s.status === "approved")}
          onSubmitted={() => loadSubmissions(activeMemorial.id)}
          onViewAllMemories={() => setAddingMemory(false)}
          contributeToken={null}
          onClose={async () => {
            setAddingMemory(false);
            const rows = await loadSubmissions(activeMemorial.id);
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

      {showShareSheet && activeMemorial && (
        <DashShareSheet
          memorial={activeMemorial}
          showToast={showToast}
          onClose={() => setShowShareSheet(false)}
          onMoreOptions={() => { setShowShareSheet(false); setShowFullSharePanel(true); }}
        />
      )}

      {showFullSharePanel && activeMemorial && (
        <SharePagePanel
          memorial={activeMemorial}
          link={memorialUrl(activeMemorial)}
          showToast={showToast}
          onClose={() => setShowFullSharePanel(false)}
        />
      )}

      {showCoStewardSheet && activeMemorial && (
        <CoStewardSheet
          memorial={activeMemorial}
          onClose={() => setShowCoStewardSheet(false)}
          onInvite={inviteCoSteward}
        />
      )}
    </div>
  );
}

function StorySwitcher({ memorials, active, onSelect, open, setOpen }) {
  return (
    <div className="dash-story-switcher">
      <button type="button" className="dash-story-switcher-btn" onClick={() => setOpen((v) => !v)}>
        Your stories <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <>
          <div className="dash-menu-scrim" onClick={() => setOpen(false)} />
          <div className="dash-story-switcher-menu">
            {memorials.map((m) => (
              <button
                key={m.id}
                type="button"
                className={active?.id === m.id ? "active" : ""}
                onClick={() => { onSelect(m); setOpen(false); }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PageCard({ memorial, submissions, contributorCount, contributionGated, onAddMemory, onShare, onView, onEdit }) {
  return (
    <div className="dash-page-card fade-up">
      <div className="dash-page-card-top">
        <div className="dash-page-thumb">
          {memorial.photo_url ? (
            <img src={memorial.photo_url} alt="" style={{ objectPosition: `${memorial.crop_x ?? 50}% ${memorial.crop_y ?? 50}%` }} />
          ) : (
            <span aria-hidden="true">🕊️</span>
          )}
        </div>
        <div className="dash-page-card-info">
          <div className="dash-page-name">{memorial.name}</div>
          {(memorial.born || memorial.passed) && (
            <div className="dash-page-dates">{fmtDate(memorial.born)}{memorial.born && memorial.passed && " – "}{fmtDate(memorial.passed)}</div>
          )}
          <div className="dash-chip-row">
            <span className={`dash-chip${memorial.paused ? " dash-chip-warn" : " dash-chip-live"}`}>{memorial.paused ? "Paused" : "Live"}</span>
            <span className="dash-chip">{contributionGated ? "Invite only" : "Open to anyone"}</span>
            {memorial.is_paid && <span className="dash-chip dash-chip-gold">Upgraded</span>}
          </div>
        </div>
        <div className="dash-page-card-actions">
          <button type="button" className="btn-dash-outline" onClick={onView}>View page</button>
          <button type="button" className="btn-dash-outline" onClick={onShare}>Share</button>
          <button type="button" className="btn-dash-primary" onClick={onAddMemory}>+ Add a memory</button>
        </div>
      </div>

      {submissions.length > 0 && (
        <div className="dash-page-card-stats">
          <div className="dash-avatar-stack">
            {[...new Set(submissions.map((s) => s.contributor_name).filter(Boolean))].slice(0, 5).map((name) => (
              <span key={name} className="dash-stack-avatar" style={{ background: colorForContributor(name) }} title={name}>{initialsFor(name)}</span>
            ))}
          </div>
          <span className="dash-stats-text">
            <strong>{contributorCount}</strong> {contributorCount === 1 ? "person has" : "people have"} shared <strong>{submissions.length}</strong> {submissions.length === 1 ? "memory" : "memories"}
          </span>
        </div>
      )}
    </div>
  );
}

function PendingMemoryCard({ submission: s, onApprove, onDecline }) {
  return (
    <div className="dash-card dash-pending-card">
      <div className="dash-pending-header">
        <span className="dash-init-avatar" style={{ background: colorForContributor(s.contributor_name || "?") }}>{initialsFor(s.contributor_name || "?")}</span>
        <div className="dash-pending-who">
          <div className="dash-pending-name">{s.contributor_name || "Someone"}</div>
          <div className="dash-pending-meta">{s.contributor_relation ? `${s.contributor_relation} · ` : ""}{timeAgo(s.created_at)}</div>
        </div>
        <span className="dash-type-chip">{dashContentLabel(s)}</span>
      </div>

      <div className="dash-pending-body">
        {s.media_url && s.type === "photo" && (
          <img className="dash-pending-media" src={s.media_url} alt="" style={{ objectPosition: `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%` }} />
        )}
        {s.media_url && s.type === "video" && (
          <video className="dash-pending-media" controls src={s.media_url} poster={s.secondary_media_url || undefined} />
        )}
        {s.media_url && s.type === "voice" && <PendingAudioRow src={s.media_url} />}

        {s.text && <p className="dash-pending-text">"{s.text}"</p>}
      </div>

      <div className="dash-pending-actions">
        <button type="button" className="btn-dash-primary" onClick={() => onApprove(s.id)}>Approve</button>
        <button type="button" className="btn-dash-outline" onClick={() => onDecline(s.id)}>Decline</button>
      </div>
    </div>
  );
}

function PendingAudioRow({ src }) {
  const [duration, setDuration] = useState(null);
  return (
    <div className="dash-audio-row">
      <audio controls src={src} onLoadedMetadata={(e) => setDuration(e.target.duration)} style={{ width: "100%" }} />
      {duration != null && <span className="dash-audio-duration">{fmtTime(duration)}</span>}
    </div>
  );
}

function AccessRequestCard({ request: r, busy, onApprove, onDecline }) {
  return (
    <div className="dash-card dash-access-request-card">
      <div className="dash-pending-name">{r.requester_name || "Someone"}</div>
      {r.relationship && <div className="dash-pending-meta">{r.relationship}</div>}
      {r.note && <p className="dash-pending-text">"{r.note}"</p>}
      <div className="dash-pending-actions">
        <button type="button" className="btn-dash-primary" disabled={busy} onClick={onApprove}>Let them add</button>
        <button type="button" className="btn-dash-outline" disabled={busy} onClick={onDecline}>Not now</button>
      </div>
    </div>
  );
}

function RecentMemoryTile({ story: s }) {
  const caption = s.text?.trim() || (s.contributor_name ? `From ${s.contributor_name}` : "");
  return (
    <div className="dash-recent-tile">
      <div className="dash-recent-tile-media">
        {s.type === "photo" && s.media_url && <img src={s.media_url} alt="" style={{ objectPosition: `${s.crop_x ?? 50}% ${s.crop_y ?? 50}%` }} />}
        {s.type === "video" && s.media_url && <video src={s.media_url} poster={s.secondary_media_url || undefined} muted />}
        {(s.type === "voice" || s.type === "story" || s.type === "url") && (
          <span className="dash-recent-tile-fallback" aria-hidden="true">{s.type === "voice" ? "🎙️" : s.type === "url" ? "🔗" : "✎"}</span>
        )}
        <span className="dash-recent-tile-type">{dashContentLabel(s)}</span>
      </div>
      <div className="dash-recent-tile-caption">{caption}</div>
      <div className="dash-recent-tile-name">{s.contributor_name || "Someone"}</div>
    </div>
  );
}

function StewardRow({ label, chip, onRemove, busy }) {
  return (
    <div className="dash-steward-row">
      <span className="dash-init-avatar" style={{ background: colorForContributor(label) }}>{initialsFor(label)}</span>
      <span className="dash-steward-label">{label}</span>
      {chip && <span className="dash-chip">{chip}</span>}
      {onRemove && (
        <button type="button" className="dash-steward-remove" disabled={busy} onClick={onRemove} aria-label="Remove">&times;</button>
      )}
    </div>
  );
}

function CoStewardSheet({ memorial, onClose, onInvite }) {
  useScrollLock();
  const firstName = memorial.name.split(" ")[0];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const submit = async () => {
    setInviting(true);
    const ok = await onInvite({ name: name.trim(), email: email.trim() });
    setInviting(false);
    if (ok) onClose();
  };

  return (
    <div className="dash-sheet-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dash-sheet" role="dialog" aria-label="Add a co-steward">
        <div className="dash-sheet-header">
          <h2>Add a co-steward</h2>
          <button type="button" className="dash-sheet-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div className="dash-sheet-body">
          <p className="dash-sheet-helper">Someone to help you look after {firstName}'s page. They can approve memories and invite people. Only you can delete it.</p>
          <div className="form-group">
            <label className="form-label">Their name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Their email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="dash-sheet-footer">
          <button type="button" className="btn-dash-primary" onClick={submit} disabled={inviting} style={{ width: "100%" }}>
            {inviting ? <><span className="spinner" /> Sending…</> : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashShareSheet({ memorial, showToast, onClose, onMoreOptions }) {
  useScrollLock();
  const firstName = memorial.name.split(" ")[0];
  const pageLink = memorialUrl(memorial);
  const needsCode = memorial.visibility === "private" || memorial.contribution_access === "code_required";
  const inviteLink = needsCode && memorial.access_code
    ? `${pageLink}${pageLink.includes("?") ? "&" : "?"}code=${memorial.access_code}`
    : pageLink;

  const copy = (text, label) => {
    trackEvent("share_clicked", { share_option: "copy_link", page_label: memorial.name });
    navigator.clipboard.writeText(text).then(() => showToast(label));
  };

  return (
    <div className="dash-sheet-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dash-sheet" role="dialog" aria-label={`Share ${memorial.name}'s page`}>
        <div className="dash-sheet-header">
          <h2>Share {firstName}'s page</h2>
          <button type="button" className="dash-sheet-close" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div className="dash-sheet-body">
          <div className="dash-share-card">
            <div className="dash-share-card-title">Invite people to add memories</div>
            <div className="dash-share-card-sub">{needsCode ? "This link includes the access code, so it works on its own." : "Anyone with this link can view the page and add a memory."}</div>
            <div className="dash-share-link">{inviteLink}</div>
            <button type="button" className="btn-dash-primary" onClick={() => copy(inviteLink, "Invite link copied.")} style={{ width: "100%" }}>Copy invite link</button>
          </div>
          <div className="dash-share-card">
            <div className="dash-share-card-title">Share the page to view</div>
            <div className="dash-share-card-sub">The plain page link.</div>
            <div className="dash-share-link">{pageLink}</div>
            <button type="button" className="btn-dash-outline" onClick={() => copy(pageLink, "Page link copied.")} style={{ width: "100%" }}>Copy page link</button>
          </div>
          <span className="dash-share-more" onClick={onMoreOptions}>More sharing options (QR code, printable card) →</span>
        </div>
      </div>
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

// The full Pending/Approved/All list — unchanged from before the redesign,
// just now reached via "Recent memories" → "See all N" instead of being the
// page's default view. Still the only place tags/block live, so it isn't
// going away, just no longer first.
function SubmissionCard({ submission: s, requireApproval, onApprove, onReject, onSetTags, onBlock }) {
  const typeLabel = { story: "Story", photo: "Photo", video: "Video", voice: "Voice memo" }[s.type] || "Story";
  const typeBadge = { story: "badge-story", photo: "badge-photo", video: "badge-video", voice: "badge-voice" }[s.type] || "badge-story";
  const tags = Array.isArray(s.tags) ? s.tags : [];
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const toggleTag = (tag) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onSetTags(s.id, next);
  };

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div className="avatar">{(s.contributor_name || "?")[0].toUpperCase()}</div>
        <div className="submission-name">{s.contributor_name || "Anonymous"}</div>
        <span className="submission-tag-wrap">
          <button
            type="button"
            className={`submission-type-badge ${typeBadge} submission-type-badge-btn`}
            onClick={() => setTagPickerOpen((o) => !o)}
            aria-expanded={tagPickerOpen}
            title="Add or remove tags"
          >
            {typeLabel} <span aria-hidden="true">▾</span>
          </button>
          {tagPickerOpen && (
            <>
              <div className="submission-tag-scrim" onClick={() => setTagPickerOpen(false)} />
              <div className="submission-tag-picker" role="menu">
                <div className="submission-tag-picker-label">Tags</div>
                {CONTENT_TAGS.map((tag) => (
                  <label key={tag} className="submission-tag-option">
                    <input type="checkbox" checked={tags.includes(tag)} onChange={() => toggleTag(tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </>
          )}
        </span>
        {tags.map((tag) => (
          <span key={tag} className="submission-type-badge badge-tag">{tag}</span>
        ))}
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
