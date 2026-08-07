// Paid-tier export (Phase 2): downloads a memorial as a self-contained ZIP —
// a brand-styled memories.html you can open forever, the actual media files,
// and a memories.json of the raw data. Runs entirely in the browser; the
// signed-in steward reads their own memorial's approved memories and fetches
// the public media to bundle it. No server involved.
import { supabase } from "./supabase";
import { fmtDate } from "./utils";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) =>
  String(s || "memorial").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "memorial";

export async function exportMemorial(memorial) {
  const { default: JSZip } = await import("jszip"); // lazy-load — only when exporting
  const zip = new JSZip();
  const { data } = await supabase
    .from("contributions")
    .select("*")
    .eq("memorial_id", memorial.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  const memories = data || [];

  const mediaFolder = zip.folder("media");
  const cards = [];
  for (let i = 0; i < memories.length; i++) {
    const m = memories[i];
    let mediaTag = "";
    if (m.media_url) {
      try {
        const resp = await fetch(m.media_url);
        const blob = await resp.blob();
        const ext = ((m.media_url.split("?")[0].split(".").pop()) || "bin").slice(0, 5);
        const filename = `${String(i + 1).padStart(3, "0")}-${slug(m.contributor_name)}.${ext}`;
        mediaFolder.file(filename, blob);
        if (m.type === "photo") mediaTag = `<img src="media/${filename}" alt="" style="object-fit: cover; object-position: ${m.crop_x ?? 50}% ${m.crop_y ?? 50}%;" />`;
        else if (m.type === "video") mediaTag = `<video controls src="media/${filename}"></video>`;
        else if (m.type === "voice") mediaTag = `<audio controls src="media/${filename}"></audio>`;
      } catch {
        mediaTag = `<p class="missing">[media couldn't be downloaded — still viewable on the live page]</p>`;
      }
    }
    cards.push(
      `    <div class="memory">
      <div class="who">${esc(m.contributor_name || "Anonymous")}${m.contributor_relation ? ` · ${esc(m.contributor_relation)}` : ""}</div>
      <div class="when">${esc(fmtDate(m.created_at))}</div>
      ${m.text ? `<p class="text">${esc(m.text)}</p>` : ""}
      ${mediaTag}
    </div>`
    );
  }

  const datesLine =
    memorial.born || memorial.passed
      ? `<div class="dates">${esc(fmtDate(memorial.born))}${memorial.born && memorial.passed ? " — " : ""}${esc(fmtDate(memorial.passed))}</div>`
      : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(memorial.name)} — Memories</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 48px 24px; color: #2D2118; background: #FDFAF5; line-height: 1.65; }
  h1 { font-size: 34px; margin: 0 0 4px; }
  .dates { color: #A08060; margin-bottom: 16px; }
  .desc { color: #7A5C42; margin-bottom: 8px; }
  .count { color: #A08060; font-size: 14px; margin-bottom: 24px; }
  .memory { border-top: 1px solid #E8DFD0; padding: 24px 0; }
  .who { font-weight: bold; }
  .when { color: #A08060; font-size: 13px; margin-bottom: 8px; }
  .text { white-space: pre-wrap; margin: 0; }
  img, video { max-width: 100%; border-radius: 6px; margin-top: 12px; display: block; }
  audio { width: 100%; margin-top: 12px; }
  .missing { color: #999; font-style: italic; }
  footer { margin-top: 48px; color: #A08060; font-size: 13px; }
</style></head><body>
  <h1>${esc(memorial.name)}</h1>
  ${datesLine}
  ${memorial.description ? `<div class="desc">${esc(memorial.description)}</div>` : ""}
  <div class="count">${memories.length} ${memories.length === 1 ? "memory" : "memories"}</div>
${cards.join("\n")}
  <footer>Exported from And Then · myandthen.com</footer>
</body></html>`;

  zip.file("memories.html", html);
  zip.file(
    "memories.json",
    JSON.stringify(
      {
        memorial: { name: memorial.name, born: memorial.born, passed: memorial.passed, description: memorial.description },
        exported_at: new Date().toISOString(),
        memories,
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(memorial.name)}-memories.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return memories.length;
}
