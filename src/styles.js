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
.nav-link.active { color: var(--bark); font-weight: 600; }
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

/* -- hero collage voicemail tile — reads as audio, not styled to look
   like the photo tiles around it. Dark bg (var(--bark), the site's
   existing dark surface) with the same shadow/radius as .memory-card so
   it belongs in the same collage, but its own horizontal layout (play
   button, then label/waveform/caption) since a photo-on-top shape
   doesn't fit audio. Purely decorative, matching the rest of this
   illustrative collage — the video tile beside it is just autoplaying
   muted, nothing here is wired to real playback either. */
.hero-voicemail-card { flex: 1; display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: var(--bark); border-radius: 8px; box-shadow: 0 16px 40px -22px rgba(45,33,24,0.22); }
.hero-voicemail-body { flex: 1; min-width: 0; }
.hero-voicemail-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(253,250,245,0.55); margin-bottom: 6px; }
.hero-voicemail-wave { margin-bottom: 8px; }
.hero-voicemail-wave span { flex-shrink: 0; }
.hero-voicemail-caption { display: block; font-family: 'DM Sans', sans-serif; font-size: 11.5px; color: rgba(253,250,245,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

/* -- uniform memory-tile archive --
   Every entry — photo, video, voicemail, written story, link — renders as
   the same square tile: a content body plus a dark bottom bar with the
   type label and (for a media entry with attached text) a story-flag.
   Replaces the old variable-span mosaic (pull-quote/accent/text-length
   spans) entirely; this is a deliberate, spec-driven pivot away from that
   system, not an incremental tweak to it. */
.clusters { max-width: 1180px; margin: 0 auto; padding: 56px 24px 40px; }
.memory-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
@media (max-width: 900px) { .memory-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .memory-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } }

.mem-tile { position: relative; aspect-ratio: 1; border-radius: 4px; box-shadow: var(--mem-shadow); overflow: hidden; display: flex; flex-direction: column; scroll-margin-top: 100px; }
/* Shared hover state for every tile regardless of content type — a
   dedicated container-level state, not per-type styling. z-index lifts the
   tile above its grid neighbors so the scale-up doesn't get clipped by
   them; outline (not border) so the highlight doesn't shift layout or get
   clipped by the tile's own overflow: hidden. */
.mem-tile:hover {
  position: relative;
  z-index: 5;
  outline: 3px solid var(--mem-gold);
  outline-offset: 2px;
  box-shadow: 0 18px 40px -8px rgba(20,18,15,0.4);
  animation: memTileWiggle 0.35s ease-out forwards;
}
@keyframes memTileWiggle {
  0% { transform: scale(1) rotate(0deg); }
  30% { transform: scale(1.06) rotate(-2deg); }
  60% { transform: scale(1.06) rotate(2deg); }
  100% { transform: scale(1.06) rotate(0deg); }
}
@media (prefers-reduced-motion: reduce) {
  .mem-tile:hover { animation: none; }
}
.mem-tile.hidden-card { display: none !important; }

.mem-tile-body { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--mem-paper-deep); }
.mem-tile-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mem-tile-video, .mem-tile-voice, .mem-tile-url { cursor: pointer; background: var(--mem-ink); }
.mem-tile-video video, .mem-tile-url img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mem-tile-url-fallback { font-size: 1.6rem; opacity: 0.5; color: var(--mem-paper); }
.mem-tile-url-embed { flex: 1; background: #000; }
.mem-tile-url-embed iframe { width: 100%; height: 100%; border: none; display: block; }
.mem-tile-yt-badge { position: absolute; top: 10px; left: 10px; z-index: 1; background: #E13B33; color: #fff; font-size: 9px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 7px; border-radius: 3px; }

.mem-tile-play { position: absolute; inset: 0; margin: auto; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; }
.mem-tile-play::after { content: ''; border-left: 14px solid #1D2523; border-top: 9px solid transparent; border-bottom: 9px solid transparent; margin-left: 4px; }

/* Reuses the homepage's cream-on-dark waveform coloring as-is — this
   tile's background is already dark, the exact context that pattern was
   built for. */
.mem-tile-wave { display: flex; align-items: center; gap: 2px; height: 44px; }
.mem-tile-wave span { width: 3px; background: rgba(253,250,245,0.3); border-radius: 2px; }
.mem-tile-wave span.played { background: var(--mem-gold); }

.mem-tile-story { background: var(--mem-card); padding: 18px; }
.mem-tile-story blockquote { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 0.85rem; line-height: 1.5; color: var(--mem-ink); text-align: left; }

/* Caption reveal for a media entry with attached text — visible on
   :hover (desktop) or via the .revealed class MemoryTile toggles on
   first tap (touch, no hover). pointer-events: none always, even when
   visible, so a second tap/click passes through to the tile body
   underneath rather than hitting the overlay — "tap the media once
   revealed" from the spec. */
.mem-tile-caption { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,13,10,0.88) 0%, rgba(15,13,10,0.55) 45%, transparent 75%); display: flex; align-items: flex-end; padding: 16px; opacity: 0; transition: opacity 0.18s ease; pointer-events: none; }
.mem-tile:hover .mem-tile-caption, .mem-tile.revealed .mem-tile-caption { opacity: 1; }
.mem-tile-caption p { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 0.8rem; line-height: 1.45; color: var(--mem-paper); text-align: left; }

.mem-tile-bar { height: 17%; min-height: 32px; flex-shrink: 0; background: var(--mem-ink); display: flex; align-items: center; gap: 8px; padding: 0 12px; }
.mem-tile-type { text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; color: rgba(245,239,225,0.55); white-space: nowrap; }
.mem-tile-flag { display: inline-flex; align-items: center; justify-content: center; color: var(--mem-gold); font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; line-height: 1; }
.mem-tile-meta { margin-left: auto; font-size: 10px; color: rgba(245,239,225,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%; }

@media (prefers-reduced-motion: reduce) {
  .mem-tile-caption { transition: none; }
  .mem-tile .voice-play-btn { transition: none; }
}

/* -- contribute form: photo preview + crop reposition UI -- */
.photo-preview-crop { position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: var(--warm-faint); }
.photo-preview-crop img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crop-adjust-btn { position: absolute; right: 10px; bottom: 10px; background: rgba(45,33,24,0.72); color: var(--cream); border: none; border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.15s ease; }
.crop-adjust-btn:hover { background: rgba(45,33,24,0.9); }

.crop-adjust-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(26,14,8,0.6); display: flex; align-items: center; justify-content: center; padding: 24px; }
.crop-adjust-card { background: var(--cream); border-radius: 6px; padding: 28px; max-width: 380px; width: 100%; box-shadow: 0 24px 60px -20px rgba(0,0,0,0.4); }
.crop-adjust-title { font-family: 'Lora', serif; font-size: 18px; color: var(--bark); margin-bottom: 4px; }
.crop-adjust-sub { font-size: 13px; color: var(--warm-light); margin-bottom: 16px; }
.crop-adjust-window { position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden; cursor: grab; touch-action: none; background: var(--warm-faint); }
.crop-adjust-window:active { cursor: grabbing; }
.crop-adjust-img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; -webkit-user-drag: none; }
.crop-adjust-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }

