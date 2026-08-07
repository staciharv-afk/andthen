// Vercel serverless function — fetches a lightweight preview (title +
// thumbnail) for a contributor-submitted URL. YouTube gets special handling
// (oEmbed for the title, img.youtube.com for the thumbnail — no API key
// needed for either); any other URL gets a best-effort scrape of its
// <title>/og:title/og:image. Never throws past a best-effort empty preview —
// a failed unfurl shouldn't block someone from sharing a link, it just means
// the card renders without a thumbnail.
//
// No env required.

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 300_000; // title/og tags always live in <head>, near the top

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const embed = u.pathname.match(/^\/embed\/([^/]+)/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) return shorts[1];
    }
    return null;
  } catch {
    return null;
  }
}

// Accepts both plain seconds ("t=90") and YouTube's "1h2m3s" shorthand.
function parseTimestamp(raw) {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
}

// SSRF hardening: blocks the common private/loopback/link-local ranges so
// this endpoint can't be used to probe internal network addresses. A
// hostname-pattern check, not a full DNS-resolution check (a hostname could
// still resolve to a private IP via DNS), but it covers the direct-IP case,
// which is the one that matters for a publicly reachable Vercel function.
function isDisallowedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}

function extractMeta(html) {
  const pick = (re) => (html.match(re) || [])[1]?.trim() || null;
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  const title = ogTitle || pick(/<title[^>]*>([^<]*)<\/title>/i);
  const image = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)
    || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
  return { title: title ? decodeHtmlEntities(title) : null, image: image || null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const url = req.body?.url;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "Missing url" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol) || isDisallowedHost(parsed.hostname)) {
    return res.status(400).json({ error: "That URL isn't allowed" });
  }

  const videoId = extractYouTubeId(url);
  if (videoId) {
    const start = parseTimestamp(parsed.searchParams.get("t") || parsed.searchParams.get("start"));
    let title = null;
    try {
      const oembedRes = await fetchWithTimeout(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (oembedRes.ok) title = (await oembedRes.json())?.title || null;
    } catch {
      // title is best-effort — the thumbnail/videoId below are enough to render a card
    }
    return res.status(200).json({
      provider: "youtube",
      videoId,
      start,
      title,
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  try {
    const pageRes = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AndThenLinkPreview/1.0; +https://www.myandthen.com)" },
    });
    if (!pageRes.ok || !pageRes.body) return res.status(200).json({ provider: "generic", title: null, image: null });

    const reader = pageRes.body.getReader();
    let html = "";
    let bytes = 0;
    while (bytes < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      html += Buffer.from(value).toString("utf8");
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});

    const { title, image } = extractMeta(html);
    return res.status(200).json({ provider: "generic", title, image });
  } catch {
    // Best-effort — a scrape failure (bot-blocked, timeout, etc.) still lets
    // the contributor share the bare link, just without a thumbnail/title.
    return res.status(200).json({ provider: "generic", title: null, image: null });
  }
}
