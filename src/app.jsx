import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   SUPABASE CLIENT (inline — no npm needed)
   ───────────────────────────────────────────── */
const SUPABASE_URL = "https://zwwlyqcwpqenzpfezohv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3d2x5cWN3cHFlbnpwZmV6b2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTE0MDIsImV4cCI6MjA4ODcyNzQwMn0.xNMM7y_iFnejlbqCDhrGmw1szp1PAIHJhAqYbaj0IaA";

// Simple Supabase REST client (no dependency needed)
function createClient(url, anonKey) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const authHeaders = (token) =>
    token
      ? { ...headers, Authorization: `Bearer ${token}` }
      : headers;

  return {
    url,
    anonKey,
    _accessToken: null,

    setAccessToken(token) {
      this._accessToken = token;
    },

    async from(table) {
      const self = this;
      return {
        async select(columns = "*", opts = {}) {
          let queryStr = `select=${columns}`;
          if (opts.eq) Object.entries(opts.eq).forEach(([k, v]) => (queryStr += `&${k}=eq.${v}`));
          if (opts.order) queryStr += `&order=${opts.order.column}.${opts.order.ascending ? "asc" : "desc"}`;
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr}`, {
            headers: authHeaders(self._accessToken),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: err };
          }
          return { data: await res.json(), error: null };
        },
        async insert(rows) {
          const res = await fetch(`${url}/rest/v1/${table}`, {
            method: "POST",
            headers: authHeaders(self._accessToken),
            body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: err };
          }
          return { data: await res.json(), error: null };
        },
        async update(values, match) {
          let queryStr = "";
          Object.entries(match).forEach(([k, v]) => (queryStr += `&${k}=eq.${v}`));
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr.slice(1)}`, {
            method: "PATCH",
            headers: authHeaders(self._accessToken),
            body: JSON.stringify(values),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: err };
          }
          return { data: await res.json(), error: null };
        },
        async delete(match) {
          let queryStr = "";
          Object.entries(match).forEach(([k, v]) => (queryStr += `&${k}=eq.${v}`));
          const res = await fetch(`${url}/rest/v1/${table}?${queryStr.slice(1)}`, {
            method: "DELETE",
            headers: authHeaders(self._accessToken),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: err };
          }
          return { data: await res.json(), error: null };
        },
      };
    },

    auth: {
      _url: url,
      _anonKey: anonKey,

      async signUp(email, password, metadata = {}) {
        const res = await fetch(`${url}/auth/v1/signup`, {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, data: metadata }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },

      async signInWithPassword(email, password) {
        const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data };
        return { data, error: null };
      },

      async signInWithOtp(email) {
        const res = await fetch(`${url}/auth/v1/otp`, {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: err };
        }
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

/* ─────────────────────────────────────────────
   UTILITY FUNCTIONS
   ───────────────────────────────────────────── */
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
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ─────────────────────────────────────────────
   AUDIO RECORDER HOOK
   ───────────────────────────────────────────── */
function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current.start();
      setRecording(true);
      setDuration(0);
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      alert("Could not access microphone. Please allow microphone access.");
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    setRecording(false);
    clearInterval(timer.current);
  }, []);

  const reset = useCallback(() => {
    setAudioURL(null);
    setDuration(0);
  }, []);

  return { recording, audioURL, duration, start, stop, reset };
}

/* ─────────────────────────────────────────────
   AI NARRATIVE GENERATOR (simulated)
   ───────────────────────────────────────────── */
function generateNarrative(memorial, contributions) {
  const approved = contributions.filter((c) => c.status === "approved");
  const name = memorial.name.split(" ")[0];
  const firstName = memorial.name.includes("'")
    ? memorial.name.match(/'([^']+)'/)?.[1] || name
    : name;

  if (approved.length === 0) {
    return `The stories of ${firstName} are still being gathered. As friends and family share their memories, a beautiful narrative will emerge here — one that captures who ${firstName} really was, told by the people who loved them most.`;
  }

  const authors = [...new Set(approved.map((c) => c.author))];
  const authorList = authors.length === 1
    ? authors[0]
    : authors.slice(0, -1).join(", ") + " and " + authors[authors.length - 1];

  return `If you asked anyone who knew ${firstName}, they'd probably start with the same thing: a story. Not the dates or the facts — the stories. The ones that made you laugh until you couldn't breathe, or cry in the middle of a grocery store because something small reminded you of her.\n\n${firstName} was the kind of person who made the ordinary feel extraordinary. ${memorial.description || ""}\n\nThrough the memories shared by ${authorList}, a picture emerges — not of someone perfect, but of someone profoundly, wonderfully, specifically herself.\n\n${approved.map((c) => `${c.author} remembers: "${(c.text || "").slice(0, 120)}${(c.text || "").length > 120 ? "..." : ""}"`).join("\n\n")}\n\nThese aren't just memories. They're proof that ${firstName} was here, that she mattered, that the world was different — and better — because she was in it. And the beautiful thing is, more stories will come. Someone will find an old photo. Someone will remember something at 2am. And they'll come here, and they'll add to this living, breathing testament to a life well-loved.\n\nAnd then... someone will lean in. And the stories will keep going.`;
}