@media (prefers-reduced-motion: reduce) {
  .crop-adjust-overlay.fade-in { animation: none; opacity: 1; }
  .crop-adjust-btn { transition: none; }
}


/* -- contribute form: link preview -- */
.link-preview-card { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 10px; border: 1px solid var(--warm-faint); border-radius: 4px; background: var(--white); }
.link-preview-thumb { width: 64px; height: 64px; flex-shrink: 0; border-radius: 3px; overflow: hidden; object-fit: cover; }
.link-preview-thumb-fallback { display: flex; align-items: center; justify-content: center; background: var(--cream-dark); font-size: 1.2rem; }
.link-preview-title { font-size: 13px; font-weight: 500; color: var(--bark); line-height: 1.4; }
.link-preview-provider { font-size: 11px; color: var(--warm-light); margin-top: 2px; }
.memorial-page .link-preview-card { border-color: rgba(44,36,32,0.14); background: var(--mem-card); }
.memorial-page .link-preview-title { color: var(--mem-ink); }
.memorial-page .link-preview-provider { color: var(--mem-ink-soft); }

/* -- "featured memory" — a single random entry, full-bleed, above the
   grid. Dark card + gold accents (var(--mem-ink)/var(--mem-gold*), the same
   substitution already used for the pull-quote, rather than a teal that
   doesn't exist anywhere in this palette). Every content type renders
   inside the same shell — see MomoContent. */
