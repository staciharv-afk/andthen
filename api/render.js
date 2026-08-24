// Serves the SPA shell (dist/index.html, untouched) for every non-API route,
// but swaps in per-memorial Open Graph/Twitter meta tags first when the
// route resolves to a memorial — so texting/sharing a memorial link shows
// that person's name and photo instead of the generic site card. Real
// browsers get the exact same HTML/JS/CSS either way; this only rewrites
// <head> meta content before React mounts.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_ANON_KEY (or
// VITE_SUPABASE_ANON_KEY) — anon key only, on purpose. The lookup relies
// entirely on memorials' own RLS (supabase/migrations/20260820_page_privacy.sql):
// public/unlisted rows come back and get real meta tags, private rows come
// back empty from the anon key and this silently falls through to the
// generic card. No privacy logic is duplicated here.

const RESERVED_SLUGS = new Set([
  "login", "create", "dashboard", "edit", "page-settings", "pricing",
  "onboarding", "story", "how-it-works", "admin", "our-promise",
  "home", "api", "assets",
]);

const SITE_ORIGIN = "https://www.myandthen.com";

// Warm-lambda cache for the built index.html — avoids an extra internal
// fetch on every request from a reused instance. Short TTL just so a
// redeploy's new hashed asset filenames show up promptly.
let shellCache = null;
let shellCacheAt = 0;
const SHELL_CACHE_MS = 60_000;

async function getShell(host) {
  if (shellCache && Date.now() - shellCacheAt < SHELL_CACHE_MS) return shellCache;
  const shellRes = await fetch(`https://${host}/index.html`);
  const html = await shellRes.text();
  shellCache = html;
  shellCacheAt = Date.now();
  return html;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setMetaContent(html, selectorAttr, key, value) {
  const re = new RegExp(`(<meta[^>]+${selectorAttr}=["']${key}["'][^>]+content=["'])[^"']*(["'])`, "i");
  return html.replace(re, (_m, pre, post) => `${pre}${escapeAttr(value)}${post}`);
}

function removeMeta(html, selectorAttr, key) {
  const re = new RegExp(`\\s*<meta[^>]+${selectorAttr}=["']${key}["'][^>]*/?>`, "i");
  return html.replace(re, "");
}

function setTitle(html, value) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(value)}</title>`);
}

function addRobotsNoindex(html) {
  return html.replace("</head>", `    <meta name="robots" content="noindex, nofollow" />\n  </head>`);
}

async function findMemorial(identifier) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !ANON_KEY || !identifier) return null;

  const filter = `or=(invite_code.eq.${encodeURIComponent(identifier)},slug.eq.${encodeURIComponent(identifier)})`;
  const url = `${SUPABASE_URL}/rest/v1/memorials?select=name,born,passed,description,photo_url,slug,invite_code,visibility&${filter}&limit=1`;
  try {
    const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const host = req.headers.host;
  const reqUrl = new URL(req.url, `https://${host}`);
  const memorialParam = reqUrl.searchParams.get("memorial");
  const pathSlug = reqUrl.pathname.replace(/^\/+|\/+$/g, "");
  const identifier = memorialParam || (pathSlug && !RESERVED_SLUGS.has(pathSlug) ? pathSlug : null);

  let html;
  try {
    html = await getShell(host);
  } catch {
    res.status(502).send("Unable to load app shell");
    return;
  }

  if (identifier) {
    const memorial = await findMemorial(identifier);
    if (memorial) {
      const title = `${memorial.name} — And Then...`;
      const years = [memorial.born, memorial.passed].filter(Boolean).join(" – ");
      const description = (memorial.description && memorial.description.trim())
        || (years
          ? `${memorial.name} (${years}). A living memorial built from shared memories.`
          : `A living memorial for ${memorial.name}, built from shared memories.`);
      const shortDescription = description.length > 200 ? `${description.slice(0, 197)}…` : description;
      const hasPhoto = Boolean(memorial.photo_url);
      const image = memorial.photo_url || `${SITE_ORIGIN}/home/hero-video-poster.jpg`;
      const canonicalPath = memorial.slug ? `/${memorial.slug}` : `/?memorial=${encodeURIComponent(memorial.invite_code)}`;
      const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;

      html = setTitle(html, title);
      html = setMetaContent(html, "name", "description", shortDescription);
      html = setMetaContent(html, "property", "og:title", title);
      html = setMetaContent(html, "property", "og:description", shortDescription);
      html = setMetaContent(html, "property", "og:image", image);
      html = setMetaContent(html, "property", "og:url", canonicalUrl);
      html = setMetaContent(html, "name", "twitter:title", title);
      html = setMetaContent(html, "name", "twitter:description", shortDescription);
      html = setMetaContent(html, "name", "twitter:image", image);
      if (hasPhoto) {
        // The site's default og:image:width/height describe the generic
        // hero poster, not this memorial's photo — drop them rather than
        // ship a wrong aspect-ratio hint.
        html = removeMeta(html, "property", "og:image:width");
        html = removeMeta(html, "property", "og:image:height");
      }
      if (memorial.visibility && memorial.visibility !== "public") {
        html = addRobotsNoindex(html);
      }
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.status(200).send(html);
}
