export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
/* Scrapbook memorial page only — Fraunces (display serif) + Caveat (handwritten accents). */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Caveat:wght@500;600;700&display=swap');

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
.hero { display: grid; grid-template-columns: 1fr 1.2fr; gap: 56px; align-items: start; padding: 80px 0 72px; border-bottom: 1px solid var(--warm-faint); }
@media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 48px; } }
.hero-tag { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rust); margin-bottom: 28px; }
.hero-tag::before { content: ''; display: block; width: 28px; height: 1px; background: var(--rust); }
.hero-headline { font-family: 'Lora', serif; font-size: clamp(38px, 4.5vw, 64px); font-weight: 400; line-height: 1.1; color: var(--bark); margin-bottom: 28px; letter-spacing: -0.01em; }
.hero-headline em { font-style: italic; color: var(--rust); }
.hero-body { font-size: 17px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); max-width: 500px; margin-bottom: 44px; }
.hero-body strong { font-weight: 400; color: var(--bark-light); }
.hero-cta-group { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }

/* Hero photo */
.hero-photo { width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; }
.hero-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, var(--cream-dark), #DDCBA8); color: var(--warm-mid); font-size: 14px; }

/* Hero media grid (photo + photo + video) */
.hero-media-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px; }
.hero-media-large, .hero-media-small { display: flex; flex-direction: column; }
.hero-media-col { display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 900px) { .hero-media-grid { max-width: 420px; margin: 0 auto; } }

.media-play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(45,33,24,0.18); }
.media-play-btn::before { content: ''; width: 0; height: 0; border-style: solid; border-width: 8px 0 8px 13px; border-color: transparent transparent transparent #fff; margin-left: 3px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

/* -- memory cards: photo + quote + attribution grouped in one card, same
   pattern as the memorial page's own ScrapbookCard (media, blockquote,
   dashed-divider meta line) — just using the homepage's own tokens instead
   of the memorial page's --mem-* set, which is scoped to .memorial-page.
   Replaces an earlier version where the quote overlaid the photo directly:
   that broke on mobile, where shrunk photos left the gradient scrim
   covering most of the image and long quotes overlapping illegibly. */
.memory-card { flex: 1; display: flex; flex-direction: column; background: var(--white); border: 1px solid var(--warm-faint); border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px -22px rgba(45,33,24,0.22); }
.memory-card-photo { position: relative; background: var(--cream-dark); }
.memory-card-photo img, .memory-card-photo video { width: 100%; height: auto; display: block; }
.memory-card-body { padding: 14px 16px 12px; }
.hero-media-large .memory-card-body { padding: 18px 20px 16px; }
.memory-card-quote { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; font-size: 15px; line-height: 1.5; color: var(--bark); }
.hero-media-large .memory-card-quote { font-size: 16px; }
.memory-card-quote::before { content: '“'; color: var(--rust); font-size: 1.3em; line-height: 0; vertical-align: -0.28em; margin-right: 1px; }
.memory-card-quote::after { content: '”'; color: var(--rust); font-size: 1.3em; line-height: 0; vertical-align: -0.42em; margin-left: 1px; }
.memory-card-attr { display: block; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--warm-faint); font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--warm-light); }

.hero-media-cta { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 14px; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--rust); transition: color 0.2s; }
.hero-media-cta:hover { color: var(--rust-light); text-decoration: underline; }

/* "What you get" interactive preview */
.preview-block { margin-top: 40px; }
.preview-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.preview-pill { font-family: 'Lora', serif; font-style: italic; font-size: 14px; line-height: 1.3; padding: 10px 18px; border-radius: 100px; border: 1.5px solid var(--warm-faint); background: var(--white); color: var(--warm-mid); cursor: pointer; transition: all 0.2s; text-align: left; }
.preview-pill:hover { border-color: var(--rust-light); color: var(--bark); }
.preview-pill.active { background: var(--bark); border-color: var(--bark); color: var(--cream); }

