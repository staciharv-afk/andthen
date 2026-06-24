import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   SUPABASE CLIENT
   ───────────────────────────────────────────────────────────── */
// Config comes from environment (.env, gitignored) — never hard-code Supabase
// credentials in source again. See .env.example for the required variables.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function createClient(url, anonKey) {
  const headers = {
    apikey: anonKey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const authHeaders = (token) =>
    token
      ? { ...headers, Authorization: `Bearer ${token}` }
      : { ...headers, Authorization: `Bearer ${anonKey}` };

  return {
    url,
    anonKey,
    _accessToken: null,

    setAccessToken(token) {
      this._accessToken = token;
    },

    from(table) {
      const self = this;
      return {
        async select(columns = "*", opts = {}) {
          let queryStr = `select=${columns}`;
          if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => (queryStr += `&${k}=eq.${v}`));
          if (opts.order) queryStr += `&order=${opts.order.column}.${opts.order.ascending ? "asc" : "desc"}`;
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr}`, {
            headers: authHeaders(self._accessToken),
          });
          if (!res.ok) return { data: null, error: await res.json().catch(() => ({})) };
          return { data: await res.json(), error: null };
        },

        async insert(values) {
          const res = await fetch(`${url}/rest/v1/${table}`, {
            method: "POST",
            headers: authHeaders(self._accessToken),
            body: JSON.stringify(values),
          });
          if (!res.ok) return { data: null, error: await res.json().catch(() => ({})) };
          return { data: await res.json(), error: null };
        },

        async update(values, match) {
          let queryStr = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr}`, {
            method: "PATCH",
            headers: authHeaders(self._accessToken),
            body: JSON.stringify(values),
          });
          if (!res.ok) return { data: null, error: await res.json().catch(() => ({})) };
          return { data: await res.json(), error: null };
        },

        async delete(match) {
          let queryStr = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr}`, {
            method: "DELETE",
            headers: authHeaders(self._accessToken),
          });
          if (!res.ok) return { data: null, error: await res.json().catch(() => ({})) };
          return { data: await res.json(), error: null };
        },
      };
    },

    storage: {
      from(bucket) {
        const self2 = this;
        return {
          async upload(path, file, opts = {}) {
            const formData = new FormData();
            formData.append("", file);
            const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
              method: "POST",
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${self2._accessToken || anonKey}`,
                ...(opts.contentType ? { "Content-Type": opts.contentType } : {}),
              },
              body: file,
            });
            if (!res.ok) return { data: null, error: await res.json().catch(() => ({})) };
            return { data: await res.json(), error: null };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `${url}/storage/v1/object/public/${bucket}/${path}` } };
          },
        };
      },
      _accessToken: null,
    },

    auth: {
      _url: url,
      _anonKey: anonKey,

      // Magic-link sign-in: emails the user a link. On click, GoTrue
      // redirects back to `redirectTo` with the session tokens in the URL
      // hash fragment (handled on app load). No password is ever used.
      async signInWithOtp(email, redirectTo) {
        const qs = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
        const res = await fetch(`${url}/auth/v1/otp${qs}`, {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email, create_user: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: data };
        return { error: null };
      },

      async getUser(token) {
        const res = await fetch(`${url}/auth/v1/user`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { data: null, error: "Not authenticated" };
        const user = await res.json();
        return { data: { user }, error: null };
      },

      async signOut(token) {
        await fetch(`${url}/auth/v1/logout`, {
          method: "POST",
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        });
      },
    },
  };
}

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
client.storage._accessToken = null;

/* ─────────────────────────────────────────────────────────────
   UTILITIES
   ───────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const timeAgo = (d) => {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
};

const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });

/* ─────────────────────────────────────────────────────────────
   SESSION MANAGEMENT
   ───────────────────────────────────────────────────────────── */
const SESSION_KEY = "andthen_session";

function saveSession(token, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user, expires: Date.now() + 3600000 * 8 }));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.expires < Date.now()) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ─────────────────────────────────────────────────────────────
   ROUTING — URL <-> route, so the browser Back button works.
   Contributor deep-links use ?memorial=CODE (unchanged); app
   views use ?view=login|create|dashboard. Home is the bare path.
   ───────────────────────────────────────────────────────────── */
const APP_VIEWS = ["login", "create", "dashboard"];

function parseLocation() {
  const params = new URLSearchParams(window.location.search);
  const memorialCode = params.get("memorial");
  if (memorialCode) return { page: "memorial", param: memorialCode };
  const view = params.get("view");
  if (APP_VIEWS.includes(view)) return { page: view, param: null };
  return { page: "home", param: null };
}

function routeToUrl(page, param) {
  const url = new URL(window.location.origin + window.location.pathname);
  if (page === "memorial" && param) url.searchParams.set("memorial", param);
  else if (page !== "home") url.searchParams.set("view", page);
  return url.toString();
}

/* ─────────────────────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --cream: #FDFAF5;
  --cream-dark: #F5EDE0;
  --bark: #2D2118;
  --bark-light: #4A3728;
  --rust: #B85C2C;
  --rust-light: #C97040;
  --warm-mid: #7A5C42;
  --warm-light: #A08060;
  --warm-faint: #E8DFD0;
  --story-line: #F0E8DC;
  --white: #FFFFFF;
  --radius: 2px;
}

html { scroll-behavior: smooth; }
body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--bark); -webkit-font-smoothing: antialiased; }

/* ── ANIMATIONS ── */
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-up { animation: fadeUp 0.6s ease both; }
.fade-up-2 { animation: fadeUp 0.6s 0.1s ease both; }
.fade-up-3 { animation: fadeUp 0.6s 0.2s ease both; }
.fade-up-4 { animation: fadeUp 0.6s 0.3s ease both; }
.fade-in { animation: fadeIn 0.4s ease both; }

/* ── LAYOUT ── */
.page-wrap { max-width: 1280px; margin: 0 auto; padding: 0 56px; }
@media (max-width: 768px) { .page-wrap { padding: 0 24px; } }