/* ─────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────── */
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    plus: <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />,
    check: <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    x: <><path d="M18 6L6 18" strokeWidth="2" strokeLinecap="round" /><path d="M6 6l12 12" strokeWidth="2" strokeLinecap="round" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="2" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" /></>,
    mic: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeWidth="2" /><path d="M19 10v2a7 7 0 01-14 0v-2" strokeWidth="2" strokeLinecap="round" /><path d="M12 19v4M8 23h8" strokeWidth="2" strokeLinecap="round" /></>,
    camera: <><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeWidth="2" /><circle cx="12" cy="13" r="4" strokeWidth="2" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill={color} /><path d="M21 15l-5-5L5 21" strokeWidth="2" /></>,
    send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeWidth="2" strokeLinejoin="round" />,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" /><circle cx="12" cy="7" r="4" strokeWidth="2" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="2" /><circle cx="9" cy="7" r="4" strokeWidth="2" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeWidth="2" /></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeWidth="2" />,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeWidth="2" strokeLinecap="round" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeWidth="2" strokeLinecap="round" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" /></>,
    share: <><circle cx="18" cy="5" r="3" strokeWidth="2" /><circle cx="6" cy="12" r="3" strokeWidth="2" /><circle cx="18" cy="19" r="3" strokeWidth="2" /><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" strokeWidth="2" /></>,
    sparkle: <><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" strokeWidth="2" strokeLinejoin="round" /></>,
    menu: <><path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round" /></>,
    back: <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    clock: <><circle cx="12" cy="12" r="10" strokeWidth="2" /><path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" /></>,
    trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" strokeLinecap="round" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" /><circle cx="12" cy="12" r="3" strokeWidth="2" /></>,
    play: <polygon points="5,3 19,12 5,21" fill={color} stroke="none" />,
    stop: <rect x="4" y="4" width="16" height="16" rx="2" fill={color} stroke="none" />,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2" /><path d="M9 22V12h6v10" strokeWidth="2" /></>,
    archive: <><path d="M21 8v13H3V8M1 3h22v5H1z" strokeWidth="2" /><path d="M10 12h4" strokeWidth="2" strokeLinecap="round" /></>,
    settings: <><circle cx="12" cy="12" r="3" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeWidth="2" /><path d="M16 17l5-5-5-5M21 12H9" strokeWidth="2" strokeLinecap="round" /></>,
    refresh: <><path d="M23 4v6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 20v-6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