.preview-crowd { display: flex; align-items: center; gap: 14px; margin-top: 22px; }
.preview-crowd-avatars { display: flex; }
.preview-crowd-avatar { margin-left: -10px; border-width: 2px; border-color: var(--white); }
.preview-crowd-avatar:first-child { margin-left: 0; }
.preview-crowd-text { font-size: 13px; color: var(--warm-light); }

/* Browser mockup card */
.browser-mock { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 10px; overflow: hidden; box-shadow: 0 24px 60px -24px rgba(45,33,24,0.18); max-width: 720px; }
.browser-mock-bar { display: flex; align-items: center; gap: 6px; padding: 12px 16px; background: var(--cream-dark); border-bottom: 1px solid var(--warm-faint); }
.browser-mock-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warm-faint); }
.browser-mock-url { font-size: 12px; color: var(--warm-mid); margin-left: 10px; }
.browser-mock-body { padding: 24px; }
.mock-row { display: flex; align-items: flex-start; gap: 16px; border: 1px solid var(--warm-faint); border-radius: 8px; padding: 18px; background: var(--cream); }
.mock-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.mock-thumb { position: relative; width: 68px; height: 50px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: var(--cream-dark); }
.mock-thumb img, .mock-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
.mock-thumb-lg { width: 100%; height: auto; aspect-ratio: 16/9; }
.mock-label { font-family: 'Lora', serif; font-style: italic; font-size: 15px; color: var(--warm-mid); line-height: 1.6; }
.mock-label-on-dark { color: rgba(253,250,245,0.85); }
.mock-attr { font-size: 12px; color: var(--warm-light); }
.mock-attr-on-dark { color: rgba(253,250,245,0.6); }
.icon-pause { width: 4px; height: 16px; background: #fff; box-shadow: 8px 0 0 #fff; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

/* Voice memo mock row — dark card, waveform, real play/pause */
.mock-row-voice { background: var(--bark); border-color: var(--bark); }
.avatar-on-dark { background: rgba(253,250,245,0.15); color: var(--cream); border-color: rgba(253,250,245,0.25); }
.voice-controls { display: flex; align-items: center; gap: 12px; }
.voice-play-btn { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--rust); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }
.voice-play-btn:hover { background: var(--rust-light); transform: scale(1.06); }
.icon-play { width: 0; height: 0; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent #fff; margin-left: 2px; }
.voice-waveform { flex: 1; display: flex; align-items: center; gap: 2px; height: 24px; min-width: 0; }
.voice-waveform span { flex: 1; background: rgba(253,250,245,0.3); border-radius: 2px; transition: background 0.15s ease; }
.voice-waveform span.played { background: var(--rust-light); }
.voice-time { flex-shrink: 0; font-size: 11px; font-variant-numeric: tabular-nums; color: rgba(253,250,245,0.6); }

.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--warm-faint); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: var(--warm-mid); flex-shrink: 0; border: 1.5px solid var(--story-line); }

/* ── NARRATIVE SECTIONS ── */
.narrative { padding: 88px 0; }
.section-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rust); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-label::after { content: ''; flex: 1; height: 1px; background: var(--warm-faint); max-width: 40px; }
.narrative-headline { font-family: 'Lora', serif; font-size: clamp(26px, 3vw, 36px); font-weight: 400; color: var(--bark); margin-bottom: 24px; max-width: 680px; line-height: 1.3; }
.narrative-headline.on-dark { color: var(--cream); }
.narrative-body { font-size: 15px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); max-width: 540px; }
.narrative-body.on-dark { color: var(--warm-light); }

/* "Collecting is the easy part" feature row */
.feature-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 44px; }
@media (max-width: 700px) { .feature-row { grid-template-columns: 1fr; gap: 32px; } }
.feature-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--warm-faint); color: var(--rust); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.feature-icon svg { width: 22px; height: 22px; }
.feature-label { font-family: 'Lora', serif; font-size: 17px; font-weight: 500; color: var(--bark); margin-bottom: 8px; }
.feature-body { font-size: 14px; font-weight: 300; line-height: 1.65; color: var(--warm-mid); max-width: 320px; }