/* ── NAV ── */
.nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 56px; height: 64px;
  background: rgba(253,250,245,0.93); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--warm-faint);
}
.nav-logo { font-family: 'Lora', serif; font-size: 20px; color: var(--bark); text-decoration: none; cursor: pointer; }
.nav-logo em { font-style: italic; color: var(--rust); }
.nav-right { display: flex; align-items: center; gap: 28px; }
.nav-link { font-size: 14px; color: var(--warm-mid); text-decoration: none; cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: inherit; }
.nav-link:hover { color: var(--bark); }
.btn { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 10px 24px; border-radius: var(--radius); border: none; cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em; display: inline-flex; align-items: center; gap: 8px; }
.btn-primary { background: var(--bark); color: var(--cream); }
.btn-primary:hover { background: var(--bark-light); transform: translateY(-1px); }
.btn-rust { background: var(--rust); color: #fff; }
.btn-rust:hover { background: var(--rust-light); transform: translateY(-1px); }
.btn-ghost { background: none; border: 1.5px solid var(--warm-faint); color: var(--warm-mid); }
.btn-ghost:hover { border-color: var(--bark); color: var(--bark); }
.btn-sm { padding: 7px 16px; font-size: 13px; }
.btn-lg { padding: 16px 40px; font-size: 15px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-dark { border-color: rgba(45,33,24,0.2); border-top-color: var(--bark); }

/* ── FORMS ── */
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--bark); letter-spacing: 0.02em; }
.form-input {
  font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--bark);
  background: var(--white); border: 1.5px solid var(--warm-faint);
  border-radius: var(--radius); padding: 12px 16px; outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: var(--rust); }
.form-input::placeholder { color: var(--warm-light); }
textarea.form-input { resize: vertical; min-height: 100px; line-height: 1.6; }
.form-error { font-size: 12px; color: #c0392b; }
.form-hint { font-size: 12px; color: var(--warm-light); }

/* ── AUTH PAGE ── */
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bark); padding: 40px 24px; }
.auth-card { background: var(--cream); border-radius: 4px; padding: 48px; width: 100%; max-width: 440px; }
.auth-logo { font-family: 'Lora', serif; font-size: 24px; color: var(--bark); text-align: center; margin-bottom: 8px; }
.auth-logo em { font-style: italic; color: var(--rust); }
.auth-tagline { font-size: 14px; color: var(--warm-light); text-align: center; margin-bottom: 36px; line-height: 1.6; }
.auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
.auth-divider-line { flex: 1; height: 1px; background: var(--warm-faint); }
.auth-divider-text { font-size: 12px; color: var(--warm-light); }
.auth-switch { text-align: center; font-size: 13px; color: var(--warm-light); margin-top: 20px; }
.auth-switch button { color: var(--rust); background: none; border: none; cursor: pointer; font-family: inherit; font-size: inherit; text-decoration: underline; }

/* ── HOMEPAGE ── */
.hero { display: grid; grid-template-columns: 1.15fr 1fr; gap: 72px; align-items: start; padding: 80px 0 72px; border-bottom: 1px solid var(--warm-faint); }
@media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 48px; } }
.hero-tag { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rust); margin-bottom: 28px; }
.hero-tag::before { content: ''; display: block; width: 28px; height: 1px; background: var(--rust); }
.hero-headline { font-family: 'Lora', serif; font-size: clamp(38px, 4.5vw, 64px); font-weight: 400; line-height: 1.1; color: var(--bark); margin-bottom: 28px; letter-spacing: -0.01em; }
.hero-headline em { font-style: italic; color: var(--rust); }
.hero-body { font-size: 17px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); max-width: 500px; margin-bottom: 44px; }
.hero-body strong { font-weight: 400; color: var(--bark-light); }
.hero-cta-group { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.hero-trust { margin-top: 28px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-light); }
.hero-trust-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--warm-faint); border: 1px solid var(--warm-light); }

/* Story card */
.story-card { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 32px rgba(45,33,24,0.06); }
.story-card-header { padding: 18px 24px; border-bottom: 1px solid var(--story-line); display: flex; align-items: center; justify-content: space-between; }
.story-card-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rust); font-weight: 500; }
.story-card-count { font-size: 12px; color: var(--warm-light); background: var(--cream-dark); padding: 3px 10px; border-radius: 100px; }
.story-item { padding: 18px 24px; border-bottom: 1px solid var(--story-line); display: flex; gap: 14px; align-items: flex-start; transition: background 0.15s; }
.story-item:last-child { border-bottom: none; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--warm-faint); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: var(--warm-mid); flex-shrink: 0; border: 1.5px solid var(--story-line); }
.story-text { font-family: 'Lora', serif; font-size: 14px; line-height: 1.65; color: var(--bark); margin-bottom: 5px; }
.story-starter { font-style: italic; color: var(--rust); font-weight: 500; }
.story-meta { font-size: 11px; color: var(--warm-light); }
.story-card-footer { padding: 14px 20px; background: var(--cream); border-top: 1px solid var(--story-line); display: flex; align-items: center; gap: 8px; }
.story-footer-input { flex: 1; font-family: 'Lora', serif; font-size: 13px; font-style: italic; color: var(--warm-light); background: none; border: none; outline: none; }

/* ── FEATURES ── */
.features { padding: 80px 0; display: grid; grid-template-columns: repeat(3,1fr); gap: 64px; border-bottom: 1px solid var(--warm-faint); }
@media (max-width: 768px) { .features { grid-template-columns: 1fr; gap: 40px; } }
.feature-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--cream-dark); border: 1px solid var(--warm-faint); border-radius: 4px; margin-bottom: 20px; }
.feature-title { font-family: 'Lora', serif; font-size: 19px; font-weight: 500; color: var(--bark); margin-bottom: 10px; }
.feature-body { font-size: 14px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); }

/* ── QUOTE STRIP ── */
.quote-strip { background: var(--bark); padding: 72px 0; display: grid; grid-template-columns: 1fr 2fr; gap: 80px; align-items: center; }
@media (max-width: 900px) { .quote-strip { grid-template-columns: 1fr; gap: 48px; } }
.quote-strip-headline { font-family: 'Lora', serif; font-size: 34px; font-weight: 400; font-style: italic; color: var(--cream); line-height: 1.25; margin-bottom: 16px; }
.quote-strip-sub { font-size: 14px; color: var(--warm-light); line-height: 1.7; font-weight: 300; }
.quote-card { padding: 24px 28px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 2px; margin-bottom: 16px; }
.quote-card:last-child { margin-bottom: 0; }
.quote-mark { font-family: 'Lora', serif; font-size: 36px; color: var(--rust); line-height: 0.5; margin-bottom: 12px; display: block; opacity: 0.5; }
.quote-text { font-family: 'Lora', serif; font-size: 15px; font-style: italic; color: rgba(253,250,245,0.85); line-height: 1.65; margin-bottom: 10px; }
.quote-attr { font-size: 12px; color: var(--rust); letter-spacing: 0.1em; text-transform: uppercase; }

