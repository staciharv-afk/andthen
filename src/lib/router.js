export const APP_VIEWS = ["login", "create", "dashboard", "edit"];

// Slugs a memorial can't use — they'd collide with a real app route or
// static asset path. Shared with CreateMemorial's slug field validation.
export const RESERVED_SLUGS = new Set([...APP_VIEWS, "home", "api", "assets"]);

export function parseLocation() {
  const params = new URLSearchParams(window.location.search);
  const memorialCode = params.get("memorial");
  if (memorialCode) return { page: "memorial", param: memorialCode };
  const view = params.get("view");
  if (APP_VIEWS.includes(view)) return { page: view, param: null };

  // Vanity URL: myandthen.com/<slug> — anything else path-based is treated
  // as a memorial lookup; Memorial.jsx matches it against slug OR invite_code.
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (slug && !RESERVED_SLUGS.has(slug)) return { page: "memorial", param: slug };

  return { page: "home", param: null };
}

export function routeToUrl(page, param) {
  // Always build from "/" rather than the current pathname — the current
  // page may be sitting on a vanity slug path (/debhausch) that shouldn't
  // leak into a URL for a different page.
  const url = new URL(window.location.origin + "/");
  if (page === "memorial" && param) url.searchParams.set("memorial", param);
  else if (page !== "home") url.searchParams.set("view", page);
  return url.toString();
}