/* ─────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');

:root {
  --cream: #FDF6EE;
  --cream-dark: #F5EBDD;
  --warm-100: #FAF0E4;
  --warm-200: #F0DCC6;
  --warm-300: #E0C5A0;
  --warm-400: #C9A87C;
  --warm-500: #A8845A;
  --bark: #5C4033;
  --bark-light: #7A5C4A;
  --bark-dark: #3D2B22;
  --sage: #8B9E7E;
  --sage-light: #A8B89D;
  --sage-dark: #6B7E5E;
  --rose: #C4877A;
  --rose-light: #D9A99F;
  --rose-dark: #A66B5E;
  --gold: #C4A35A;
  --gold-light: #D4BB7E;
  --white: #FFFFFF;
  --text-primary: #2D1F14;
  --text-secondary: #6B5744;
  --text-light: #9C8B7A;
  --shadow-sm: 0 1px 3px rgba(93, 64, 51, 0.08);
  --shadow-md: 0 4px 12px rgba(93, 64, 51, 0.1);
  --shadow-lg: 0 8px 30px rgba(93, 64, 51, 0.12);
  --shadow-xl: 0 16px 50px rgba(93, 64, 51, 0.15);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Source Sans 3', 'Segoe UI', sans-serif;
  --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
body { font-family: var(--font-body); background: var(--cream); color: var(--text-primary); min-height: 100vh; line-height: 1.6; }
.app { min-height: 100vh; display: flex; flex-direction: column; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes waveform { 0%, 100% { height: 8px; } 50% { height: 24px; } }

.fade-in { animation: fadeIn 0.5s ease-out both; }
.fade-in-up { animation: fadeInUp 0.6s ease-out both; }
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }

.container { max-width: 720px; margin: 0 auto; padding: 0 20px; width: 100%; }
.container-wide { max-width: 960px; margin: 0 auto; padding: 0 20px; width: 100%; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--font-body); font-size: 0.95rem; font-weight: 500;
  padding: 12px 24px; border: none; border-radius: var(--radius-md);
  cursor: pointer; transition: all var(--transition); text-decoration: none;
  white-space: nowrap; line-height: 1;
}
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--bark); color: var(--cream); box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--bark-dark); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.btn-secondary { background: var(--cream); color: var(--bark); border: 1.5px solid var(--warm-200); }
.btn-secondary:hover { background: var(--warm-100); border-color: var(--warm-300); }
.btn-rose { background: var(--rose); color: var(--white); box-shadow: var(--shadow-sm); }
.btn-rose:hover { background: var(--rose-dark); box-shadow: var(--shadow-md); }
.btn-sage { background: var(--sage); color: var(--white); box-shadow: var(--shadow-sm); }
.btn-sage:hover { background: var(--sage-dark); box-shadow: var(--shadow-md); }
.btn-ghost { background: transparent; color: var(--text-secondary); padding: 8px 12px; }
.btn-ghost:hover { background: var(--warm-100); color: var(--bark); }
.btn-sm { padding: 8px 16px; font-size: 0.85rem; }
.btn-lg { padding: 16px 32px; font-size: 1.05rem; }
.btn-full { width: 100%; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--bark); margin-bottom: 6px; }
.input, .textarea, select {
  width: 100%; padding: 12px 14px; border: 1.5px solid var(--warm-200);
  border-radius: var(--radius-md); font-family: var(--font-body); font-size: 0.95rem;
  background: var(--white); color: var(--text-primary);
  transition: all var(--transition); outline: none;
}
.input:focus, .textarea:focus, select:focus {
  border-color: var(--warm-400); box-shadow: 0 0 0 3px rgba(200, 168, 124, 0.15);
}
.textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
.textarea-large { min-height: 180px; font-size: 1.05rem; }

.card { background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); padding: 28px; transition: all var(--transition); }
.card:hover { box-shadow: var(--shadow-lg); }

.header { background: rgba(253, 246, 238, 0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--warm-200); position: sticky; top: 0; z-index: 100; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; max-width: 960px; margin: 0 auto; }
.logo { font-family: var(--font-display); font-size: 1.3rem; font-weight: 600; color: var(--bark); cursor: pointer; display: flex; align-items: center; gap: 6px; }
.logo em { font-style: italic; color: var(--rose); }
.nav-links { display: flex; align-items: center; gap: 4px; }

.hero { text-align: center; padding: 60px 20px 40px; background: linear-gradient(180deg, var(--cream) 0%, var(--warm-100) 100%); }
.hero h1 { font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 600; color: var(--bark); line-height: 1.2; margin-bottom: 16px; }
.hero p { font-size: 1.15rem; color: var(--text-secondary); max-width: 540px; margin: 0 auto 32px; line-height: 1.6; }

.memorial-hero { text-align: center; padding: 48px 20px 36px; background: linear-gradient(180deg, var(--cream) 0%, var(--warm-100) 50%, var(--cream) 100%); position: relative; overflow: hidden; }
.memorial-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(196, 135, 122, 0.08) 0%, transparent 70%); }
.memorial-photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--white); box-shadow: var(--shadow-lg); margin: 0 auto 20px; display: block; position: relative; }
.memorial-photo-placeholder { width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-200), var(--rose-light)); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 4px solid var(--white); box-shadow: var(--shadow-lg); position: relative; }
.memorial-name { font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 600; color: var(--bark); line-height: 1.2; margin-bottom: 8px; position: relative; }
.memorial-dates { font-size: 0.95rem; color: var(--text-light); margin-bottom: 12px; letter-spacing: 0.03em; position: relative; }
.memorial-desc { font-size: 1.05rem; color: var(--text-secondary); max-width: 520px; margin: 0 auto; line-height: 1.6; font-style: italic; position: relative; }

.story-card { background: var(--white); border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-sm); border: 1px solid var(--warm-100); transition: all var(--transition); position: relative; }
.story-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.story-card .story-text { font-size: 1.05rem; line-height: 1.7; color: var(--text-primary); margin-bottom: 16px; }
.story-card .story-text::before { content: '\u201C'; font-family: var(--font-display); font-size: 2.5rem; color: var(--rose-light); line-height: 0; vertical-align: -0.3em; margin-right: 4px; }
.story-card .story-author { font-size: 0.9rem; color: var(--text-light); font-weight: 500; display: flex; align-items: center; gap: 8px; }
.story-card .story-photo { width: 100%; border-radius: var(--radius-md); margin-bottom: 16px; object-fit: cover; max-height: 300px; }
.story-card .story-audio { width: 100%; margin-bottom: 16px; border-radius: var(--radius-sm); }

.mod-card { background: var(--white); border-radius: var(--radius-lg); padding: 24px; border: 1.5px solid var(--warm-200); margin-bottom: 16px; animation: fadeIn 0.4s ease-out both; }
.mod-card .mod-text { font-size: 1rem; line-height: 1.6; margin-bottom: 12px; }
.mod-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.mod-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.03em; }
.mod-badge-pending { background: #FEF3CD; color: #856404; }
.mod-badge-approved { background: #D4EDDA; color: #155724; }

.tabs { display: flex; gap: 4px; padding: 4px; background: var(--warm-100); border-radius: var(--radius-md); margin-bottom: 24px; }
.tab { flex: 1; padding: 10px 16px; border: none; background: transparent; font-family: var(--font-body); font-size: 0.9rem; font-weight: 500; color: var(--text-light); cursor: pointer; border-radius: var(--radius-sm); transition: all var(--transition); text-align: center; }
.tab-active { background: var(--white); color: var(--bark); box-shadow: var(--shadow-sm); }

.empty-state { text-align: center; padding: 48px 20px; color: var(--text-light); }
.empty-state p { font-size: 1rem; margin-top: 12px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(45, 31, 20, 0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
.modal { background: var(--white); border-radius: var(--radius-xl); padding: 36px; width: 90%; max-width: 520px; max-height: 90vh; overflow-y: auto; animation: fadeInUp 0.3s ease-out; }
.modal h2 { font-family: var(--font-display); font-size: 1.5rem; color: var(--bark); margin-bottom: 8px; }
.modal p.subtitle { color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem; }

.toast-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2000; }
.toast { background: var(--bark); color: var(--cream); padding: 14px 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); font-size: 0.95rem; font-weight: 500; animation: fadeInUp 0.4s ease-out both; display: flex; align-items: center; gap: 10px; white-space: nowrap; }

.invite-box { background: var(--warm-100); border-radius: var(--radius-md); padding: 16px; display: flex; align-items: center; gap: 12px; margin: 16px 0; }
.invite-box input { flex: 1; background: var(--white); border: 1px solid var(--warm-200); border-radius: var(--radius-sm); padding: 10px 12px; font-family: var(--font-body); font-size: 0.85rem; color: var(--text-secondary); outline: none; }

.stat-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
.stat-badge { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--warm-100); border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
.stat-badge strong { color: var(--bark); }

.upload-zone { border: 2px dashed var(--warm-300); border-radius: var(--radius-lg); padding: 32px; text-align: center; cursor: pointer; transition: all var(--transition); background: var(--warm-100); }
.upload-zone:hover { border-color: var(--rose); background: rgba(196, 135, 122, 0.06); }
.photo-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: var(--radius-md); margin-top: 12px; }

.spinner { width: 24px; height: 24px; border: 3px solid var(--warm-200); border-top-color: var(--rose); border-radius: 50%; animation: spin 0.8s linear infinite; }

.narrative-block { background: linear-gradient(135deg, var(--white), var(--warm-100)); border-radius: var(--radius-xl); padding: 36px; border: 1px solid var(--warm-200); position: relative; overflow: hidden; }
.narrative-block::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--rose), var(--gold), var(--sage)); }
.narrative-block p { font-size: 1.05rem; line-height: 1.8; color: var(--text-primary); margin-bottom: 16px; font-family: var(--font-body); }
.narrative-block p:first-of-type::first-letter { font-family: var(--font-display); font-size: 3rem; float: left; line-height: 1; padding-right: 8px; color: var(--rose); }

.waveform { display: flex; align-items: center; gap: 3px; height: 32px; }
.waveform-bar { width: 3px; background: var(--rose); border-radius: 2px; animation: waveform 0.8s ease-in-out infinite; }

.section { padding: 32px 0; }
.divider { height: 1px; background: var(--warm-200); margin: 24px 0; }
.text-center { text-align: center; }
.text-light { color: var(--text-light); }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.mt-24 { margin-top: 24px; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mb-24 { margin-bottom: 24px; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

.setup-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, var(--cream) 0%, var(--warm-100) 100%); padding: 20px; }
.setup-card { max-width: 480px; width: 100%; }
.error-msg { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.9rem; margin-bottom: 16px; }
.success-msg { background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.9rem; margin-bottom: 16px; }
`;

/* ─────────────────────────────────────────────
   SETUP SCREEN (Enter anon key)
   ───────────────────────────────────────────── */