/* ── HOW IT WORKS ── */
.how { padding: 88px 0; }
.section-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rust); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-label::after { content: ''; flex: 1; height: 1px; background: var(--warm-faint); max-width: 40px; }
.how-headline { font-family: 'Lora', serif; font-size: 34px; font-weight: 400; color: var(--bark); margin-bottom: 48px; max-width: 440px; line-height: 1.25; }
.how-headline em { font-style: italic; color: var(--rust); }
.how-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 2px; background: var(--warm-faint); border: 1px solid var(--warm-faint); border-radius: 4px; overflow: hidden; }
@media (max-width: 768px) { .how-steps { grid-template-columns: 1fr; } }
.how-step { background: var(--white); padding: 40px 32px; transition: background 0.2s; }
.how-step:hover { background: var(--cream); }
.how-step-num { font-family: 'Lora', serif; font-size: 40px; font-weight: 400; color: var(--warm-faint); line-height: 1; margin-bottom: 20px; user-select: none; }
.how-step-title { font-family: 'Lora', serif; font-size: 18px; font-weight: 500; color: var(--bark); margin-bottom: 10px; }
.how-step-body { font-size: 14px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); }

/* ── FINAL CTA ── */
.final-cta { background: var(--bark); padding: 96px 0; text-align: center; }
.final-cta-eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rust); margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 12px; }
.final-cta-eyebrow::before, .final-cta-eyebrow::after { content: ''; display: block; width: 28px; height: 1px; background: var(--rust); opacity: 0.5; }
.final-cta h2 { font-family: 'Lora', serif; font-size: clamp(30px, 4vw, 50px); font-weight: 400; font-style: italic; color: var(--cream); margin-bottom: 16px; line-height: 1.2; }
.final-cta p { font-size: 16px; font-weight: 300; color: var(--warm-light); margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.7; }
.final-cta-sub { margin-top: 16px; font-size: 12px; color: rgba(160,128,96,0.5); }

