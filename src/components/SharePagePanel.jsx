import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { trackEvent } from "../lib/analytics";

// Replaces the old two-button "Invite contributors" + "Share" split.
//
// Before this, "Invite contributors" collected named emails into this app
// and had the server send each one its own personal contribute_token link
// (see the now-removed InviteContributorsModal / api/notify-invite.js) —
// real extra work for a steward who's often grieving: compiling a list,
// typing addresses into our UI. Meanwhile "Share" already offered a link
// that grants both viewing AND contributing to anyone who has it,
// completely independent of who they are. There was never a real reason
// to also collect names/emails just to hand out that same permission one
// at a time.
//
// `link` is Dashboard.jsx's memorialUrl(memorial) — the steward's custom
// URL when they've set one, falling back to the invite-code link
// otherwise. Both shapes grant identical access (see Memorial.jsx's
// canContribute) — this used to only be true for the invite-code link,
// with the custom URL granting view-only under "Invite only" mode, but
// that distinction was quietly working against the whole point of this
// panel: a steward would copy the nice-looking custom link and it
// wouldn't actually let anyone add a memory. There's now just one link.
export function SharePagePanel({ memorial, link, showToast, onClose }) {
  const firstName = memorial.name.split(" ")[0];
  const [message, setMessage] = useState(
    memorial.invite_message
      ? `${memorial.invite_message}\n\n${link}`
      : `I created a page to remember ${firstName} — I'd love for you to add a photo or memory: ${link}`
  );

  const qrCanvasRef = useRef(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!qrCanvasRef.current) return;
    // High-contrast dark-on-white regardless of the site's cream/rust
    // theme — this needs to actually scan when printed small on a program
    // or memorial card, and a rust/cream code risks failing to scan.
    QRCode.toCanvas(qrCanvasRef.current, link, {
      width: 220,
      margin: 2,
      color: { dark: "#2D2118", light: "#FFFFFF" },
    })
      .then(() => setQrReady(true))
      .catch(() => setQrReady(false));
  }, [link]);

  const openText = () => {
    trackEvent("share_clicked", { share_option: "text", page_label: memorial.name });
    // sms: body pre-fill support/format (the "&" vs "?" before body) varies
    // by OS and carrier app — this is the commonly-used cross-platform form,
    // not something a web page can guarantee everywhere.
    window.location.href = `sms:&body=${encodeURIComponent(message)}`;
  };

  const openEmail = () => {
    trackEvent("share_clicked", { share_option: "email", page_label: memorial.name });
    const subject = `Would you share a memory of ${memorial.name}?`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  const copyLink = () => {
    trackEvent("share_clicked", { share_option: "copy_link", page_label: memorial.name });
    navigator.clipboard.writeText(link).then(() => showToast("Link copied! Anyone with it can view and add a memory."));
  };

  const downloadQrPng = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${memorial.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  const downloadQrSvg = async () => {
    const svg = await QRCode.toString(link, {
      type: "svg",
      margin: 2,
      color: { dark: "#2D2118", light: "#FFFFFF" },
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${memorial.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Composes a single ready-to-print card — name, dates, the QR code, and
  // a caption — so a steward can drop it straight into a funeral program
  // or guest book without designing anything themselves. PNG only (no PDF
  // library pulled in for this) at print resolution (1200×1600 ≈ a clean
  // 4×6" card at 300dpi).
  const downloadCard = () => {
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas) return;
    const W = 1200, H = 1600;
    const card = document.createElement("canvas");
    card.width = W;
    card.height = H;
    const ctx = card.getContext("2d");

    ctx.fillStyle = "#FDFAF5";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#B85C2C";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.textAlign = "center";
    ctx.fillStyle = "#2D2118";
    ctx.font = "500 64px Lora, serif";
    wrapText(ctx, memorial.name, W / 2, 220, W - 200, 74);

    const dates = [fmtDateShort(memorial.born), fmtDateShort(memorial.passed)].filter(Boolean).join(" — ");
    if (dates) {
      ctx.font = "300 34px 'DM Sans', sans-serif";
      ctx.fillStyle = "#7A5C42";
      ctx.fillText(dates, W / 2, 300);
    }

    const qrSize = 640;
    ctx.drawImage(qrCanvas, (W - qrSize) / 2, 460, qrSize, qrSize);

    ctx.font = "500 40px 'DM Sans', sans-serif";
    ctx.fillStyle = "#2D2118";
    ctx.fillText("Scan to view and add a memory", W / 2, 1230);

    ctx.font = "italic 32px Lora, serif";
    ctx.fillStyle = "#B85C2C";
    ctx.fillText("And Then...", W / 2, H - 80);

    card.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${memorial.name.replace(/\s+/g, "-").toLowerCase()}-card.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  return (
    <div className="crop-adjust-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="crop-adjust-card crop-adjust-card-wide" role="dialog" aria-label={`Share ${memorial.name}'s page`}>
        <h3 className="crop-adjust-title">Share {memorial.name}'s page</h3>
        <p className="crop-adjust-sub">
          One link does it all — anyone who has it can view the page and add a memory. No list to compile, nothing to manage.
        </p>

        {!memorial.is_paid && (
          <p className="form-hint" style={{ marginBottom: 14 }}>
            This page is still on the free plan — others can view it now, but adding memories is limited to you until it's upgraded.
          </p>
        )}

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Send an invite</label>
          <textarea
            className="form-input"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-sm btn-rust" onClick={openText}>Text</button>
            <button type="button" className="btn btn-sm btn-rust" onClick={openEmail}>Email</button>
          </div>
        </div>

        <hr className="story-divider" style={{ margin: "20px 0" }} />

        <div className="form-group" style={{ marginBottom: 4 }}>
          <label className="form-label">Copy link</label>
          <div className="chip-input" style={{ justifyContent: "space-between", cursor: "default" }}>
            <span style={{ fontSize: 13, color: "var(--bark-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copyLink} style={{ flexShrink: 0 }}>Copy</button>
          </div>
        </div>

        <hr className="story-divider" style={{ margin: "20px 0" }} />

        <div className="form-group">
          <label className="form-label">QR code</label>
          <p className="form-hint" style={{ marginBottom: 12 }}>
            High-contrast by design, so it scans reliably when printed small — on a funeral program, a memorial card, a guest book.
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ background: "#fff", padding: 10, borderRadius: "var(--radius)", border: "1px solid var(--warm-faint)" }}>
              <canvas ref={qrCanvasRef} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={downloadQrPng} disabled={!qrReady}>Download PNG</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={downloadQrSvg} disabled={!qrReady}>Download SVG</button>
              <button type="button" className="btn btn-sm btn-rust" onClick={downloadCard} disabled={!qrReady}>Download printable card</button>
            </div>
          </div>
        </div>

        <div className="crop-adjust-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function fmtDateShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric" });
}

// Plain canvas fillText has no built-in wrapping — splits on word
// boundaries and draws each line centered, for the memorial name on the
// printable card (names vary a lot in length).
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