/* ── FINAL CTA ── */
.final-cta { padding: 96px 0; text-align: center; }
.final-cta h2 { font-family: 'Lora', serif; font-size: clamp(30px, 4vw, 50px); font-weight: 400; font-style: italic; color: var(--cream); margin-bottom: 16px; line-height: 1.2; }
.final-cta p { font-size: 16px; font-weight: 300; color: var(--warm-light); margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.7; }

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

/* ── PUBLIC MEMORIAL PAGE — scrapbook design ── */
.memorial-page {
  --mem-paper: #F5EFE1; --mem-paper-deep: #ECE3CE; --mem-card: #FFFCF5;
  --mem-ink: #2C2420; --mem-ink-soft: #5C5248;
  --mem-rose: #C1515A; --mem-rose-soft: #E8C6C4;
  --mem-gold: #B8863B; --mem-gold-soft: #EAD9AE;
  --mem-sage: #6E7F5C; --mem-sage-soft: #D6DEC7;
  --mem-shadow: 0 10px 30px -12px rgba(44,36,32,0.25);
  position: relative; min-height: 100vh; background: var(--mem-paper); color: var(--mem-ink); font-family: 'DM Sans', sans-serif;
}
.memorial-page::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(44,36,32,0.035) 1px, transparent 1px); background-size: 3px 3px; pointer-events: none; opacity: 0.6; }
.memorial-page h1, .memorial-page h2, .memorial-page h3 { font-family: 'Fraunces', serif; margin: 0; }

/* -- hero -- */
.scrapbook-hero { position: relative; padding: 0 24px 28px; overflow: hidden; }
.memorial-brand { position: absolute; top: 16px; left: 16px; z-index: 6; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; background: rgba(255,252,245,0.9); backdrop-filter: blur(6px); border: none; border-radius: 8px; padding: 8px 14px; box-shadow: var(--mem-shadow); cursor: pointer; text-align: left; }
.memorial-brand-logo { font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600; color: var(--mem-ink); line-height: 1.2; }
.memorial-brand-logo em { font-style: italic; color: var(--mem-rose); }
.memorial-brand-tag { font-family: 'Caveat', cursive; font-size: 0.82rem; color: var(--mem-ink-soft); line-height: 1.2; }
.hero-blob { position: absolute; border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; filter: blur(38px); opacity: 0.5; z-index: 0; }
.hero-blob.b1 { width: 380px; height: 380px; background: var(--mem-rose-soft); top: -14%; left: 2%; }
.hero-blob.b2 { width: 320px; height: 320px; background: var(--mem-gold-soft); bottom: -6%; right: 2%; }
.hero-blob.b3 { width: 240px; height: 240px; background: var(--mem-sage-soft); top: 30%; right: 26%; }
.hero-label { position: relative; z-index: 2; text-align: center; padding-top: 88px; }
.eyebrow-script { font-family: 'Caveat', cursive; font-size: 1.6rem; color: var(--mem-rose); transform: rotate(-2deg); margin-bottom: 4px; display: inline-block; }
.memorial-hero-name { font-size: clamp(2.6rem, 7vw, 4.6rem); font-weight: 600; line-height: 1; letter-spacing: -0.01em; }
.memorial-hero-dates { font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; font-size: clamp(1rem, 2vw, 1.25rem); color: var(--mem-ink-soft); margin-top: 10px; }

/* -- header photo banner (creator-uploaded cover photo, 16:7 from the create form) -- */
.hero-banner { position: relative; margin: 0 -24px 28px; overflow: hidden; }
.hero-banner img { width: 100%; height: clamp(220px, 34vw, 420px); object-fit: cover; display: block; }
.hero-banner-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(44,36,32,0) 35%, rgba(44,36,32,0.78) 100%); }
.hero-banner-label { position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 24px 28px; text-align: center; }
.hero-banner-label .memorial-hero-name { color: var(--mem-paper); }
.hero-banner-label .memorial-hero-dates { color: rgba(245,239,225,0.85); }
.hero-banner-label .eyebrow-script { color: var(--mem-rose-soft); }

.hero-below { position: relative; z-index: 2; text-align: center; }
.memorial-hero-desc { font-size: 15px; color: var(--mem-ink-soft); max-width: 560px; margin: 16px auto 0; line-height: 1.75; }
.stat-line { font-size: 0.92rem; color: var(--mem-ink-soft); margin-top: 18px; }

