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
.hero { display: grid; grid-template-columns: 1.15fr 1fr; gap: 72px; align-items: start; padding: 80px 0 72px; border-bottom: 1px solid var(--warm-faint); }
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
.hero-media-large { border-radius: 8px; overflow: hidden; aspect-ratio: 3/4; background: var(--cream-dark); }
.hero-media-col { display: flex; flex-direction: column; gap: 12px; }
.hero-media-small { position: relative; border-radius: 8px; overflow: hidden; flex: 1; aspect-ratio: 1; background: var(--cream-dark); }
.hero-media-large img, .hero-media-small img, .hero-media-small video { width: 100%; height: 100%; object-fit: cover; display: block; }
@media (max-width: 900px) { .hero-media-grid { max-width: 420px; margin: 0 auto; } }

.media-play-btn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(45,33,24,0.18); }
.media-play-btn::before { content: ''; width: 0; height: 0; border-style: solid; border-width: 8px 0 8px 13px; border-color: transparent transparent transparent #fff; margin-left: 3px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

/* "What you get" browser mockup card */
.browser-mock { background: var(--white); border: 1px solid var(--warm-faint); border-radius: 10px; overflow: hidden; box-shadow: 0 24px 60px -24px rgba(45,33,24,0.18); max-width: 620px; margin-top: 40px; }
.browser-mock-bar { display: flex; align-items: center; gap: 6px; padding: 12px 16px; background: var(--cream-dark); border-bottom: 1px solid var(--warm-faint); }
.browser-mock-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--warm-faint); }
.browser-mock-url { font-size: 12px; color: var(--warm-mid); margin-left: 10px; }
.browser-mock-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.mock-row { display: flex; align-items: center; gap: 14px; border: 1px solid var(--warm-faint); border-radius: 8px; padding: 14px; background: var(--cream); }
.mock-row-text { font-family: 'Lora', serif; font-style: italic; font-size: 14px; line-height: 1.5; color: var(--bark); }
.mock-thumb { position: relative; width: 68px; height: 50px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: var(--cream-dark); }
.mock-thumb img, .mock-thumb video { width: 100%; height: 100%; object-fit: cover; display: block; }
.mock-label { font-size: 13px; color: var(--warm-mid); }
.play-badge { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(45,33,24,0.2); }
.play-badge::before { content: ''; width: 0; height: 0; border-style: solid; border-width: 5px 0 5px 8px; border-color: transparent transparent transparent #fff; margin-left: 2px; }

.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--warm-faint); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: var(--warm-mid); flex-shrink: 0; border: 1.5px solid var(--story-line); }

/* ── NARRATIVE SECTIONS ── */
.narrative { padding: 88px 0; }
.section-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rust); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-label::after { content: ''; flex: 1; height: 1px; background: var(--warm-faint); max-width: 40px; }
.narrative-headline { font-family: 'Lora', serif; font-size: clamp(26px, 3vw, 36px); font-weight: 400; color: var(--bark); margin-bottom: 24px; max-width: 680px; line-height: 1.3; }
.narrative-headline.on-dark { color: var(--cream); }
.narrative-body { font-size: 15px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); max-width: 540px; }
.narrative-body.on-dark { color: var(--warm-light); }

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
.scrapbook-hero { position: relative; padding: 70px 24px 50px; overflow: hidden; }
.hero-blob { position: absolute; border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; filter: blur(38px); opacity: 0.5; z-index: 0; }
.hero-blob.b1 { width: 380px; height: 380px; background: var(--mem-rose-soft); top: -14%; left: 2%; }
.hero-blob.b2 { width: 320px; height: 320px; background: var(--mem-gold-soft); bottom: -6%; right: 2%; }
.hero-blob.b3 { width: 240px; height: 240px; background: var(--mem-sage-soft); top: 30%; right: 26%; }
.hero-label { position: relative; z-index: 2; text-align: center; }
.eyebrow-script { font-family: 'Caveat', cursive; font-size: 1.6rem; color: var(--mem-rose); transform: rotate(-2deg); margin-bottom: 4px; display: inline-block; }
.memorial-hero-photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--mem-card); box-shadow: var(--mem-shadow); margin: 0 auto 20px; display: block; }
.memorial-hero-name { font-size: clamp(2.6rem, 7vw, 4.6rem); font-weight: 600; line-height: 1; letter-spacing: -0.01em; }
.memorial-hero-dates { font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; font-size: clamp(1rem, 2vw, 1.25rem); color: var(--mem-ink-soft); margin-top: 10px; }
.memorial-hero-desc { font-size: 15px; color: var(--mem-ink-soft); max-width: 560px; margin: 16px auto 0; line-height: 1.75; }