function SetupScreen({ onConnect }) {
  const [anonKey, setAnonKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!anonKey.trim()) { setError("Please paste your anon key"); return; }
    setTesting(true);
    setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/memorials?select=id&limit=1`, {
        headers: { apikey: anonKey.trim(), Authorization: `Bearer ${anonKey.trim()}` },
      });
      if (res.ok) {
        onConnect(anonKey.trim());
      } else {
        setError("Connection failed. Please check your anon key and try again.");
      }
    } catch (e) {
      setError("Could not connect to Supabase. Check your key and try again.");
    }
    setTesting(false);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="setup-container">
        <div className="setup-card card fade-in">
          <div className="text-center mb-24">
            <div className="logo" style={{ justifyContent: "center", fontSize: "1.8rem", marginBottom: 8 }}>And Then<em>...</em></div>
            <p style={{ color: "var(--text-secondary)" }}>Connect to your Supabase project</p>
          </div>

          <div className="success-msg">
            <strong>Project URL:</strong> {SUPABASE_URL}<br />
            <span style={{ fontSize: "0.8rem" }}>Already configured from your project</span>
          </div>

          <div className="input-group">
            <label>Anon (public) key</label>
            <textarea
              className="textarea"
              style={{ minHeight: 80, fontSize: "0.8rem", fontFamily: "monospace" }}
              value={anonKey}
              onChange={(e) => { setAnonKey(e.target.value); setError(""); }}
              placeholder="Paste your anon key here (starts with eyJ...)"
            />
            <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: 4 }}>
              Find this in Supabase → Settings → API Keys → Legacy tab → anon public
            </p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleConnect}
            disabled={testing}
          >
            {testing ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Testing connection...</>
            ) : (
              <><Icon name="key" size={18} color="var(--cream)" /> Connect</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
   ───────────────────────────────────────────── */
export default function AndThenApp() {
  const [client] = useState(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [route, setRoute] = useState("home");
  const [routeParams, setRouteParams] = useState({});
  const [toast, setToast] = useState(null);
  const [memorials, setMemorials] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);

  const showToast = (msg, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const navigate = (r, params = {}) => {
    setRoute(r);
    setRouteParams(params);
    window.scrollTo?.(0, 0);
  };

  // Fetch data from Supabase
  const fetchMemorials = useCallback(async () => {
    if (!client) return;
    const table = await client.from("memorials");
    const { data, error } = await table.select("*", { order: { column: "created_at", ascending: false } });
    if (data) setMemorials(data);
  }, [client]);

  const fetchContributions = useCallback(async (memorialId) => {
    if (!client) return;
    const table = await client.from("contributions");
    const opts = { order: { column: "created_at", ascending: false } };
    if (memorialId) opts.eq = { memorial_id: memorialId };
    const { data, error } = await table.select("*", opts);
    if (data) setContributions(data);
  }, [client]);

  useEffect(() => {
    if (client) {
      fetchMemorials();
      fetchContributions();
    }
  }, [client, fetchMemorials, fetchContributions]);

  // ── DB OPERATIONS ──
  const addMemorial = async (memorial) => {
    if (!client) return;
    try {
      const table = await client.from("memorials");
      const insertData = {
        name: memorial.name,
        born: memorial.born || null,
        passed: memorial.passed || null,
        description: memorial.description,
        photo_url: memorial.photo,
        invite_code: memorial.inviteCode,
      };
      // Only set steward_id if we have a real auth token
      if (accessToken) {
        insertData.steward_id = currentUser?.id || null;
      }
      const { data, error } = await table.insert(insertData);
      if (data?.[0]) {
        setMemorials((prev) => [data[0], ...prev]);
        return data[0];
      }
    } catch (e) {
      console.log("DB insert failed, using local:", e);
    }
    // Fallback: add locally if RLS blocks or DB fails
    const local = { ...memorial, id: memorial.id || uid(), created_at: new Date().toISOString() };
    setMemorials((prev) => [local, ...prev]);
    return local;
  };

  const addContribution = async (contrib) => {
    if (!client) return;
    try {
      const table = await client.from("contributions");
      const { data, error } = await table.insert({
        memorial_id: contrib.memorialId || contrib.memorial_id,
        author: contrib.author,
        text: contrib.text,
        photo_url: contrib.photo,
        audio_url: contrib.audioURL,
        status: "pending",
      });
      if (data?.[0]) {
        setContributions((prev) => [data[0], ...prev]);
        return;
      }
    } catch (e) {
      console.log("Contribution insert failed, using local:", e);
    }
    // Fallback local
    const local = { ...contrib, id: uid(), created_at: new Date().toISOString(), status: "pending" };
    setContributions((prev) => [local, ...prev]);
  };

  const updateContribution = async (id, updates) => {
    if (!client) return;
    const table = await client.from("contributions");
    await table.update(updates, { id });
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteContribution = async (id) => {
    if (!client) return;
    const table = await client.from("contributions");
    await table.delete({ id });
    setContributions((prev) => prev.filter((c) => c.id !== id));
  };

  const getMemorialContributions = (memorialId, status = null) => {
    return contributions.filter(
      (c) => (c.memorial_id === memorialId || c.memorialId === memorialId) && (status ? c.status === status : true)
    );
  };

  const getFirstMemorial = () => memorials[0] || null;

  // ── AUTH ──
  const handleLogin = async (email, name, password) => {
    const localUser = { id: uid(), email, name: name || email.split("@")[0] };
    if (!client) {
      setCurrentUser(localUser);
      return localUser;
    }
    try {
      // Try sign up first, then sign in
      const signUpRes = await client.auth.signUp(email, password || "andthen-" + uid(), { name });
      if (signUpRes.data?.user) {
        const user = signUpRes.data.user;
        const token = signUpRes.data.access_token || signUpRes.data.session?.access_token;
        if (token) {
          setAccessToken(token);
          client.setAccessToken(token);
        }
        const authUser = { id: user.id, email: user.email, name: name || email.split("@")[0] };
        setCurrentUser(authUser);
        return authUser;
      }
      // If already exists, try sign in
      const signInRes = await client.auth.signInWithPassword(email, password || "andthen-" + uid());
      if (signInRes.data?.user) {
        const user = signInRes.data.user;
        const token = signInRes.data.access_token;
        if (token) {
          setAccessToken(token);
          client.setAccessToken(token);
        }
        const authUser = { id: user.id, email: user.email, name: name || email.split("@")[0] };
        setCurrentUser(authUser);
        return authUser;
      }
    } catch (e) {
      console.log("Auth failed, using local user:", e);
    }
    // Fallback: use local user
    setCurrentUser(localUser);
    return localUser;
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <Header
          currentUser={currentUser}
          navigate={navigate}
          route={route}
          onLogout={() => {
            if (client && accessToken) client.auth.signOut(accessToken);
            setCurrentUser(null);
            setAccessToken(null);
            navigate("home");
          }}
        />

        {toast && (
          <div className="toast-container">
            <div className="toast">
              <Icon name="check" size={18} color="var(--sage-light)" />
              {toast}
            </div>
          </div>
        )}

        {route === "home" && <HomePage navigate={navigate} memorial={getFirstMemorial()} />}

        {route === "login" && (
          <LoginPage
            onLogin={async (email, name, password) => {
              await handleLogin(email, name, password);
              const memorial = getFirstMemorial();
              if (routeParams.then === "create") navigate("create");
              else if (memorial) navigate("dashboard", { memorialId: memorial.id });
              else navigate("create");
            }}
            navigate={navigate}
          />
        )}

        {route === "create" && (
          <CreateMemorialPage
            currentUser={currentUser}
            onLogin={handleLogin}
            onSubmit={async (memorial) => {
              const created = await addMemorial(memorial);
              showToast("Memorial created");
              navigate("dashboard", { memorialId: created?.id || memorial.id });
              fetchMemorials();
            }}
            navigate={navigate}
          />
        )}

        {route === "contribute" && (
          <ContributePage
            memorial={memorials.find((m) => m.id === routeParams.memorialId) || getFirstMemorial()}
            onSubmit={async (contrib) => {
              await addContribution(contrib);
              showToast("Your story has been saved");
            }}
            navigate={navigate}
          />
        )}

        {route === "dashboard" && (
          <DashboardPage
            memorial={memorials.find((m) => m.id === routeParams.memorialId) || getFirstMemorial()}
            contributions={contributions}
            getContributions={getMemorialContributions}
            currentUser={currentUser}
            onApprove={async (id) => {
              await updateContribution(id, { status: "approved" });
              showToast("Story approved");
            }}
            onReject={async (id) => {
              await deleteContribution(id);
              showToast("Story removed");
            }}
            navigate={navigate}
            showToast={showToast}
            onRefresh={() => fetchContributions(routeParams.memorialId)}
          />
        )}

        {route === "archive" && (
          <ArchivePage
            memorial={memorials.find((m) => m.id === routeParams.memorialId) || getFirstMemorial()}
            contributions={getMemorialContributions(routeParams.memorialId || getFirstMemorial()?.id, "approved")}
            navigate={navigate}
            currentUser={currentUser}
          />
        )}

        {route === "narrative" && (
          <NarrativePage
            memorial={memorials.find((m) => m.id === routeParams.memorialId) || getFirstMemorial()}
            contributions={getMemorialContributions(routeParams.memorialId || getFirstMemorial()?.id, "approved")}
            navigate={navigate}
          />
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   PAGE COMPONENTS
   ───────────────────────────────────────────── */

function Header({ currentUser, navigate, route, onLogout }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={() => navigate("home")}>
          And Then<em>...</em>
        </div>
        <nav className="nav-links">
          {currentUser ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("dashboard", { memorialId: null })}>
                <Icon name="home" size={16} /> Dashboard
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                <Icon name="logout" size={16} />
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("login")}>Sign in</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("create")}>Create Memorial</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function HomePage({ navigate, memorial }) {
  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1 className="fade-in">"And then..."</h1>
          <p className="fade-in stagger-1">
            That's how every great story starts. Someone leans in, and you remember.
            This is a place to gather those stories — the ones that make someone real.
          </p>
          <div className="flex justify-center gap-12 fade-in stagger-2">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("create")}>Create a Memorial</button>
            {memorial && (
              <button className="btn btn-secondary btn-lg" onClick={() => navigate("archive", { memorialId: memorial.id })}>
                View Archive
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "48px 20px" }}>
        <div className="grid-2">
          {[
            { icon: "heart", title: "Gather Stories", desc: "Friends and family share memories, photos, and voice memos — no app download or account needed." },
            { icon: "users", title: "Steward with Care", desc: "You decide what goes live. A gentle moderation queue keeps the archive exactly right." },
            { icon: "sparkle", title: "AI-Crafted Narrative", desc: "Turn contributed stories into a warm, personal celebration — not a generic obituary." },
            { icon: "archive", title: "Living Archive", desc: "A beautiful, permanent home for every story. Add new memories anytime, even years later." },
          ].map((f, i) => (
            <div key={i} className={`card fade-in stagger-${i + 1}`}>
              <div style={{ marginBottom: 12, color: "var(--rose)" }}><Icon name={f.icon} size={28} /></div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: 8, color: "var(--bark)" }}>{f.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, navigate }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Please enter a valid email"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await onLogin(email, name, password);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <div className="text-center mb-24">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--bark)", marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: "var(--text-secondary)" }}>Sign in to manage your memorials</p>
        </div>
        <div className="card" onClick={(e) => e.stopPropagation()}>
          <div className="input-group">
            <label>Your name</label>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we address you?" />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="At least 6 characters" />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn btn-primary btn-full btn-lg mt-8" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : "Sign In / Sign Up"}
          </button>
          <p className="text-center mt-16" style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
            New here? Just enter your details and we'll create your account.
          </p>
        </div>
      </div>
    </div>
  );
}

function CreateMemorialPage({ currentUser, onLogin, onSubmit, navigate }) {
  const [step, setStep] = useState(currentUser ? 1 : 0);
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [name, setName] = useState("");
  const [born, setBorn] = useState("");
  const [passed, setPassed] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setPhoto(dataUrl);
    setPhotoPreview(dataUrl);
  };

  const handleContinue = async () => {
    if (!email.trim()) { setEmailError("Please enter your email"); return; }
    if (!email.includes("@")) { setEmailError("Please enter a valid email"); return; }
    setEmailError("");
    // Set user locally — skip Supabase Auth for now (works without password)
    try {
      await onLogin(email, userName, password);
    } catch (e) {
      // Auth failed, continue anyway with local user
    }
    setStep(1);
  };

  const handleMemorialSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit({
      id: uid(), name: name.trim(), born: born || null, passed: passed || null,
      description: description.trim(), photo, stewardId: currentUser?.id,
      inviteCode: uid(), createdAt: new Date().toISOString(),
    });
    setSubmitting(false);
  };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 48 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="text-center mb-24">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--bark)", marginBottom: 8 }}>Create a Memorial</h1>
          <p style={{ color: "var(--text-secondary)" }}>A place to gather the stories that made them who they were.</p>
        </div>

        {step === 0 && (
          <div className="card fade-in">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--bark)", marginBottom: 4 }}>First, let's set up your account</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-light)", marginBottom: 20 }}>As the steward, you'll manage this memorial.</p>
            <div className="input-group">
              <label>Your name</label>
              <input className="input" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="input-group">
              <label>Email *</label>
              <input className="input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} placeholder="you@example.com" />
            </div>
            <div className="input-group">
              <label>Password (optional)</label>
              <input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setEmailError(""); }} placeholder="Optional — for account access later" />
            </div>
            {emailError && <div className="error-msg">{emailError}</div>}
            <button type="button" className="btn btn-primary btn-full" onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step === 1 && (
          <div className="card fade-in">
            <div className="text-center mb-16">
              <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{ marginBottom: 20, padding: photoPreview ? 0 : 32, overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                ) : (
                  <><Icon name="camera" size={32} color="var(--warm-400)" /><p style={{ marginTop: 8, color: "var(--text-light)", fontSize: "0.9rem" }}>Add a photo (optional)</p></>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
              {photoPreview && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>Remove photo</button>}
            </div>
            <div className="input-group">
              <label>Their name *</label>
              <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name or how they were known" />
            </div>
            <div className="flex gap-12">
              <div className="input-group flex-1">
                <label>Born</label>
                <input className="input" type="date" value={born} onChange={(e) => setBorn(e.target.value)} />
              </div>
              <div className="input-group flex-1">
                <label>Passed</label>
                <input className="input" type="date" value={passed} onChange={(e) => setPassed(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>A short description</label>
              <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who were they? Not the resume — the real stuff. The quirks, the warmth, the thing everyone remembers." />
            </div>
            <button type="button" className="btn btn-primary btn-full btn-lg" onClick={handleMemorialSubmit} disabled={!name.trim() || submitting} style={{ opacity: name.trim() ? 1 : 0.5 }}>
              {submitting ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating...</> : <><Icon name="heart" size={18} color="var(--cream)" /> Create Memorial</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContributePage({ memorial, onSubmit, navigate }) {
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();
  const recorder = useAudioRecorder();

  if (!memorial) return <div className="container" style={{ paddingTop: 60 }}><div className="empty-state"><p>No memorial found.</p></div></div>;

  const firstName = memorial.name?.includes("'")
    ? memorial.name.match(/'([^']+)'/)?.[1] || memorial.name.split(" ")[0]
    : memorial.name?.split(" ")[0] || "them";

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    setPhoto(dataUrl);
    setPhotoPreview(dataUrl);
  };

  const handleSubmitStory = async () => {
    if (!text.trim() && !recorder.audioURL && !photo) return;
    setSubmitting(true);
    await onSubmit({
      memorialId: memorial.id, memorial_id: memorial.id,
      author: author.trim() || "Anonymous",
      text: text.trim(), photo, audioURL: recorder.audioURL || null,
      status: "pending", createdAt: new Date().toISOString(),
    });
    setSubmitting(false);
    setStep(2);
  };

  if (step === 2) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }} className="fade-in-up">
          <Icon name="heart" size={56} color="var(--rose)" />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--bark)", marginBottom: 12, marginTop: 16 }}>Thank you</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: 32 }}>
            Your story about {firstName} means more than you know. It's been saved and will be part of their living memorial.
          </p>
          <div className="flex flex-col gap-12" style={{ alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => { setText(""); setAuthor(""); setPhoto(null); setPhotoPreview(null); recorder.reset(); setStep(0); }}>
              <Icon name="plus" size={18} color="var(--cream)" /> Share Another Story
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("archive", { memorialId: memorial.id })}>Visit the Archive</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="memorial-hero">
        {memorial.photo_url ? (
          <img src={memorial.photo_url} alt={memorial.name} className="memorial-photo fade-in" />
        ) : (
          <div className="memorial-photo-placeholder fade-in"><Icon name="user" size={40} color="var(--white)" /></div>
        )}
        <h1 className="memorial-name fade-in stagger-1">{memorial.name}</h1>
        {(memorial.born || memorial.passed) && (
          <p className="memorial-dates fade-in stagger-2">
            {memorial.born && fmtDate(memorial.born)}{memorial.born && memorial.passed && " — "}{memorial.passed && fmtDate(memorial.passed)}
          </p>
        )}
        {memorial.description && <p className="memorial-desc fade-in stagger-3">{memorial.description}</p>}
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card fade-in-up">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--bark)", marginBottom: 4 }}>Share a memory</h2>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: 20 }}>Tell us a story, share a moment, or describe what made {firstName} special.</p>

            <div className="input-group">
              <label>Your name</label>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="How should we credit you?" />
            </div>
            <div className="input-group">
              <textarea className="textarea textarea-large" value={text} onChange={(e) => setText(e.target.value)} placeholder={`"And then ${firstName} would always..." — share a memory, a story, a moment.`} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: 8 }}>Or record a voice memo</p>
              <div className="flex items-center gap-8">
                {!recorder.recording && !recorder.audioURL && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={recorder.start}>
                    <Icon name="mic" size={16} /> Record
                  </button>
                )}
                {recorder.recording && (
                  <>
                    <div className="waveform">
                      {[...Array(5)].map((_, i) => <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "var(--rose)", fontWeight: 600 }}>
                      {Math.floor(recorder.duration / 60)}:{String(recorder.duration % 60).padStart(2, "0")}
                    </span>
                    <button type="button" className="btn btn-rose btn-sm" onClick={recorder.stop}>
                      <Icon name="stop" size={14} color="var(--white)" /> Stop
                    </button>
                  </>
                )}
                {recorder.audioURL && (
                  <div className="flex-1">
                    <audio controls src={recorder.audioURL} style={{ width: "100%", height: 40 }} />
                    <button type="button" className="btn btn-ghost btn-sm mt-8" onClick={recorder.reset}>Re-record</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: 8 }}>Add a photo</p>
              <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{ padding: photoPreview ? 0 : 20, overflow: "hidden" }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="photo-preview" />
                ) : (
                  <div className="flex items-center justify-center gap-8">
                    <Icon name="image" size={20} color="var(--warm-400)" />
                    <span style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>Tap to add a photo</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
              {photoPreview && <button type="button" className="btn btn-ghost btn-sm mt-8" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>Remove photo</button>}
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleSubmitStory}
              disabled={submitting || (!text.trim() && !recorder.audioURL && !photo)}
              style={{ opacity: (!text.trim() && !recorder.audioURL && !photo) ? 0.5 : 1 }}
            >
              {submitting ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Saving...</> : <><Icon name="send" size={18} color="var(--cream)" /> Share Your Story</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ memorial, contributions, getContributions, currentUser, onApprove, onReject, navigate, showToast, onRefresh }) {
  const [tab, setTab] = useState("pending");
  const [copied, setCopied] = useState(false);

  if (!memorial) {
    return (
      <div className="container" style={{ paddingTop: 60 }}>
        <div className="empty-state">
          <Icon name="archive" size={48} color="var(--warm-300)" />
          <p>No memorial found. Create one to get started.</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate("create")}>Create Memorial</button>
        </div>
      </div>
    );
  }

  const pending = getContributions(memorial.id, "pending");
  const approved = getContributions(memorial.id, "approved");
  const all = getContributions(memorial.id);
  const inviteLink = `${window.location.origin}?memorial=${memorial.invite_code || memorial.inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setCopied(true); showToast("Invite link copied!"); setTimeout(() => setCopied(false), 2000);
    }).catch(() => showToast("Invite link: " + inviteLink));
  };

  return (
    <div className="container-wide" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="flex items-center gap-12 mb-24 fade-in" style={{ flexWrap: "wrap" }}>
        {memorial.photo_url ? (
          <img src={memorial.photo_url} alt={memorial.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--white)", boxShadow: "var(--shadow-sm)" }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--warm-200), var(--rose-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="user" size={24} color="var(--white)" />
          </div>
        )}
        <div className="flex-1">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--bark)" }}>{memorial.name}</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>Memorial Dashboard</p>
        </div>
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}><Icon name="refresh" size={16} /> Refresh</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("archive", { memorialId: memorial.id })}>
            <Icon name="eye" size={16} /> View Archive
          </button>
          <button className="btn btn-sage btn-sm" onClick={() => navigate("narrative", { memorialId: memorial.id })}>
            <Icon name="sparkle" size={16} color="var(--white)" /> Narrative
          </button>
        </div>
      </div>

      <div className="stat-row fade-in stagger-1">
        <div className="stat-badge"><Icon name="edit" size={16} color="var(--rose)" /><strong>{all.length}</strong> total stories</div>
        <div className="stat-badge"><Icon name="check" size={16} color="var(--sage)" /><strong>{approved.length}</strong> approved</div>
        <div className="stat-badge"><Icon name="clock" size={16} color="var(--gold)" /><strong>{pending.length}</strong> pending</div>
      </div>

      <div className="invite-box fade-in stagger-2">
        <Icon name="link" size={20} color="var(--warm-400)" />
        <input value={inviteLink} readOnly />
        <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
          <Icon name={copied ? "check" : "copy"} size={16} color="var(--cream)" />{copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mb-24 fade-in stagger-3">
        <button className="btn btn-rose btn-sm" onClick={() => navigate("contribute", { memorialId: memorial.id })}>
          <Icon name="plus" size={16} color="var(--white)" /> Preview Contributor Page
        </button>
      </div>

      <div className="tabs fade-in stagger-3">
        <button className={`tab ${tab === "pending" ? "tab-active" : ""}`} onClick={() => setTab("pending")}>
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button className={`tab ${tab === "approved" ? "tab-active" : ""}`} onClick={() => setTab("approved")}>
          Approved {approved.length > 0 && `(${approved.length})`}
        </button>
      </div>

      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div className="empty-state"><Icon name="clock" size={40} color="var(--warm-300)" /><p>No pending stories. Share the invite link to start collecting memories.</p></div>
          ) : (
            pending.map((c) => (
              <div key={c.id} className="mod-card">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-8">
                    <span style={{ fontWeight: 600, color: "var(--bark)" }}>{c.author}</span>
                    <span className="mod-badge mod-badge-pending">Pending</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{timeAgo(c.created_at || c.createdAt)}</span>
                </div>
                {c.text && <p className="mod-text">{c.text}</p>}
                {(c.photo_url || c.photo) && <img src={c.photo_url || c.photo} alt="Contribution" className="photo-preview mb-8" />}
                {(c.audio_url || c.audioURL) && <audio controls src={c.audio_url || c.audioURL} style={{ width: "100%", marginBottom: 12 }} />}
                <div className="mod-actions">
                  <button className="btn btn-sage btn-sm" onClick={() => onApprove(c.id)}><Icon name="check" size={16} color="var(--white)" /> Approve</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onReject(c.id)} style={{ color: "var(--rose-dark)" }}><Icon name="trash" size={16} /> Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "approved" && (
        <div>
          {approved.length === 0 ? (
            <div className="empty-state"><Icon name="check" size={40} color="var(--warm-300)" /><p>No approved stories yet. Review pending contributions to build the archive.</p></div>
          ) : (
            approved.map((c) => (
              <div key={c.id} className="mod-card">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-8">
                    <span style={{ fontWeight: 600, color: "var(--bark)" }}>{c.author}</span>
                    <span className="mod-badge mod-badge-approved">Live</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{timeAgo(c.created_at || c.createdAt)}</span>
                </div>
                {c.text && <p className="mod-text">{c.text}</p>}
                {(c.photo_url || c.photo) && <img src={c.photo_url || c.photo} alt="Contribution" className="photo-preview mb-8" />}
                {(c.audio_url || c.audioURL) && <audio controls src={c.audio_url || c.audioURL} style={{ width: "100%", marginBottom: 12 }} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ArchivePage({ memorial, contributions, navigate, currentUser }) {
  if (!memorial) return null;

  const firstName = memorial.name?.includes("'")
    ? memorial.name.match(/'([^']+)'/)?.[1] || memorial.name.split(" ")[0]
    : memorial.name?.split(" ")[0] || "them";

  return (
    <div>
      <div className="memorial-hero">
        {memorial.photo_url ? (
          <img src={memorial.photo_url} alt={memorial.name} className="memorial-photo fade-in" />
        ) : (
          <div className="memorial-photo-placeholder fade-in"><Icon name="user" size={40} color="var(--white)" /></div>
        )}
        <h1 className="memorial-name fade-in stagger-1">{memorial.name}</h1>
        {(memorial.born || memorial.passed) && (
          <p className="memorial-dates fade-in stagger-2">
            {memorial.born && fmtDate(memorial.born)}{memorial.born && memorial.passed && " — "}{memorial.passed && fmtDate(memorial.passed)}
          </p>
        )}
        {memorial.description && <p className="memorial-desc fade-in stagger-3">{memorial.description}</p>}
        <div className="flex justify-center gap-8 mt-24 fade-in stagger-4" style={{ position: "relative" }}>
          <button className="btn btn-rose" onClick={() => navigate("contribute", { memorialId: memorial.id })}>
            <Icon name="edit" size={16} color="var(--white)" /> Share a Story
          </button>
          {currentUser && (
            <button className="btn btn-secondary" onClick={() => navigate("narrative", { memorialId: memorial.id })}>
              <Icon name="sparkle" size={16} /> View Narrative
            </button>
          )}
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        {contributions.length === 0 ? (
          <div className="empty-state fade-in">
            <Icon name="heart" size={48} color="var(--warm-300)" />
            <p>Stories are still being gathered.<br />Be the first to share a memory of {firstName}.</p>
            <button className="btn btn-rose mt-16" onClick={() => navigate("contribute", { memorialId: memorial.id })}>Share a Story</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <p className="fade-in" style={{ textAlign: "center", color: "var(--text-light)", fontSize: "0.9rem", fontStyle: "italic" }}>
              {contributions.length} {contributions.length === 1 ? "story" : "stories"} and counting
            </p>
            {contributions.map((c, i) => (
              <div key={c.id} className={`story-card fade-in-up stagger-${Math.min(i + 1, 4)}`}>
                {(c.photo_url || c.photo) && <img src={c.photo_url || c.photo} alt="Memory" className="story-photo" />}
                {c.text && <p className="story-text">{c.text}</p>}
                {(c.audio_url || c.audioURL) && <audio controls src={c.audio_url || c.audioURL} className="story-audio" />}
                <div className="story-author">
                  <Icon name="user" size={14} />
                  {c.author} · {timeAgo(c.created_at || c.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NarrativePage({ memorial, contributions, navigate }) {
  const [narrative, setNarrative] = useState(null);
  const [generating, setGenerating] = useState(false);

  if (!memorial) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 2500));
    setNarrative(generateNarrative(memorial, contributions));
    setGenerating(false);
  };

  const firstName = memorial.name?.includes("'")
    ? memorial.name.match(/'([^']+)'/)?.[1] || memorial.name.split(" ")[0]
    : memorial.name?.split(" ")[0] || "them";

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button className="btn btn-ghost mb-16" onClick={() => navigate("dashboard", { memorialId: memorial.id })}>
          <Icon name="back" size={18} /> Back to Dashboard
        </button>
        <div className="text-center mb-24">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--bark)", marginBottom: 8 }}>The Story of {firstName}</h1>
          <p style={{ color: "var(--text-secondary)" }}>An AI-crafted narrative from {contributions.length} shared {contributions.length === 1 ? "memory" : "memories"}</p>
        </div>

        {!narrative && !generating && (
          <div className="text-center fade-in">
            <div className="card" style={{ padding: 40 }}>
              <Icon name="sparkle" size={48} color="var(--rose)" />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--bark)", margin: "16px 0 8px" }}>Ready to Generate</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                We'll read every approved story and weave them into a warm, personal narrative that celebrates who {firstName} really was.
              </p>
              <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
                <Icon name="sparkle" size={18} color="var(--cream)" /> Generate Narrative
              </button>
            </div>
          </div>
        )}

        {generating && (
          <div className="text-center fade-in" style={{ padding: 48 }}>
            <div className="spinner" style={{ margin: "0 auto 20px", width: 36, height: 36 }} />
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Reading stories, finding the threads, weaving a narrative...</p>
          </div>
        )}

        {narrative && !generating && (
          <div className="fade-in-up">
            <div className="narrative-block">
              {narrative.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
            <div className="flex justify-center gap-12 mt-24">
              <button className="btn btn-secondary" onClick={handleGenerate}><Icon name="refresh" size={16} /> Regenerate</button>
              <button className="btn btn-primary" onClick={() => navigator.clipboard?.writeText(narrative)}>
                <Icon name="copy" size={16} color="var(--cream)" /> Copy Text
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