/* -- filters -- */
.filter-bar { position: sticky; top: 0; z-index: 200; background: rgba(245,239,225,0.9); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(44,36,32,0.1); padding: 14px 20px; margin-top: 40px; }
.filter-inner { max-width: 1100px; margin: 0 auto; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.chip { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; padding: 8px 16px; border-radius: 999px; background: var(--mem-card); border: 1.5px solid rgba(44,36,32,0.14); color: var(--mem-ink-soft); cursor: pointer; transition: all 0.18s ease; }
.chip:hover { border-color: var(--mem-rose); color: var(--mem-ink); }
.chip.active { background: var(--mem-ink); border-color: var(--mem-ink); color: var(--mem-paper); }

/* -- mosaic archive --
   CSS Grid, not the old column-count masonry: entries span different
   column/row counts by media type and (for text) content length, so a
   page reads as a varied mosaic rather than a wall of identical cards.
   grid-auto-flow: dense lets shorter items backfill the gaps a wide/tall
   item leaves, so spans don't have to line up in strict rows. Sizing
   comes from content, not manual tagging, so a text-only page (the
   common starting state, before photos/video/audio get added) still
   varies by quote length + the pull-quote/accent treatments below,
   rather than falling back to a separate "empty" layout. */
.clusters { max-width: 1180px; margin: 0 auto; padding: 56px 24px 40px; }
.mosaic-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-flow: dense; gap: 26px; }
.mosaic-item { scroll-margin-top: 100px; }
.mosaic-item.hidden-card { display: none !important; }
.mi-col-1 { grid-column: span 1; }
.mi-col-2 { grid-column: span 2; }
.mi-col-3 { grid-column: span 3; }
.mi-col-full { grid-column: 1 / -1; }
.mi-row-2 { grid-row: span 2; }

/* Scrapbook tilt, kept from the old masonry — only on regular (non-media,
   non-full-width) cards, so it doesn't make the big video/pull-quote
   blocks look crooked. */
.mosaic-item:nth-child(4n+1) .card { transform: rotate(-1deg); }
.mosaic-item:nth-child(4n+2) .card { transform: rotate(0.8deg); }
.mosaic-item:nth-child(4n+3) .card { transform: rotate(-0.5deg); }
.mosaic-item:nth-child(4n+4) .card { transform: rotate(0.4deg); }