.momo { padding: 8px 24px 56px; text-align: center; }
.momo-card-wrap { position: relative; max-width: 640px; margin: 0 auto; }
.momo-card { background: var(--mem-ink); border-radius: 8px; padding: 48px 40px 36px; box-shadow: var(--mem-shadow); }
.momo-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mem-gold-soft); margin-bottom: 22px; }
.momo-photo, .momo-video { aspect-ratio: 4 / 3; max-width: 420px; margin: 0 auto 24px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.06); }
.momo-photo img, .momo-video video { width: 100%; height: 100%; object-fit: cover; display: block; }
.momo-quote { margin: 0 0 20px; font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: clamp(1.25rem, 2.6vw, 1.6rem); line-height: 1.45; color: var(--mem-paper); }
.momo-quote::before { content: '“'; color: var(--mem-gold-soft); }
.momo-quote::after { content: '”'; color: var(--mem-gold-soft); }
.momo-attr { font-size: 0.85rem; color: rgba(245,239,225,0.65); }
.momo-attr-time { margin-left: 6px; opacity: 0.75; }

/* Elevated above .momo-zone (see below) so their own controls stay fully
   clickable across their whole width — the invisible next/back zones sit
   behind actual interactive content, only catching clicks on the passive
   parts of the card (background, quote text, attribution). */
.momo-video, .momo-audio, .momo-link { position: relative; z-index: 3; }
.momo-audio { max-width: 420px; margin: 0 auto 20px; }

