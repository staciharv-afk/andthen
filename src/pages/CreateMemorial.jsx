import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { uid, fileToDataURL, slugify } from "../lib/utils";
import { RESERVED_SLUGS } from "../lib/router";

export function CreateMemorialPage({ currentUser, existing, onCreated, onUpdated, onCancel, showToast }) {
  const isEdit = Boolean(existing);
  const [name, setName] = useState(existing?.name || "");
  const [born, setBorn] = useState(existing?.born || "");
  const [passed, setPassed] = useState(existing?.passed || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [stewardRelation, setStewardRelation] = useState(existing?.steward_relation || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [prompts, setPrompts] = useState(() => {
    const src = existing?.prompts?.length ? existing.prompts : (existing?.prompt ? [existing.prompt] : []);
    return [src[0] || "", src[1] || "", src[2] || ""];
  });
  const setPromptAt = (i, v) => setPrompts((p) => p.map((x, idx) => (idx === i ? v : x)));
  const [inviteMessage, setInviteMessage] = useState(existing?.invite_message || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(existing?.photo_url || null);
  const [requireApproval, setRequireApproval] = useState(existing ? !!existing.require_approval : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  const handlePhotoSelect = async (file) => {
    if (!file) return;
    setPhotoFile(file);
    const preview = await fileToDataURL(file);
    setPhotoPreview(preview);
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) { setError("Please enter their name."); return; }
    const cleanSlug = slug.trim() ? slugify(slug) : null;
    if (slug.trim() && !cleanSlug) { setError("That page address needs at least one letter or number."); return; }
    if (cleanSlug && RESERVED_SLUGS.has(cleanSlug)) { setError("That page address is reserved — please choose another."); return; }
    setLoading(true);
    const cleanPrompts = prompts.map((s) => s.trim()).filter(Boolean);
    try {
      if (isEdit) {
        // Keep the existing photo unless a new one was chosen.
        let photoUrl = existing.photo_url || null;
        if (photoFile) {
          const path = `memorials/${existing.invite_code}/cover-${uid()}.${photoFile.name.split(".").pop()}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage.from("memorial-media").upload(path, photoFile);
          if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage.from("memorial-media").getPublicUrl(path);
            photoUrl = urlData?.publicUrl;
          }
        }

        const { data, error: err } = await supabase.from("memorials").update({
          name: name.trim(),
          born: born || null,
          passed: passed || null,
          description: description.trim() || null,
          steward_relation: stewardRelation.trim() || null,
          prompts: cleanPrompts.length ? cleanPrompts : null,
          prompt: cleanPrompts[0] || null,
          invite_message: inviteMessage.trim() || null,
          photo_url: photoUrl,
          require_approval: requireApproval,
          slug: cleanSlug,
        }).eq("id", existing.id).select();

        if (err) { setError(err.code === "23505" ? "That page address is already taken — please choose another." : (err.message || "Couldn't save your changes. Please try again.")); return; }

        showToast("Memorial updated.");
        onUpdated(data?.[0] || { ...existing, name: name.trim() });
        return;
      }

      const inviteCode = uid();
      let photoUrl = null;

      if (photoFile) {
        const path = `memorials/${inviteCode}/cover.${photoFile.name.split(".").pop()}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage.from("memorial-media").upload(path, photoFile);
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from("memorial-media").getPublicUrl(path);
          photoUrl = urlData?.publicUrl;
        }
      }

      const { data, error: err } = await supabase.from("memorials").insert({
        name: name.trim(),
        born: born || null,
        passed: passed || null,
        description: description.trim() || null,
        steward_relation: stewardRelation.trim() || null,
        prompts: cleanPrompts.length ? cleanPrompts : null,
        prompt: cleanPrompts[0] || null,
        invite_message: inviteMessage.trim() || null,
        photo_url: photoUrl,
        steward_id: currentUser.id,
        invite_code: inviteCode,
        require_approval: requireApproval,
        slug: cleanSlug,
      }).select();

      if (err) { setError(err.code === "23505" ? "That page address is already taken — please choose another." : (err.message || "Failed to create memorial. Please try again.")); return; }

      showToast("Memorial created! Share the link to start gathering stories.");
      onCreated(data[0] || { id: uid(), name, invite_code: inviteCode });
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <div className="create-inner">
        <div className="create-header fade-up">
          <h1 className="create-title">{isEdit ? "Edit memorial" : "Create a memorial"}</h1>
          <p className="create-sub">{isEdit ? "Update the photo, name, dates, or description. Changes show right away." : "A place to gather the stories only the people who loved them know. Takes about two minutes to set up."}</p>
        </div>

        <div className="create-form fade-up-2">
          <div
            className="photo-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="photo-upload-text">Add a photo of them (optional)</span>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoSelect(e.target.files[0])} />
          </div>

          <div className="form-group">
            <label className="form-label">Their name *</label>
            <input className="form-input" placeholder="Full name or how they were known" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Your relationship to them</label>
            <input className="form-input" placeholder="e.g. Daughter" value={stewardRelation} onChange={(e) => setStewardRelation(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Page address (optional)</label>
            <input className="form-input" placeholder="e.g. debhausch" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <span className="form-hint">
              {slug.trim() ? `myandthen.com/${slugify(slug)}` : "Leave blank to keep the default link — you can add this anytime."}
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Born</label>
              <input className="form-input" type="date" value={born} onChange={(e) => setBorn(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Passed</label>
              <input className="form-input" type="date" value={passed} onChange={(e) => setPassed(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">A short description</label>
            <textarea className="form-input" placeholder="Who were they? Not the résumé — the real stuff. The quirks, the warmth, the thing everyone remembers." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="form-group">
            <label className="form-label">Starter prompts for contributors</label>
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                className="form-input"
                style={{ marginTop: i ? 8 : 0 }}
                placeholder={i === 0 ? `e.g. And then ${(name.trim().split(" ")[0]) || "they"}…` : "Another prompt (optional)"}
                value={prompts[i]}
                onChange={(e) => setPromptAt(i, e.target.value)}
              />
            ))}
            <span className="form-hint">Up to 3 — contributors see them rotating on the sharing form. Leave blank for a default.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Invitation message</label>
            <textarea className="form-input" placeholder={`e.g. I'm gathering memories of ${(name.trim().split(" ")[0]) || "them"}. Would you share one?`} value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} rows={3} />
            <span className="form-hint">Used by the “Copy invite” button — the link is added automatically. Leave blank for a default.</span>
          </div>

          <div className="moderation-toggle">
            <div>
              <div className="toggle-label">Approve stories before they appear</div>
              <div className="toggle-sub">{requireApproval ? "You'll review each submission before it goes live." : "Stories appear immediately — you can still remove them."}</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            {isEdit && (
              <button className="btn btn-ghost btn-lg" onClick={onCancel} disabled={loading} style={{ justifyContent: "center" }}>
                Cancel
              </button>
            )}
            <button className="btn btn-rust btn-lg" onClick={handleSubmit} disabled={loading} style={{ justifyContent: "center", flex: 1 }}>
              {loading
                ? <><span className="spinner" /> {isEdit ? "Saving..." : "Creating..."}</>
                : isEdit ? "Save changes" : "✦ Create memorial"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