@media (max-width: 900px) {
  .mosaic-grid { grid-template-columns: repeat(2, 1fr); }
  .mi-col-3 { grid-column: span 2; }
}
@media (max-width: 600px) {
  .mosaic-grid { grid-template-columns: 1fr; gap: 20px; }
  .mi-col-1, .mi-col-2, .mi-col-3 { grid-column: span 1; }
  .mi-row-2 { grid-row: span 1; }
  .mosaic-item .card { transform: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  /* voice-play-btn's hover scale (defined globally, reused here by AudioCard) */
  .audio-mosaic-card .voice-play-btn { transition: none; }
}

.card { position: relative; background: var(--mem-card); border-radius: 4px; padding: 26px 26px 20px; box-shadow: var(--mem-shadow); border: 1px solid rgba(44,36,32,0.06); height: 100%; }
/* Rare secondary accent treatment (roughly 1 in 8-10 text entries) — a
   warm/gold-tinted card, so the grid gets a color break even with zero
   photos yet. Reuses the existing tag-photo gold token rather than a new
   color. */
.card-accent { background: var(--mem-gold-soft); border-color: rgba(107,78,30,0.18); }
.card-accent .contributor, .card-accent .contributor-time { color: #6B4E1E; }
.card blockquote { margin: 0 0 14px; font-family: 'Fraunces', serif; font-style: italic; font-size: 1.05rem; line-height: 1.5; color: var(--mem-ink); }
.card blockquote::before { content: '“'; color: var(--mem-rose); font-size: 1.4em; line-height: 0; vertical-align: -0.3em; margin-right: 2px; }
.card blockquote::after { content: '”'; color: var(--mem-rose); font-size: 1.4em; line-height: 0; vertical-align: -0.5em; margin-left: 2px; }
.card .meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 12px; border-top: 1px dashed rgba(44,36,32,0.15); font-size: 0.82rem; }
.card .contributor { color: var(--mem-ink-soft); font-weight: 500; }
.card .contributor-time { color: var(--mem-ink-soft); opacity: 0.6; font-size: 0.75rem; margin-left: 6px; }
.tag { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.tag-photo { background: var(--mem-gold-soft); color: #6B4E1E; }
.tag-story { background: var(--mem-sage-soft); color: #3F4B31; }
.tag-video { background: #DCE3EE; color: #33425E; }
.tag-voice { background: var(--mem-rose-soft); color: #7A2E33; }

/* -- pull-quote: one short entry, full-width, dark, larger type — a
   magazine-style break in the grid. Uses --mem-ink (the page's own dark
   tone) rather than introducing a teal not otherwise in this palette. */
.pullquote-card { background: var(--mem-ink); border-radius: 6px; padding: 48px 40px; text-align: center; box-shadow: var(--mem-shadow); }
.pullquote-card blockquote { margin: 0 auto 18px; max-width: 640px; font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.4; color: var(--mem-paper); }
.pullquote-card blockquote::before { content: '“'; color: var(--mem-rose-soft); font-size: 1.2em; line-height: 0; vertical-align: -0.32em; margin-right: 3px; }
.pullquote-card blockquote::after { content: '”'; color: var(--mem-rose-soft); font-size: 1.2em; line-height: 0; vertical-align: -0.5em; margin-left: 3px; }
.pullquote-attr { font-size: 0.85rem; color: rgba(245,239,225,0.65); }

/* -- photo entries: image only, no caption/overlay, sized by its own
   aspect ratio via the mi-col-1/mi-col-2 class the component picks after
   the image loads. */
.photo-item { border-radius: 6px; overflow: hidden; box-shadow: var(--mem-shadow); height: 100%; }
.photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* -- video entries: thumbnail + play icon, caption bar with just the
   contributor (not a text block) -- */
.video-mosaic-card { display: flex; flex-direction: column; height: 100%; border-radius: 6px; overflow: hidden; box-shadow: var(--mem-shadow); background: var(--mem-ink); }
.video-mosaic-frame { position: relative; display: block; width: 100%; aspect-ratio: 4 / 3; border: none; padding: 0; cursor: pointer; background: var(--mem-ink); flex: 1; }
.video-mosaic-frame video { width: 100%; height: 100%; object-fit: cover; display: block; }
.video-mosaic-caption { padding: 12px 16px; font-size: 0.82rem; color: rgba(245,239,225,0.8); }

/* -- audio entries: waveform visual + duration + contributor, not a
   text card. Reuses the homepage's voice-play-btn/icon-play/icon-pause
   pattern; the waveform bars get their own light-card-friendly colors
   since that pattern was built for a dark background. -- */
.audio-mosaic-card { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 12px; background: var(--mem-card); border: 1px solid rgba(44,36,32,0.06); border-radius: 6px; padding: 20px 22px; box-shadow: var(--mem-shadow); }
.audio-mosaic-controls { display: flex; align-items: center; gap: 12px; }
.audio-mosaic-waveform { flex: 1; display: flex; align-items: center; gap: 2px; height: 24px; min-width: 0; }
.audio-mosaic-waveform span { flex: 1; background: rgba(44,36,32,0.14); border-radius: 2px; transition: background 0.15s ease; }
.audio-mosaic-waveform span.played { background: var(--mem-rose); }
.audio-mosaic-time { flex-shrink: 0; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--mem-ink-soft); }
.audio-mosaic-attr { font-size: 0.82rem; color: var(--mem-ink-soft); }

/* -- share-a-memory panel: form widgets are used only on this page -- */
.contribute-type-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.type-btn { font-size: 13px; padding: 8px 16px; border-radius: 100px; border: 1.5px solid var(--warm-faint); background: none; cursor: pointer; color: var(--warm-mid); font-family: inherit; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.media-drop { width: 100%; border: 2px dashed var(--warm-faint); border-radius: 4px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; }
.media-drop-text { font-size: 14px; color: var(--warm-light); }
.voice-recorder { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
.record-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 24px; }
.record-btn-recording { background: #e74c3c; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.4); } 50% { box-shadow: 0 0 0 12px rgba(231,76,60,0); } }
.record-time { font-size: 24px; font-family: monospace; color: var(--bark); }
.record-sub { font-size: 13px; color: var(--warm-light); }

.memorial-page .contribute-card { background: var(--mem-card); border: 1px solid rgba(44,36,32,0.08); border-radius: 4px; box-shadow: var(--mem-shadow); padding: 32px; margin: 0 auto 48px; max-width: 640px; }
.memorial-page .contribute-title { font-size: 22px; font-weight: 600; color: var(--mem-ink); margin-bottom: 6px; }
.memorial-page .contribute-sub { font-size: 14px; color: var(--mem-ink-soft); margin-bottom: 24px; line-height: 1.6; }
.memorial-page .form-label { color: var(--mem-ink); }
.memorial-page .form-input { border-color: rgba(44,36,32,0.14); }
.memorial-page .form-input:focus { border-color: var(--mem-rose); }
.memorial-page .type-btn { border-color: rgba(44,36,32,0.14); color: var(--mem-ink-soft); }
.memorial-page .type-btn.active { border-color: var(--mem-rose); color: var(--mem-rose); background: rgba(193,81,90,0.06); }
.memorial-page .media-drop { border-color: rgba(44,36,32,0.14); }
.memorial-page .media-drop:hover { border-color: var(--mem-rose); background: rgba(193,81,90,0.03); }
.memorial-page .record-btn-idle { background: var(--mem-rose); }
.memorial-page .record-btn-idle:hover { background: #a8434b; }
.memorial-page .btn-rust { background: var(--mem-rose); }
.memorial-page .btn-rust:hover { background: #a8434b; }

/* -- closing / add-a-memory cta -- */
.closing { text-align: center; padding: 90px 24px 100px; background: var(--mem-paper-deep); border-top: 1px solid rgba(44,36,32,0.1); }
.closing .script { font-family: 'Caveat', cursive; font-size: 2rem; color: var(--mem-rose); margin-bottom: 10px; transform: rotate(-1deg); display: inline-block; }
.closing h2 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 600; max-width: 640px; margin: 0 auto 28px; line-height: 1.25; }
.add-btn { font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.95rem; background: var(--mem-ink); color: var(--mem-paper); border: none; padding: 16px 34px; border-radius: 999px; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }
.add-btn:hover { transform: translateY(-2px); background: #463a32; }
.closing .note { margin-top: 22px; font-size: 0.85rem; color: var(--mem-ink-soft); }

/* ── TOAST ── */
.toast-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 999; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 14px 20px; border-radius: 4px; font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: fadeUp 0.3s ease; max-width: 320px; }
.toast-success { background: var(--bark); color: var(--cream); }
.toast-error { background: #c0392b; color: white; }

/* ── PRICING PAGE ── */
.pricing-hero { padding: 80px 0 56px; }
.pricing-hero-body { margin-bottom: 0; }

.pricing-free { padding: 40px 0 56px; border-top: 1px solid var(--warm-faint); }
.pricing-free-row { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; }
.pricing-free-heading { font-family: 'Lora', serif; font-weight: 400; font-size: 24px; color: var(--bark); margin: 0; }
.pricing-price-tag { font-family: 'Lora', serif; font-style: italic; font-size: 18px; color: var(--rust); }
.pricing-free-body { color: var(--warm-mid); max-width: 56ch; margin: 0; font-size: 15px; font-weight: 300; }

.pricing-timeline-section { padding: 72px 0 88px; }
.pricing-section-heading { font-family: 'Lora', serif; font-weight: 400; font-size: clamp(24px, 3vw, 30px); color: var(--bark); margin: 0 0 10px; }
.pricing-section-sub { color: var(--warm-mid); font-size: 15px; font-weight: 300; margin: 0 0 56px; max-width: 52ch; }

.pricing-timeline { position: relative; padding: 0 0 0 4px; }
.pricing-timeline-track { position: relative; height: 2px; background: linear-gradient(to right, var(--warm-mid) 0%, var(--warm-mid) 78%, transparent 100%); margin: 0 40px; }
.pricing-timeline-fade-dots { position: absolute; right: -34px; top: -9px; font-size: 20px; letter-spacing: 3px; color: var(--warm-light); }

.pricing-timeline-points { display: grid; grid-template-columns: repeat(5, 1fr); margin: 0 40px; position: relative; top: -2px; }
.pricing-point { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 22px; }
.pricing-point::before { content: ''; position: absolute; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--cream); border: 2px solid var(--warm-mid); }
.pricing-point-origin::before { width: 16px; height: 16px; background: var(--rust); border-color: var(--rust); }
.pricing-point-yr { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-mid); margin-bottom: 6px; }
.pricing-point-amt { font-family: 'Lora', serif; font-size: 19px; color: var(--bark); font-weight: 500; }
.pricing-point-origin .pricing-point-amt { color: var(--rust); font-size: 22px; }
.pricing-point-tag { font-size: 12.5px; color: var(--warm-mid); margin-top: 4px; max-width: 11ch; }

.pricing-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; padding: 64px 0 80px; border-top: 1px solid var(--warm-faint); }
.pricing-kicker { font-family: 'Lora', serif; font-style: italic; font-size: 14px; color: var(--rust); margin-bottom: 8px; }
.pricing-detail-heading { font-family: 'Lora', serif; font-weight: 400; font-size: 22px; color: var(--bark); margin: 0 0 16px; }
.pricing-detail-list { list-style: none; padding: 0; margin: 0; }
.pricing-detail-list li { padding: 10px 0; border-top: 1px solid var(--warm-faint); color: var(--warm-mid); font-size: 15px; font-weight: 300; }
.pricing-detail-list li:first-of-type { border-top: none; }
.pricing-detail-list li strong { color: var(--bark); font-weight: 500; }

.pricing-prepay-box { background: var(--bark); border-radius: var(--radius); padding: 26px 36px; margin: 0 0 72px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.pricing-prepay-label { font-family: 'Lora', serif; font-style: italic; font-size: 17px; color: var(--cream); }
.pricing-prepay-price { font-family: 'Lora', serif; font-weight: 500; font-size: 22px; color: var(--rust-light); }

.pricing-closing { padding: 56px 0 100px; border-top: 1px solid var(--warm-faint); text-align: center; }
.pricing-closing-quote { font-family: 'Lora', serif; font-style: italic; font-size: 21px; color: var(--bark); max-width: 30ch; margin: 0 auto 32px; }
.pricing-cta-note { display: block; margin-top: 14px; font-size: 13px; color: var(--warm-light); }

@media (max-width: 720px) {
  .pricing-detail-grid { grid-template-columns: 1fr; gap: 40px; }
  .pricing-point-tag { display: none; }
  .pricing-timeline-track, .pricing-timeline-points { margin: 0 12px; }
  .pricing-prepay-box { flex-direction: column; align-items: flex-start; padding: 22px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .pricing-page .fade-up,
  .pricing-page .fade-up-2,
  .pricing-page .fade-up-3 { animation: none; opacity: 1; transform: none; }
  .pricing-page .btn { transition: none; }
}

/* ── ONBOARDING ── */
.onboarding-card-wide { max-width: 480px; }
.onboarding-eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rust); font-weight: 500; text-align: center; margin-bottom: 14px; }
.onboarding-headline { font-family: 'Lora', serif; font-weight: 400; font-size: 22px; line-height: 1.35; color: var(--bark); text-align: center; margin: 0 0 14px; }
.onboarding-caption { display: block; margin-top: 14px; font-size: 12.5px; color: var(--warm-light); text-align: center; }

@media (max-width: 520px) {
  .onboarding-card, .onboarding-card-wide { padding: 36px 28px; max-width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-page .fade-up { animation: none; opacity: 1; transform: none; }
}
`;
