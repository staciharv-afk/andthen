export const STYLES = `
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
