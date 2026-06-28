export const APP_VIEWS = ["login", "create", "dashboard", "edit"];

export function parseLocation() {
  const params = new URLSearchParams(window.location.search);
  const memorialCode = params.get("memorial");
  if (memorialCode) return { page: "memorial", param: memorialCode };
  const view = params.get("view");
  if (APP_VIEWS.includes(view)) return { page: view, param: null };
  return { page: "home", param: null };
}

export function routeToUrl(page, param) {
  const url = new URL(window.location.origin + window.location.pathname);
  if (page === "memorial" && param) url.searchParams.set("memorial", param);
  else if (page !== "home") url.searchParams.set("view", page);
  return url.toString();
}