/* ── FOOTER ── */
.footer { background: #1A0E08; padding: 36px 56px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; gap: 16px; }
.footer-logo { font-family: 'Lora', serif; font-size: 18px; color: rgba(253,250,245,0.4); }
.footer-logo em { font-style: italic; color: rgba(184,92,44,0.5); }
.footer-links { display: flex; gap: 24px; }
.footer-link { font-size: 13px; color: rgba(160,128,96,0.45); text-decoration: none; cursor: pointer; background: none; border: none; font-family: inherit; transition: color 0.2s; }
.footer-link:hover { color: rgba(160,128,96,0.8); }
.footer-copy { font-size: 12px; color: rgba(160,128,96,0.3); }

/* ── CREATE MEMORIAL ── */
.create-page { min-height: 100vh; background: var(--cream); }
.create-inner { max-width: 680px; margin: 0 auto; padding: 64px 24px; }
.create-header { margin-bottom: 48px; }
.create-title { font-family: 'Lora', serif; font-size: 36px; font-weight: 400; color: var(--bark); margin-bottom: 12px; }
.create-sub { font-size: 15px; font-weight: 300; color: var(--warm-mid); line-height: 1.7; }
.create-form { display: flex; flex-direction: column; gap: 28px; }
.photo-upload { width: 100%; aspect-ratio: 16/7; border: 2px dashed var(--warm-faint); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; background: var(--white); overflow: hidden; position: relative; }
.photo-upload:hover { border-color: var(--rust); background: rgba(184,92,44,0.02); }
.photo-upload-text { font-size: 14px; color: var(--warm-light); }
.photo-upload img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
.moderation-toggle { background: var(--cream-dark); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.toggle-label { font-size: 14px; font-weight: 500; color: var(--bark); }
.toggle-sub { font-size: 12px; color: var(--warm-light); margin-top: 2px; }
.toggle-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-slider { position: absolute; inset: 0; background: var(--warm-faint); border-radius: 100px; cursor: pointer; transition: background 0.2s; }
.toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.toggle-switch input:checked + .toggle-slider { background: var(--rust); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

/* ── DASHBOARD ── */
.dashboard-page { min-height: 100vh; background: var(--cream); }
.dashboard-inner { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
.dashboard-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
.dashboard-title { font-family: 'Lora', serif; font-size: 30px; font-weight: 400; color: var(--bark); }
.dashboard-sub { font-size: 14px; color: var(--warm-light); margin-top: 4px; }
.memorial-banner { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 4px; overflow: hidden; margin-bottom: 32px; }
.memorial-banner-img { width: 100%; height: 200px; object-fit: cover; background: var(--cream-dark); }
.memorial-banner-body { padding: 24px; }
.memorial-name { font-family: 'Lora', serif; font-size: 28px; font-weight: 400; color: var(--bark); margin-bottom: 4px; }
.memorial-dates { font-size: 13px; color: var(--warm-light); margin-bottom: 12px; }
.memorial-desc { font-size: 14px; color: var(--warm-mid); line-height: 1.7; }
.invite-box { background: var(--cream-dark); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; margin-top: 16px; gap: 12px; }
.invite-url { font-size: 13px; color: var(--warm-mid); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.tab-bar { display: flex; border-bottom: 1px solid var(--warm-faint); margin-bottom: 24px; }
.tab { font-size: 14px; color: var(--warm-light); padding: 12px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border-left: none; border-right: none; border-top: none; font-family: inherit; }
.tab.active { color: var(--bark); border-bottom-color: var(--rust); }
.tab:hover:not(.active) { color: var(--bark); }
.submission-card { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 20px; margin-bottom: 12px; }
.submission-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.submission-type-badge { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border-radius: 100px; font-weight: 500; }
.badge-story { background: rgba(184,92,44,0.1); color: var(--rust); }
.badge-photo { background: rgba(45,33,24,0.08); color: var(--bark); }
.badge-video { background: rgba(122,92,66,0.1); color: var(--warm-mid); }
.badge-voice { background: rgba(184,92,44,0.08); color: var(--rust-light); }
.badge-approved { background: rgba(39,174,96,0.1); color: #27ae60; }
.badge-pending { background: rgba(243,156,18,0.1); color: #e67e22; }
.submission-name { font-size: 13px; font-weight: 500; color: var(--bark); }
.submission-time { font-size: 11px; color: var(--warm-light); margin-left: auto; }
.submission-text { font-family: 'Lora', serif; font-size: 14px; line-height: 1.65; color: var(--bark); margin-bottom: 12px; }
.submission-media { width: 100%; max-height: 240px; object-fit: cover; border-radius: 3px; margin-bottom: 12px; }
.submission-actions { display: flex; gap: 8px; }
.empty-state { text-align: center; padding: 60px 24px; }
.empty-state-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.3; }
.empty-state-title { font-family: 'Lora', serif; font-size: 20px; color: var(--bark); margin-bottom: 8px; }
.empty-state-sub { font-size: 14px; color: var(--warm-light); }

/* ── PUBLIC MEMORIAL PAGE ── */
.memorial-page { min-height: 100vh; background: var(--cream); }
.memorial-hero { background: var(--bark); padding: 64px 0 48px; text-align: center; position: relative; }
.memorial-hero-photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.15); margin: 0 auto 20px; display: block; background: var(--bark-light); }
.memorial-hero-name { font-family: 'Lora', serif; font-size: clamp(28px, 4vw, 48px); font-weight: 400; color: var(--cream); margin-bottom: 8px; }
.memorial-hero-dates { font-size: 14px; color: rgba(160,128,96,0.7); margin-bottom: 16px; }
.memorial-hero-desc { font-size: 15px; color: rgba(253,250,245,0.65); max-width: 560px; margin: 0 auto; line-height: 1.75; font-weight: 300; }
.memorial-content { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
.contribute-card { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 32px; margin-bottom: 48px; }
.contribute-title { font-family: 'Lora', serif; font-size: 22px; font-weight: 400; color: var(--bark); margin-bottom: 6px; }
.contribute-sub { font-size: 14px; color: var(--warm-light); margin-bottom: 24px; line-height: 1.6; }
.contribute-type-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.type-btn { font-size: 13px; padding: 8px 16px; border-radius: 100px; border: 1.5px solid var(--warm-faint); background: none; cursor: pointer; color: var(--warm-mid); font-family: inherit; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.type-btn.active { border-color: var(--rust); color: var(--rust); background: rgba(184,92,44,0.05); }
.media-drop { width: 100%; border: 2px dashed var(--warm-faint); border-radius: 4px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; }
.media-drop:hover { border-color: var(--rust); background: rgba(184,92,44,0.02); }
.media-drop-text { font-size: 14px; color: var(--warm-light); }
.voice-recorder { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
.record-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 24px; }
.record-btn-idle { background: var(--rust); }
.record-btn-idle:hover { background: var(--rust-light); transform: scale(1.05); }
.record-btn-recording { background: #e74c3c; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.4); } 50% { box-shadow: 0 0 0 12px rgba(231,76,60,0); } }
.record-time { font-size: 24px; font-family: monospace; color: var(--bark); }
.record-sub { font-size: 13px; color: var(--warm-light); }
.stories-section-title { font-family: 'Lora', serif; font-size: 22px; font-weight: 400; color: var(--bark); margin-bottom: 24px; }
.public-story-card { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 24px; margin-bottom: 16px; }
.public-story-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.public-story-text { font-family: 'Lora', serif; font-size: 15px; line-height: 1.7; color: var(--bark); }

/* ── TOAST ── */
.toast-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 14px 20px; border-radius: 4px; font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: fadeUp 0.3s ease; max-width: 320px; }
.toast-success { background: var(--bark); color: var(--cream); }
.toast-error { background: #c0392b; color: white; }
`;

/* ─────────────────────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NAV
   ───────────────────────────────────────────────────────────── */
function Nav({ currentUser, onSignOut, onNavigate }) {
  return (
    <nav className="nav">
      <span className="nav-logo" onClick={() => onNavigate("home")}>
        And Then<em>...</em>
      </span>
      <div className="nav-right">
        {currentUser ? (
          <>
            <button className="nav-link" onClick={() => onNavigate("dashboard")}>Dashboard</button>
            <button className="nav-link" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="nav-link" onClick={() => onNavigate("login")}>Sign in</button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate("login")}>Start gathering their stories</button>
          </>
        )}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH PAGE
   ───────────────────────────────────────────────────────────── */
function AuthPage({ showToast }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) { setError("Please enter a valid email address."); return; }
    if (!CONFIG_OK) { setError("Sign-in is unavailable until the backend is configured."); return; }
    setLoading(true);
    try {
      const { error: err } = await client.auth.signInWithOtp(trimmed, window.location.origin);
      if (err) { setError(err.msg || err.message || err.error_description || "Couldn't send the link. Please try again."); return; }
      setSent(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <style>{STYLES}</style>
      <div className="auth-card fade-up">
        <div className="auth-logo">And Then<em>...</em></div>

        {sent ? (
          <>
            <p className="auth-tagline">
              Check your email — we sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device and you'll be signed in.
            </p>
            <button className="btn btn-ghost btn-lg" style={{ justifyContent: "center", width: "100%" }} onClick={() => { setSent(false); setEmail(""); }}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <p className="auth-tagline">Enter your email and we'll send you a link to sign in. No password to remember.</p>
            <div className="create-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} autoFocus />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="btn btn-rust btn-lg" onClick={handleSend} disabled={loading} style={{ justifyContent: "center" }}>
                {loading ? <span className="spinner" /> : "Email me a sign-in link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CREATE MEMORIAL PAGE
   ───────────────────────────────────────────────────────────── */
function CreateMemorialPage({ currentUser, onCreated, showToast }) {
  const [name, setName] = useState("");
  const [born, setBorn] = useState("");
  const [passed, setPassed] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [requireApproval, setRequireApproval] = useState(true);
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
    setLoading(true);
    try {
      const inviteCode = uid();
      let photoUrl = null;

      if (photoFile) {
        const path = `memorials/${inviteCode}/cover.${photoFile.name.split(".").pop()}`;
        const { data: uploadData, error: uploadErr } = await client.storage.from("memorial-media").upload(path, photoFile);
        if (!uploadErr && uploadData) {
          const { data: urlData } = client.storage.from("memorial-media").getPublicUrl(path);
          photoUrl = urlData?.publicUrl;
        }
      }

      const { data, error: err } = await client.from("memorials").insert({
        name: name.trim(),
        born: born || null,
        passed: passed || null,
        description: description.trim() || null,
        photo_url: photoUrl,
        steward_id: currentUser.id,
        invite_code: inviteCode,
        require_approval: requireApproval,
      });

      if (err) { setError(err.message || "Failed to create memorial. Please try again."); return; }

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
          <h1 className="create-title">Create a memorial</h1>
          <p className="create-sub">A place to gather the stories only the people who loved them know. Takes about two minutes to set up.</p>
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

          <button className="btn btn-rust btn-lg" onClick={handleSubmit} disabled={loading} style={{ justifyContent: "center" }}>
            {loading ? <><span className="spinner" /> Creating...</> : "✦ Create memorial"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD PAGE
   ───────────────────────────────────────────────────────────── */
function DashboardPage({ currentUser, onNavigate, showToast }) {
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMemorial, setActiveMemorial] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    loadMemorials();
  }, []);

  const loadMemorials = async () => {
    setLoading(true);
    const { data } = await client.from("memorials").select("*", { eq: { steward_id: currentUser.id }, order: { column: "created_at", ascending: false } });
    setLoading(false);
    if (data?.length) {
      setMemorials(data);
      setActiveMemorial(data[0]);
      loadSubmissions(data[0].id);
    }
  };

  const loadSubmissions = async (memorialId) => {
    setSubmissionsLoading(true);
    const { data } = await client.from("contributions").select("*", { eq: { memorial_id: memorialId }, order: { column: "created_at", ascending: false } });
    setSubmissionsLoading(false);
    setSubmissions(data || []);
  };

  const handleApprove = async (submissionId) => {
    await client.from("contributions").update({ status: "approved" }, { id: submissionId });
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "approved" } : x));
    showToast("Story approved and now visible on the memorial.");
  };

  const handleReject = async (submissionId) => {
    await client.from("contributions").update({ status: "rejected" }, { id: submissionId });
    setSubmissions((s) => s.map((x) => x.id === submissionId ? { ...x, status: "rejected" } : x));
    showToast("Submission removed.");
  };

  const copyInviteLink = (code) => {
    const link = `${window.location.origin}?memorial=${code}`;
    navigator.clipboard.writeText(link).then(() => showToast("Link copied! Share it with family and friends."));
  };

  const filtered = submissions.filter((s) => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "approved") return s.status === "approved";
    return true;
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorials.length) return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="empty-state fade-up">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">No memorials yet</div>
          <p className="empty-state-sub" style={{ marginBottom: 24 }}>Create your first memorial and start gathering stories.</p>
          <button className="btn btn-rust" onClick={() => onNavigate("create")}>Start gathering their stories</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header fade-up">
          <div>
            <div className="dashboard-title">Your memorials</div>
            <div className="dashboard-sub">Manage stories and submissions</div>
          </div>
          <button className="btn btn-rust btn-sm" onClick={() => onNavigate("create")}>+ New memorial</button>
        </div>

        {memorials.length > 1 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {memorials.map((m) => (
              <button
                key={m.id}
                className={`btn btn-sm ${activeMemorial?.id === m.id ? "btn-rust" : "btn-ghost"}`}
                onClick={() => { setActiveMemorial(m); loadSubmissions(m.id); }}
              >{m.name}</button>
            ))}
          </div>
        )}

        {activeMemorial && (
          <>
            <div className="memorial-banner fade-up-2">
              {activeMemorial.photo_url && (
                <img className="memorial-banner-img" src={activeMemorial.photo_url} alt={activeMemorial.name} />
              )}
              <div className="memorial-banner-body">
                <div className="memorial-name">{activeMemorial.name}</div>
                {(activeMemorial.born || activeMemorial.passed) && (
                  <div className="memorial-dates">
                    {fmtDate(activeMemorial.born)}{activeMemorial.born && activeMemorial.passed && " — "}{fmtDate(activeMemorial.passed)}
                  </div>
                )}
                {activeMemorial.description && <div className="memorial-desc">{activeMemorial.description}</div>}

                <div className="invite-box">
                  <span className="invite-url">{window.location.origin}?memorial={activeMemorial.invite_code}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => copyInviteLink(activeMemorial.invite_code)}>Copy link</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("memorial", activeMemorial.invite_code)}>Preview</button>
                </div>
              </div>
            </div>

            <div className="fade-up-3">
              <div className="tab-bar">
                {[
                  { key: "pending", label: `Pending (${submissions.filter(s => s.status === "pending").length})` },
                  { key: "approved", label: `Approved (${submissions.filter(s => s.status === "approved").length})` },
                  { key: "all", label: "All" },
                ].map((t) => (
                  <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
                ))}
              </div>

              {submissionsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <span className="spinner spinner-dark" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✉️</div>
                  <div className="empty-state-title">{activeTab === "pending" ? "No pending submissions" : "No stories yet"}</div>
                  <p className="empty-state-sub">
                    {activeTab === "pending"
                      ? "You're all caught up. Share the invite link to get more stories coming in."
                      : "Share the link below to invite friends and family to contribute."}
                  </p>
                </div>
              ) : (
                filtered.map((s) => <SubmissionCard key={s.id} submission={s} requireApproval={activeMemorial.require_approval} onApprove={handleApprove} onReject={handleReject} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ submission: s, requireApproval, onApprove, onReject }) {
  const typeLabel = { story: "Story", photo: "Photo", video: "Video", voice: "Voice memo" }[s.type] || "Story";
  const typeBadge = { story: "badge-story", photo: "badge-photo", video: "badge-video", voice: "badge-voice" }[s.type] || "badge-story";

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div className="avatar">{(s.contributor_name || "?")[0].toUpperCase()}</div>
        <div className="submission-name">{s.contributor_name || "Anonymous"}</div>
        <span className={`submission-type-badge ${typeBadge}`}>{typeLabel}</span>
        {requireApproval && (
          <span className={`submission-type-badge ${s.status === "approved" ? "badge-approved" : s.status === "rejected" ? "" : "badge-pending"}`}>
            {s.status === "approved" ? "Approved" : s.status === "rejected" ? "Removed" : "Pending"}
          </span>
        )}
        <span className="submission-time">{timeAgo(s.created_at)}</span>
      </div>

      {s.text && <p className="submission-text">"{s.text}"</p>}
      {s.media_url && s.type === "photo" && <img className="submission-media" src={s.media_url} alt="" />}
      {s.media_url && s.type === "video" && (
        <video className="submission-media" controls src={s.media_url} style={{ maxHeight: 240 }} />
      )}
      {s.media_url && s.type === "voice" && <audio controls src={s.media_url} style={{ width: "100%", marginBottom: 12 }} />}

      {requireApproval && s.status === "pending" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-rust" onClick={() => onApprove(s.id)}>Approve</button>
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
        </div>
      )}
      {(!requireApproval || s.status === "approved") && s.status !== "rejected" && (
        <div className="submission-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => onReject(s.id)}>Remove</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC MEMORIAL PAGE
   ───────────────────────────────────────────────────────────── */
function MemorialPage({ inviteCode, showToast }) {
  const [memorial, setMemorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [contributeType, setContributeType] = useState("story");
  const [contributorName, setContributorName] = useState("");
  const [contributorRelation, setContributorRelation] = useState("");
  const [storyText, setStoryText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef();

  useEffect(() => {
    loadMemorial();
  }, [inviteCode]);

  const loadMemorial = async () => {
    setLoading(true);
    const { data } = await client.from("memorials").select("*", { eq: { invite_code: inviteCode } });
    if (data?.length) {
      setMemorial(data[0]);
      loadStories(data[0].id, data[0].require_approval);
    }
    setLoading(false);
  };

  const loadStories = async (memorialId, requireApproval) => {
    const opts = { eq: { memorial_id: memorialId }, order: { column: "created_at", ascending: false } };
    if (requireApproval) opts.eq.status = "approved";
    const { data } = await client.from("contributions").select("*", opts);
    setStories(data || []);
  };

  const handleMediaSelect = async (file) => {
    if (!file) return;
    setMediaFile(file);
    const preview = await fileToDataURL(file);
    setMediaPreview(preview);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => setRecordDuration((d) => d + 1), 1000);
    } catch { showToast("Please allow microphone access to record.", "error"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const fmtDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleSubmit = async () => {
    if (!contributorName.trim()) { showToast("Please enter your name.", "error"); return; }
    if (contributeType === "story" && !storyText.trim()) { showToast("Please write a story.", "error"); return; }
    if ((contributeType === "photo" || contributeType === "video") && !mediaFile) { showToast("Please select a file.", "error"); return; }
    if (contributeType === "voice" && !audioURL) { showToast("Please record a voice memo.", "error"); return; }

    setSubmitting(true);
    try {
      let mediaUrl = null;

      if (mediaFile) {
        const path = `contributions/${memorial.invite_code}/${uid()}.${mediaFile.name.split(".").pop()}`;
        const { data: uploadData } = await client.storage.from("memorial-media").upload(path, mediaFile);
        if (uploadData) {
          const { data: urlData } = client.storage.from("memorial-media").getPublicUrl(path);
          mediaUrl = urlData?.publicUrl;
        }
      }

      if (contributeType === "voice" && audioURL) {
        const resp = await fetch(audioURL);
        const blob = await resp.blob();
        const path = `contributions/${memorial.invite_code}/${uid()}.webm`;
        const { data: uploadData } = await client.storage.from("memorial-media").upload(path, blob, { contentType: "audio/webm" });
        if (uploadData) {
          const { data: urlData } = client.storage.from("memorial-media").getPublicUrl(path);
          mediaUrl = urlData?.publicUrl;
        }
      }

      await client.from("contributions").insert({
        memorial_id: memorial.id,
        contributor_name: contributorName.trim(),
        contributor_relation: contributorRelation.trim() || null,
        type: contributeType,
        text: storyText.trim() || null,
        media_url: mediaUrl,
        status: memorial.require_approval ? "pending" : "approved",
      });

      setSubmitted(true);
      showToast(memorial.require_approval ? "Your memory was submitted! The family will review it soon." : "Your memory was added. Thank you for sharing.");
    } catch { showToast("Something went wrong. Please try again.", "error"); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <span className="spinner spinner-dark" />
    </div>
  );

  if (!memorial) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <h2 style={{ fontFamily: "Lora, serif", marginBottom: 12 }}>Memorial not found</h2>
      <p style={{ color: "var(--warm-light)" }}>This link may be invalid or the memorial may have been removed.</p>
    </div>
  );

  return (
    <div className="memorial-page">
      <div className="memorial-hero">
        <div className="page-wrap">
          {memorial.photo_url && <img className="memorial-hero-photo" src={memorial.photo_url} alt={memorial.name} />}
          <h1 className="memorial-hero-name">{memorial.name}</h1>
          {(memorial.born || memorial.passed) && (
            <div className="memorial-hero-dates">
              {fmtDate(memorial.born)}{memorial.born && memorial.passed && " — "}{fmtDate(memorial.passed)}
            </div>
          )}
          {memorial.description && <p className="memorial-hero-desc">{memorial.description}</p>}
        </div>
      </div>

      <div className="memorial-content">
        {!submitted ? (
          <div className="contribute-card fade-up">
            <h2 className="contribute-title">Share a memory</h2>
            <p className="contribute-sub">What's your story? A moment, a habit, something they said — anything that captures who they really were.</p>

            <div className="contribute-type-row">
              {[
                { key: "story", icon: "✍️", label: "Story" },
                { key: "photo", icon: "📷", label: "Photo" },
                { key: "video", icon: "🎬", label: "Video" },
                { key: "voice", icon: "🎙️", label: "Voice memo" },
              ].map((t) => (
                <button key={t.key} className={`type-btn ${contributeType === t.key ? "active" : ""}`} onClick={() => { setContributeType(t.key); setMediaFile(null); setMediaPreview(null); setAudioURL(null); }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your name *</label>
                  <input className="form-input" placeholder="How you were known to them" value={contributorName} onChange={(e) => setContributorName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your relation</label>
                  <input className="form-input" placeholder="e.g. daughter, neighbor, colleague" value={contributorRelation} onChange={(e) => setContributorRelation(e.target.value)} />
                </div>
              </div>

              {contributeType === "story" && (
                <div className="form-group">
                  <label className="form-label">Your story</label>
                  <textarea className="form-input" placeholder={`And then ${memorial.name.split(" ")[0]}...`} value={storyText} onChange={(e) => setStoryText(e.target.value)} rows={5} />
                </div>
              )}

              {(contributeType === "photo" || contributeType === "video") && (
                <div>
                  {!mediaPreview ? (
                    <div className="media-drop" onClick={() => fileInputRef.current?.click()}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{contributeType === "photo" ? "📷" : "🎬"}</div>
                      <div className="media-drop-text">Click to select a {contributeType === "photo" ? "photo" : "video"}</div>
                      <input ref={fileInputRef} type="file" accept={contributeType === "photo" ? "image/*" : "video/*"} style={{ display: "none" }} onChange={(e) => handleMediaSelect(e.target.files[0])} />
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      {contributeType === "photo" ? (
                        <img src={mediaPreview} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 4 }} />
                      ) : (
                        <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 300, borderRadius: 4 }} />
                      )}
                      <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => { setMediaFile(null); setMediaPreview(null); }}>Remove</button>
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Caption (optional)</label>
                    <input className="form-input" placeholder="Add context or a caption..." value={storyText} onChange={(e) => setStoryText(e.target.value)} />
                  </div>
                </div>
              )}

              {contributeType === "voice" && (
                <div className="voice-recorder">
                  {!audioURL ? (
                    <>
                      <button
                        className={`record-btn ${recording ? "record-btn-recording" : "record-btn-idle"}`}
                        onClick={recording ? stopRecording : startRecording}
                      >
                        {recording ? "⏹" : "🎙️"}
                      </button>
                      {recording && <div className="record-time">{fmtDuration(recordDuration)}</div>}
                      <div className="record-sub">{recording ? "Recording... tap to stop" : "Tap to start recording"}</div>
                    </>
                  ) : (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                      <audio controls src={audioURL} style={{ width: "100%" }} />
                      <button className="btn btn-sm btn-ghost" onClick={() => setAudioURL(null)}>Re-record</button>
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-rust btn-lg" onClick={handleSubmit} disabled={submitting} style={{ justifyContent: "center" }}>
                {submitting ? <><span className="spinner" /> Sharing...</> : "Share this memory"}
              </button>
            </div>
          </div>
        ) : (
          <div className="contribute-card fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🫶</div>
            <h2 className="contribute-title">Thank you for sharing</h2>
            <p style={{ color: "var(--warm-light)", lineHeight: 1.7, fontSize: 15 }}>
              {memorial.require_approval
                ? "Your memory has been submitted and will appear once the family reviews it."
                : `Your memory has been added to ${memorial.name}'s story.`}
            </p>
            <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => setSubmitted(false)}>Share another memory</button>
          </div>
        )}

        {stories.length > 0 && (
          <div className="fade-up-2">
            <h2 className="stories-section-title">Stories & memories</h2>
            {stories.map((s) => <PublicStoryCard key={s.id} story={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PublicStoryCard({ story: s }) {
  const initials = (s.contributor_name || "?")[0].toUpperCase();
  return (
    <div className="public-story-card">
      <div className="public-story-header">
        <div className="avatar">{initials}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--bark)" }}>{s.contributor_name}</div>
          {s.contributor_relation && <div style={{ fontSize: 11, color: "var(--warm-light)" }}>{s.contributor_relation}</div>}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--warm-light)" }}>{timeAgo(s.created_at)}</div>
      </div>
      {s.text && <p className="public-story-text">"{s.text}"</p>}
      {s.media_url && s.type === "photo" && <img src={s.media_url} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 3, marginTop: 12 }} />}
      {s.media_url && s.type === "video" && <video controls src={s.media_url} style={{ width: "100%", marginTop: 12, borderRadius: 3 }} />}
      {s.media_url && s.type === "voice" && <audio controls src={s.media_url} style={{ width: "100%", marginTop: 12 }} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOMEPAGE
   ───────────────────────────────────────────────────────────── */
function HomePage({ onNavigate }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="hero">
            <div>
              <div className="hero-tag fade-up">A living story for someone you loved</div>
              <h1 className="hero-headline fade-up-2">
                Every great story<br />starts with <em>"And<br />then they..."</em>
              </h1>
              <p className="hero-body fade-up-3">
                The best stories about someone never get written down — they live in the people who loved them. Send a link, and let those people share. <strong>You decide what stays.</strong> Over time, it becomes something that actually sounds like them.
              </p>
              <div className="hero-cta-group fade-up-4">
                <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start gathering their stories</button>
                <button className="btn btn-ghost" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See how it works</button>
              </div>
              <div className="hero-trust fade-up-4">
                <span className="hero-trust-dot" />
                No account needed for contributors &nbsp;·&nbsp; Free to start
              </div>
            </div>

            <div className="fade-up-3">
              <div className="story-card">
                <div className="story-card-header">
                  <span className="story-card-label">Stories for Deb Hausch</span>
                  <span className="story-card-count">12 memories</span>
                </div>
                {[
                  { init: "S", text: ["And then she", " showed up at the door with her famous blueberry cake — even when we told her not to bring a thing. She always brought a thing."], meta: "Sandra · Deb's neighbor of 30 years" },
                  { init: "M", text: ["Found this", " from Christmas of 2004. Deb's famous cinnamon rolls with cherries on top, just like our grandmother did."], meta: "Mike · Deb's brother" },
                  { init: "M", text: ["And then she'd", " laugh, even when she didn't get the joke. She never understood sarcasm!"], meta: "Meredith · Deb's daughter" },
                ].map((s, i) => (
                  <div key={i} className="story-item">
                    <div className="avatar">{s.init}</div>
                    <div>
                      <div className="story-text"><span className="story-starter">{s.text[0]}</span>{s.text[1]}</div>
                      <div className="story-meta">{s.meta}</div>
                    </div>
                  </div>
                ))}
                <div className="story-card-footer">
                  <input className="story-footer-input" placeholder="And then she..." readOnly />
                  <button className="btn btn-sm btn-ghost" onClick={() => onNavigate("login")}>Share a memory</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ borderTop: "1px solid var(--warm-faint)", background: "var(--cream)" }}>
        <div className="page-wrap">
          <div className="features">
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: "Pull up a chair",
                body: "Send a link — anyone can share a story, a photo, or a video. No account needed. Just the people who loved them most, all in one place.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: "You're the keeper",
                body: "Every story comes to you first. A gentle moderation queue puts you in charge of what goes in the archive — nothing stays without your say.",
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B85C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                title: "A portrait, not an obituary",
                body: "Stories weave together into a warm, living record of who they really were — one that grows richer every time someone new shares a memory.",
              },
            ].map((f, i) => (
              <div key={i}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quote strip */}
      <div style={{ background: "var(--bark)" }}>
        <div className="page-wrap">
          <div className="quote-strip">
            <div>
              <div className="quote-strip-headline">"And then they..."</div>
              <p className="quote-strip-sub">That's how every great story starts. Someone leans in, and you remember. This is the place to gather all of them.</p>
            </div>
            <div>
              {[
                { text: "And then he'd whistle that same song every single morning. Always off-key, always happy. I still catch myself listening for it.", attr: "— Frank's youngest daughter" },
                { text: "And then she said \"let's just go\" — and we drove all night to see the sunrise from that bridge. We never talked about it again. We never had to.", attr: "— Rose's college roommate" },
              ].map((q, i) => (
                <div key={i} className="quote-card">
                  <span className="quote-mark">"</span>
                  <p className="quote-text">{q.text}</p>
                  <div className="quote-attr">{q.attr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: "var(--cream)" }} id="how">
        <div className="page-wrap">
          <div className="how">
            <div className="section-label">How it works</div>
            <h2 className="how-headline">Three steps to something that <em>lasts</em></h2>
            <div className="how-steps">
              {[
                { n: "01", title: "Create their story", body: "Add their name, a photo, and a few words about who they were. Takes about two minutes." },
                { n: "02", title: "Invite everyone", body: "Share a link with family and friends. Anyone can contribute a story, photo, or video — no account needed." },
                { n: "03", title: "Watch it come alive", body: "Stories gather into a living portrait. You approve what goes in. It stays there — growing richer — for as long as you need it." },
              ].map((s) => (
                <div key={s.n} className="how-step">
                  <div className="how-step-num">{s.n}</div>
                  <div className="how-step-title">{s.title}</div>
                  <p className="how-step-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: "var(--bark)" }}>
        <div className="page-wrap">
          <div className="final-cta">
            <div className="final-cta-eyebrow">A living story for someone you loved</div>
            <h2>"And then they..."</h2>
            <p>That's how every great story starts. Someone leans in, and you remember. Let's gather them all.</p>
            <button className="btn btn-rust btn-lg" onClick={() => onNavigate("login")}>Start gathering their stories</button>
            <div className="final-cta-sub">Free to start &nbsp;·&nbsp; No account needed for contributors</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo">And Then<em>...</em></div>
        <div className="footer-links">
          <button className="footer-link" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>How it works</button>
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Contact</button>
        </div>
        <div className="footer-copy">© 2026 And Then</div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT APP
   ───────────────────────────────────────────────────────────── */
export default function App() {
  const [route, setRoute] = useState(() => parseLocation().page);
  const [routeParam, setRouteParam] = useState(() => parseLocation().param);
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const { toasts, show: showToast } = useToast();

  // On load: handle a magic-link return, restore any saved session, seed
  // history state for the initial entry, and listen for Back/Forward.
  useEffect(() => {
    // Magic-link return: GoTrue sends the session back in the URL hash.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");

    if (accessToken) {
      client.setAccessToken(accessToken);
      client.storage._accessToken = accessToken;
      client.auth.getUser(accessToken).then(({ data }) => {
        const u = data?.user;
        const user = { id: u?.id, email: u?.email, name: u?.user_metadata?.name || (u?.email ? u.email.split("@")[0] : "") };
        saveSession(accessToken, user);
        setCurrentUser(user);
        setSessionToken(accessToken);
        showToast("You're signed in.");
      });
      // Land on the dashboard and strip the token hash from the URL.
      window.history.replaceState({ page: "dashboard", param: null }, "", routeToUrl("dashboard", null));
      setRoute("dashboard");
      setRouteParam(null);
    } else {
      const { page, param } = parseLocation();
      window.history.replaceState({ page, param }, "");
      const session = loadSession();
      if (session) {
        setCurrentUser(session.user);
        setSessionToken(session.token);
        client.setAccessToken(session.token);
        client.storage._accessToken = session.token;
      }
    }

    const onPopState = (e) => {
      const loc = e.state && e.state.page ? e.state : parseLocation();
      setRoute(loc.page);
      setRouteParam(loc.param ?? null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (page, param = null) => {
    setRoute(page);
    setRouteParam(param);
    window.history.pushState({ page, param }, "", routeToUrl(page, param));
    window.scrollTo(0, 0);
  };

  const handleSignOut = async () => {
    if (sessionToken) await client.auth.signOut(sessionToken);
    clearSession();
    client.setAccessToken(null);
    setCurrentUser(null);
    setSessionToken(null);
    navigate("home");
    showToast("Signed out.");
  };

  const handleMemorialCreated = (memorial) => {
    navigate("dashboard");
  };

  return (
    <>
      <style>{STYLES}</style>

      {!CONFIG_OK && (
        <div style={{ background: "#6B1F2E", color: "#F4ECD8", padding: "10px 24px", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
          Backend not configured — sign-in and saving are unavailable. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>.
        </div>
      )}

      {route !== "login" && route !== "memorial" && (
        <Nav currentUser={currentUser} onSignOut={handleSignOut} onNavigate={navigate} />
      )}

      {route === "home" && <HomePage onNavigate={navigate} />}

      {route === "login" && (
        <AuthPage showToast={showToast} />
      )}

      {route === "create" && currentUser && (
        <CreateMemorialPage currentUser={currentUser} onCreated={handleMemorialCreated} showToast={showToast} />
      )}
      {route === "create" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "dashboard" && currentUser && (
        <DashboardPage currentUser={currentUser} onNavigate={navigate} showToast={showToast} />
      )}
      {route === "dashboard" && !currentUser && (
        <AuthPage showToast={showToast} />
      )}

      {route === "memorial" && (
        <MemorialPage inviteCode={routeParam} showToast={showToast} />
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}