/* -- collage: dense auto-flow bento, first tile large -- */
.collage { position: relative; z-index: 2; max-width: 980px; margin: 50px auto 8px; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 168px; grid-auto-flow: dense; gap: 22px; }
.snip { display: block; height: 100%; text-decoration: none; color: inherit; cursor: pointer; position: relative; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.snip.large { grid-column: span 2; grid-row: span 2; }
.snip:hover { transform: translateY(-5px); z-index: 5; }
.snip:focus-visible { outline: 3px solid var(--mem-rose); outline-offset: 3px; border-radius: 6px; }
.snip-inner { height: 100%; display: flex; flex-direction: column; background: var(--mem-card); box-shadow: var(--mem-shadow); border: 1px solid rgba(44,36,32,0.06); border-radius: 3px; overflow: hidden; }
.snip-photo .snip-inner { padding: 10px 10px 12px; }
.snip-photo .frame { flex: 1; min-height: 0; border-radius: 2px; overflow: hidden; }
.snip-photo .frame img, .snip-photo .frame video { width: 100%; height: 100%; object-fit: cover; display: block; }
.snip-photo .cap { flex: 0 0 auto; font-family: 'Caveat', cursive; font-size: 1.05rem; text-align: center; color: var(--mem-ink-soft); margin-top: 8px; }
.snip-quote .snip-inner { justify-content: center; padding: 18px; font-family: 'Fraunces', serif; font-style: italic; font-size: 1rem; line-height: 1.4; }
.snip-quote .who { display: block; margin-top: 10px; font-family: 'Caveat', cursive; font-style: normal; font-size: 1rem; color: var(--mem-ink-soft); text-align: right; }
.collage-tail { position: relative; z-index: 2; text-align: center; margin-top: 44px; }
.stat-line { font-size: 0.92rem; color: var(--mem-ink-soft); margin-bottom: 26px; }
.scroll-down { display: inline-flex; flex-direction: column; align-items: center; gap: 6px; font-family: 'Caveat', cursive; font-size: 1.15rem; color: var(--mem-ink-soft); text-decoration: none; animation: bob 2.4s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@media (max-width: 900px) { .collage { max-width: 560px; grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .collage { max-width: 340px; grid-template-columns: 1fr; grid-auto-rows: 190px; gap: 18px; } .snip.large { grid-column: span 1; grid-row: span 1; } }
@media (prefers-reduced-motion: reduce) { .scroll-down { animation: none; } }

/* -- archive intro + filters -- */
.archive-intro { text-align: center; padding: 90px 24px 30px; max-width: 640px; margin: 0 auto; }
.archive-intro .cluster-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mem-rose); margin-bottom: 10px; }
.archive-intro p { margin-top: 12px; color: var(--mem-ink-soft); font-size: 0.98rem; line-height: 1.55; }
.filter-bar { position: sticky; top: 0; z-index: 200; background: rgba(245,239,225,0.9); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(44,36,32,0.1); padding: 14px 20px; margin-top: 40px; }
.filter-inner { max-width: 1100px; margin: 0 auto; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.chip { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; padding: 8px 16px; border-radius: 999px; background: var(--mem-card); border: 1.5px solid rgba(44,36,32,0.14); color: var(--mem-ink-soft); cursor: pointer; transition: all 0.18s ease; }
.chip:hover { border-color: var(--mem-rose); color: var(--mem-ink); }
.chip.active { background: var(--mem-ink); border-color: var(--mem-ink); color: var(--mem-paper); }

/* -- masonry archive -- */
.clusters { max-width: 1180px; margin: 0 auto; padding: 56px 24px 40px; }
.masonry { column-count: 3; column-gap: 26px; }
@media (max-width: 900px) { .masonry { column-count: 2; } }
@media (max-width: 600px) { .masonry { column-count: 1; } }
.card-wrap { break-inside: avoid; margin-bottom: 26px; border-radius: 6px; scroll-margin-top: 100px; }
.card-wrap.hidden-card { display: none !important; }
.card-wrap:nth-child(3n+1) .card { transform: rotate(-1deg); }
.card-wrap:nth-child(3n+2) .card { transform: rotate(0.8deg); }
.card-wrap:nth-child(3n+3) .card { transform: rotate(-0.4deg); }
.card-wrap.pulse .card { animation: pulseGlow 1.6s ease; }
@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(193,81,90,0); } 18% { box-shadow: 0 0 0 10px rgba(193,81,90,0.28); } 100% { box-shadow: 0 0 0 0 rgba(193,81,90,0); } }
.card { position: relative; background: var(--mem-card); border-radius: 4px; padding: 26px 26px 20px; box-shadow: var(--mem-shadow); border: 1px solid rgba(44,36,32,0.06); }
.card-media { width: 100%; border-radius: 3px; margin-bottom: 14px; overflow: hidden; }
.card-media img, .card-media video { width: 100%; max-height: 320px; object-fit: cover; display: block; }
.card-media-audio { background: var(--mem-paper-deep); border-radius: 3px; padding: 16px; margin-bottom: 14px; }
.card-media-audio audio { width: 100%; }
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
`;