.momo-link { display: block; width: 100%; max-width: 420px; margin: 0 auto 20px; background: none; border: none; padding: 0; cursor: pointer; text-align: left; font-family: inherit; }
.momo-link-thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.08); margin-bottom: 10px; }
.momo-link-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.momo-link-thumb-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; opacity: 0.5; }
.momo-link-title { margin: 0; font-size: 0.9rem; color: var(--mem-paper); text-align: center; }
.momo-link-embed { aspect-ratio: 16 / 9; max-width: 420px; margin: 0 auto 20px; border-radius: 6px; overflow: hidden; background: #000; }
.momo-link-embed iframe { width: 100%; height: 100%; border: none; display: block; }

/* Invisible click zones over the outer third of the card, full height —
   right advances (fresh random pick), left returns to the previous entry
   in this session's history (only rendered once there's history to return
   to). A chevron + dark gradient fades in on hover/focus/press so the
   zone is discoverable without needing a visible button. z-index: 2 sits
   below the interactive content above but above the plain card. */
.momo-zone { position: absolute; top: 0; bottom: 0; width: 33%; z-index: 2; display: flex; align-items: center; background: none; border: none; padding: 0; margin: 0; cursor: pointer; }
.momo-zone-left { left: 0; justify-content: flex-start; }
.momo-zone-right { right: 0; justify-content: flex-end; }
.momo-zone-hint {
  display: flex; align-items: center; width: 64px; height: 100%; opacity: 0;
  font-family: 'Fraunces', serif; font-size: 30px; line-height: 1; color: var(--mem-paper);
  transition: opacity 0.2s ease;
}
.momo-zone-left .momo-zone-hint { justify-content: flex-start; padding-left: 16px; border-radius: 8px 0 0 8px; background: linear-gradient(to right, rgba(15,13,10,0.55), transparent); }
.momo-zone-right .momo-zone-hint { justify-content: flex-end; padding-right: 16px; border-radius: 0 8px 8px 0; background: linear-gradient(to left, rgba(15,13,10,0.55), transparent); }
.momo-zone:hover .momo-zone-hint, .momo-zone:focus-visible .momo-zone-hint, .momo-zone:active .momo-zone-hint { opacity: 1; }

.momo-see-all { display: inline-block; margin-top: 22px; font-size: 14px; font-weight: 500; color: var(--mem-ink-soft); text-decoration: underline; text-underline-offset: 3px; }
.momo-see-all:hover { color: var(--mem-ink); }
.momo-nudge { margin: 14px auto 0; max-width: 420px; font-size: 13px; color: var(--mem-ink-soft); }

@media (max-width: 600px) {
  .momo { padding: 0 16px 40px; }
  .momo-card { padding: 36px 24px 28px; }
}

/* "See all memories" locates the matching grid tile via data-memory-id and
   glows it on arrival — gold border, expanding shadow that fades over
   ~1.4s, so it's identifiable even in a dense grid. */
.momo-highlight { border-radius: 4px; outline: 3px solid var(--mem-gold); outline-offset: 2px; animation: momoGlow 1.4s ease-out; }
@keyframes momoGlow {
  0% { box-shadow: 0 0 0 0 rgba(184,134,59,0.55); }
  100% { box-shadow: 0 0 0 26px rgba(184,134,59,0); }
}

@media (prefers-reduced-motion: reduce) {
  .momo-zone-hint { transition: none; }
  .momo-highlight { animation: none; }
}

/* -- contributor avatar stack — same overlapping-circle pattern as the
   homepage's preview-crowd, adapted to the memorial page's own tokens and
   a per-contributor hashed color instead of one flat avatar background. */
.mem-avatar-stack { display: flex; align-items: center; justify-content: center; margin-top: 18px; }
.mem-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--mem-paper); border: 2px solid var(--mem-paper); margin-left: -10px; flex-shrink: 0; }
.mem-avatar:first-child { margin-left: 0; }
.mem-avatar-overflow { background: var(--mem-ink-soft) !important; }


/* -- share-a-memory modal: form widgets are used only on this page -- */
.voice-recorder { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
.record-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 24px; }
.record-btn-recording { background: #e74c3c; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.4); } 50% { box-shadow: 0 0 0 12px rgba(231,76,60,0); } }
.record-time { font-size: 24px; font-family: monospace; color: var(--bark); }
.record-sub { font-size: 13px; color: var(--warm-light); }

.memorial-page .form-label { color: var(--mem-ink); }
.memorial-page .form-input { border-color: rgba(44,36,32,0.14); }
.memorial-page .form-input:focus { border-color: var(--mem-rose); }
.memorial-page .record-btn-idle { background: var(--mem-rose); }
.memorial-page .record-btn-idle:hover { background: #a8434b; }
.memorial-page .btn-rust { background: var(--mem-rose); }
.memorial-page .btn-rust:hover { background: #a8434b; }

/* Overlay sits below .crop-adjust-overlay's z-index (500) so the crop
   adjuster — opened from a photo attached inside this modal — stacks on
   top of it rather than behind it. */
.share-modal-overlay { position: fixed; inset: 0; z-index: 480; background: rgba(26,14,8,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; }
.share-modal { background: var(--mem-card); border-radius: 12px; max-width: 480px; width: 100%; max-height: calc(100vh - 40px); overflow-y: auto; padding: 36px 34px; position: relative; box-shadow: 0 20px 50px -12px rgba(44,36,32,0.35); }
.share-modal-close { position: absolute; top: 18px; right: 18px; background: none; border: none; font-size: 22px; line-height: 1; color: var(--mem-ink-soft); cursor: pointer; }
.share-modal-eyebrow { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mem-rose); margin-bottom: 10px; }
.share-modal h2 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 24px; line-height: 1.3; margin: 0 0 22px; color: var(--mem-ink); }

.share-orient-actions { display: flex; flex-direction: column; gap: 10px; }
.share-orient-btn { text-align: left; padding: 16px 18px; border-radius: 8px; border: 1px solid rgba(44,36,32,0.14); background: var(--mem-paper); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: border-color 0.15s ease; }
.share-orient-btn:hover { border-color: var(--mem-rose); }
.share-orient-btn .title { font-size: 15px; font-weight: 600; color: var(--mem-ink); display: block; margin-bottom: 3px; }
.share-orient-btn .sub { font-size: 12.5px; color: var(--mem-ink-soft); }
.share-orient-btn.primary { background: var(--mem-rose); border-color: var(--mem-rose); }
.share-orient-btn.primary .title { color: #fff; }
.share-orient-btn.primary .sub { color: rgba(255,255,255,0.85); }

.share-rel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
.share-rel-chip { font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(44,36,32,0.14); background: var(--mem-paper); color: var(--mem-ink); cursor: pointer; text-align: left; transition: border-color 0.15s ease; }
.share-rel-chip:hover { border-color: var(--mem-rose); }
.share-freewrite-link { display: block; text-align: center; font-size: 13px; color: var(--mem-ink-soft); text-decoration: underline; cursor: pointer; }

.share-question-box { background: var(--mem-paper); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.share-question-text { font-family: 'Fraunces', serif; font-style: italic; font-size: 19px; line-height: 1.45; margin: 0; color: var(--mem-ink); }
.share-shuffle-link { display: inline-block; font-size: 12px; color: var(--mem-rose); text-decoration: underline; cursor: pointer; margin-top: 12px; }

.share-attach-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.share-attach-btn { font-size: 12px; color: var(--mem-ink-soft); border: 1px solid rgba(44,36,32,0.14); background: transparent; padding: 8px 12px; border-radius: 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s ease; }
.share-attach-btn:hover { border-color: var(--mem-rose); color: var(--mem-rose); }
.share-attach-btn.spotlight { border-color: var(--mem-rose); color: var(--mem-rose); background: rgba(193,81,90,0.06); }
.share-submit-btn { width: 100%; }
.share-back-link { display: block; text-align: center; font-size: 12px; color: var(--mem-ink-soft); margin-top: 16px; cursor: pointer; }

.share-thanks-icon { width: 44px; height: 44px; border-radius: 50%; background: var(--mem-rose); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 18px; }
.share-thanks-text { text-align: center; font-size: 15px; color: var(--mem-ink-soft); margin-bottom: 24px; }
.share-thanks-actions { display: flex; gap: 10px; }
.share-thanks-actions .btn { flex: 1; justify-content: center; }

@media (prefers-reduced-motion: reduce) {
  .share-modal-overlay.fade-in { animation: none; opacity: 1; }
}

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

/* Two ways to pay — a light "pay as you go" card and a dark "pay once"
   card, side by side. Dark card reuses var(--bark), the site's existing
   dark-surface color (footer, final-cta), and var(--rust-light) for its
   gold/tan-on-dark label + ring mark, the warmest existing token that
   still reads clearly against --bark — no new colors introduced. */
.pricing-paths { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; padding: 8px 0 64px; }
@media (max-width: 720px) { .pricing-paths { grid-template-columns: 1fr; } }

.pricing-path-card { display: flex; flex-direction: column; height: 100%; border-radius: 10px; padding: 36px 32px; }
.pricing-path-card-light { background: var(--white); border: 1px solid var(--warm-faint); }
.pricing-path-card-dark { background: var(--bark); }

.pricing-path-label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
.pricing-path-label-rust { color: var(--rust); }
.pricing-path-label-gold { color: var(--rust-light); }

.pricing-path-price { font-family: 'Lora', serif; font-weight: 500; font-size: 30px; margin-bottom: 4px; }
.pricing-path-card-light .pricing-path-price { color: var(--bark); }
.pricing-path-card-dark .pricing-path-price { color: var(--cream); }

.pricing-path-sub { font-size: 14px; margin-bottom: 22px; }
.pricing-path-card-light .pricing-path-sub { color: var(--warm-mid); }
.pricing-path-card-dark .pricing-path-sub { color: rgba(253,250,245,0.6); }

.pricing-path-dots { display: flex; gap: 6px; margin-bottom: 6px; }
.pricing-path-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warm-faint); }
.pricing-path-dot.filled { background: var(--rust); }
.pricing-path-dots-caption { display: block; font-size: 12px; color: var(--warm-light); margin-bottom: 20px; }

.pricing-path-ring { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--rust-light); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.pricing-path-ring-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rust-light); }

.pricing-path-body { font-size: 14.5px; font-weight: 300; line-height: 1.7; margin: 0; margin-top: auto; }
.pricing-path-card-light .pricing-path-body { color: var(--warm-mid); }
.pricing-path-card-dark .pricing-path-body { color: rgba(253,250,245,0.75); }

.pricing-closing { padding: 56px 0 100px; border-top: 1px solid var(--warm-faint); text-align: center; }
.pricing-closing-line { font-size: 16px; font-weight: 300; color: var(--warm-mid); max-width: 40ch; margin: 0 auto 32px; line-height: 1.6; }
.pricing-cta-note { display: block; margin-top: 14px; font-size: 13px; color: var(--warm-light); }

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

/* ── OUR STORY (founder's-note page) ── */
.story-wrap { max-width: 680px; padding-top: 70px; padding-bottom: 44px; }
.story-hero { margin-bottom: 44px; }
.story-headline { font-family: 'Lora', serif; font-weight: 400; font-size: 40px; line-height: 1.25; color: var(--bark); margin: 0 0 14px; }
.story-byline { font-family: 'Lora', serif; font-style: italic; font-size: 16px; color: var(--warm-mid); margin: 0; }

.story-photo-placeholder { position: relative; aspect-ratio: 4 / 3; border: 2px dashed var(--warm-faint); border-radius: 8px; background: var(--cream-dark); display: flex; align-items: center; justify-content: center; overflow: hidden; margin: 0 0 50px; }
.story-photo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.story-photo-label { color: var(--warm-mid); font-size: 13px; text-align: center; padding: 0 20px; }

.story-article p { font-size: 17px; line-height: 1.8; color: var(--bark); margin: 0 0 26px; font-weight: 300; }
.story-article p.story-lede { font-family: 'Lora', serif; font-style: italic; font-weight: 400; font-size: 23px; line-height: 1.5; color: var(--bark); margin: 0 0 34px; }
.story-pull { font-family: 'Lora', serif; font-style: italic; font-weight: 400; font-size: 24px; line-height: 1.45; color: var(--rust); margin: 44px 0; max-width: 34ch; }
.story-divider { border: none; border-top: 1px solid var(--warm-faint); margin: 44px 0; }
.story-signature { font-family: 'Lora', serif; font-style: italic; font-size: 18px; color: var(--bark); margin-top: 12px; }

.story-closing { text-align: center; padding: 70px 0 100px; border-top: 1px solid var(--warm-faint); margin-top: 20px; }
.story-closing-line { font-family: 'Lora', serif; font-style: italic; font-size: 22px; color: var(--bark); max-width: 30ch; margin: 0 auto 28px; }

@media (max-width: 640px) {
  .story-headline { font-size: 30px; }
  .story-article p { font-size: 16.5px; }
  .story-article p.story-lede { font-size: 20px; }
  .story-pull { font-size: 21px; }
}

@media (prefers-reduced-motion: reduce) {
  .story-page .fade-up,
  .story-page .fade-up-2,
  .story-page .fade-up-3 { animation: none; opacity: 1; transform: none; }
}
`;
