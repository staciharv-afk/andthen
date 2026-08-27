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

/* overflow-x: hidden is a deliberate safety net, not a workaround for one
   specific bug — .nav combines position: sticky with backdrop-filter and a
   nested horizontally-scrollable child (.nav-right), a combination with
   known Safari-specific overflow quirks that don't reproduce in Chromium's
   mobile emulation (confirmed: no horizontal overflow locally or on
   production at matching widths in Chromium, but visibly present on a real
   iPhone in Safari). Nothing on this site needs the page itself to scroll
   horizontally — only .nav-right's own internal scroll does, which is
   unaffected since overflow is scoped per-element. */
html { scroll-behavior: smooth; overflow-x: hidden; }
body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--bark); -webkit-font-smoothing: antialiased; overflow-x: hidden; }

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
.nav-logo { font-family: 'Lora', serif; font-size: 20px; color: var(--bark); text-decoration: none; cursor: pointer; flex-shrink: 0; }
.nav-logo em { font-style: italic; color: var(--rust); }
.nav-right { display: flex; align-items: center; gap: 28px; }
.nav-link { font-size: 14px; color: var(--warm-mid); text-decoration: none; cursor: pointer; transition: color 0.2s; background: none; border: none; font-family: inherit; }
.nav-link:hover { color: var(--bark); }
.nav-link.active { color: var(--bark); font-weight: 600; }

.nav-hamburger { display: none; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--warm-faint); background: var(--white); flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; flex-shrink: 0; }
.nav-hamburger span { width: 16px; height: 1.5px; background: var(--bark); }

.nav-drawer-overlay { position: fixed; inset: 0; background: rgba(36,27,20,0.5); z-index: 60; display: none; }
.nav-drawer-overlay.open { display: block; }
.nav-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 78%; max-width: 320px; z-index: 61;
  background: var(--cream); padding: 22px 26px;
  transform: translateX(100%); transition: transform 0.25s ease;
  overflow-y: auto;
}
.nav-drawer.open { transform: translateX(0); }
.nav-drawer-close { display: block; margin-left: auto; margin-bottom: 26px; font-size: 20px; color: var(--bark); background: none; border: none; cursor: pointer; }
.nav-drawer-link { display: block; width: 100%; text-align: left; font-family: 'Lora', serif; font-size: 19px; color: var(--bark); background: none; border: none; border-bottom: 1px solid var(--warm-faint); padding: 14px 0; cursor: pointer; }
.nav-drawer-link em { font-style: italic; color: var(--rust); }
.nav-drawer-link.active { color: var(--rust); }

/* Five nav links plus a CTA button don't fit at phone width, so below the
   breakpoint the inline row is replaced entirely by the hamburger + drawer
   (previously this scrolled the row horizontally on its own axis — the
   drawer is a cleaner fix for the same "too many items, not enough width"
   problem, and matches the mobile-first nav pattern). */
@media (max-width: 768px) {
  .nav { padding: 0 20px; }
  .nav-right { display: none; }
  .nav-hamburger { display: flex; }
}

/* Sticky bottom CTA — mobile only (a fixed full-width bar reads as mobile
   chrome, and the hero's own inline CTAs are already visible at desktop
   widths without needing a persistent bottom bar). Hidden by default via
   translateY, shown once the hero scrolls out of view (see
   StickyBottomCta's IntersectionObserver in Home.jsx). */
.sticky-cta {
  display: none;
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 55;
  background: rgba(253,250,245,0.97); backdrop-filter: blur(6px);
  border-top: 1px solid var(--warm-faint);
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  transform: translateY(100%); transition: transform 0.25s ease;
}
.sticky-cta button { display: block; width: 100%; text-align: center; background: var(--rust); color: #fff; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 10px; border: none; cursor: pointer; }
@media (max-width: 768px) {
  .sticky-cta { display: block; }
  .sticky-cta.show { transform: translateY(0); }
}
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

/* -- Share panel's copy-link row (reuses the chip-input box, just to
   display one link + a Copy button rather than take tag input) -- */
.chip-input {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  background: var(--white); border: 1.5px solid var(--warm-faint); border-radius: var(--radius);
  padding: 8px 10px; min-height: 44px; cursor: text;
}
.chip-input:focus-within { border-color: var(--rust); }
.chip-input input {
  border: none; outline: none; flex: 1; min-width: 140px; padding: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--bark); background: transparent;
}
.chip-input input::placeholder { color: var(--warm-light); }

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
/* Same size as the primary button (btn-lg) so it reads as a real second
   option, not an afterthought — the pulsing dot is the other half of that:
   no shared "growing" indicator exists elsewhere in the app to reuse (the
   memorial page's contributor-count line is plain text, no dot), so this
   is a new small pulse using the brand rust accent, same expanding-ring
   technique as the voice recorder's .record-btn-recording pulse. */
.hero-cta-secondary { display: inline-flex; align-items: center; gap: 9px; }
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rust); flex-shrink: 0; animation: pulseDot 1.8s ease-out infinite; }
@keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(184,92,44,0.5); } 70%, 100% { box-shadow: 0 0 0 8px rgba(184,92,44,0); } }
@media (prefers-reduced-motion: reduce) { .pulse-dot { animation: none; } }

/* Hero photo */
.hero-photo { width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden; }
.hero-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, var(--cream-dark), #DDCBA8); color: var(--warm-mid); font-size: 14px; }

/* -- hero collage — a 2x2 grid of small square tiles matching the real
   memorial page's own tile system (.mem-tile in the memorial-page scope):
   media area + dark type/meta bar + hover-reveal caption scrim. Built as
   its own scoped copy (.hero-tile*) rather than reusing .mem-tile
   directly, since --mem-* tokens are scoped to .memorial-page and don't
   resolve on the homepage, and these tiles are a noticeably smaller
   physical size with two media variants (recipe, voicemail) that system
   doesn't have. Same visual language, tuned scale, ported fresh — not
   literally shared markup, per this app's established pattern for porting
   UI across unrelated page contexts. */
.hero-collage-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (max-width: 900px) { .hero-collage-grid { max-width: 420px; margin: 0 auto; } }

.hero-tile { position: relative; aspect-ratio: 1; border-radius: 6px; box-shadow: 0 4px 10px rgba(43,38,32,0.12); overflow: hidden; display: flex; flex-direction: column; border: none; background: none; padding: 0; margin: 0; text-align: left; font-family: inherit; cursor: pointer; }
.hero-tile-body { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bark); }
.hero-tile-body.photo img, .hero-tile-body.recipe img, .hero-tile-body.video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }

/* Absolutely positioned (not flex-centered) — the video tile also has a
   real <video> element as a sibling, which would otherwise shrink this
   to fit the flex layout's leftover space instead of staying 30x30. */
.hero-tile-play { position: absolute; inset: 0; margin: auto; width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; }
.hero-tile-play::after { content: ''; border-left: 9px solid var(--bark); border-top: 6px solid transparent; border-bottom: 6px solid transparent; margin-left: 2px; }

/* Voicemail's own play button — same shape/size as .hero-tile-play, but
   rust-filled with a white triangle rather than white-filled with a dark
   one, and laid out inline (not absolutely centered) since it's the top
   item of a vertical stack with the waveform and duration below it. */
.hero-tile-voice-inner { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.hero-tile-play-voice { position: static; margin: 0; background: var(--rust); }
.hero-tile-play-voice::after { border-left-color: #fff; }
.hero-tile-duration { font-size: 9px; color: rgba(245,239,225,0.55); font-variant-numeric: tabular-nums; }

.hero-tile-wave { display: flex; align-items: flex-end; gap: 2px; height: 20px; }
.hero-tile-wave span { width: 2.5px; background: rgba(253,250,245,0.3); border-radius: 1px; flex-shrink: 0; transition: background 0.15s ease; }
.hero-tile-wave span.played { background: var(--rust-light); }

.hero-tile-bar { height: 18%; min-height: 26px; flex-shrink: 0; background: #141210; display: flex; align-items: center; gap: 4px; padding: 0 8px; }
.hero-tile-type { text-transform: uppercase; letter-spacing: 0.03em; font-size: 8.5px; color: rgba(245,239,225,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hero-tile-meta { margin-left: auto; font-size: 8.5px; color: rgba(245,239,225,0.45); white-space: nowrap; flex-shrink: 0; }

/* Hover reveals the caption on pointer devices; .revealed does the same
   thing on tap for touch devices, where :hover never fires — toggled in
   JS, one tile at a time. */
.hero-tile-caption { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,13,10,0.92) 0%, rgba(15,13,10,0.5) 55%, transparent 100%); display: flex; align-items: flex-end; padding: 10px; opacity: 0; transition: opacity 0.18s ease; pointer-events: none; }
.hero-tile:hover .hero-tile-caption, .hero-tile.revealed .hero-tile-caption { opacity: 1; }
.hero-tile-caption p { margin: 0; font-family: 'Lora', serif; font-style: italic; font-size: 10px; line-height: 1.35; color: var(--cream); text-align: left; }

@media (prefers-reduced-motion: reduce) {
  .hero-tile-caption { transition: none; }
}

.hero-media-cta { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 4px; padding: 12px 8px; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--rust); transition: color 0.2s; }
.hero-media-cta:hover { color: var(--rust-light); text-decoration: underline; }

.hero-scope-note { font-size: 14px; font-weight: 500; color: var(--rust); line-height: 1.6; max-width: 500px; margin: 0 0 32px; }

.hero-wyg-card { background: var(--cream-dark); border-radius: 10px; padding: 24px 26px; max-width: 500px; margin-top: 48px; }
.hero-wyg-headline { font-family: 'Lora', serif; font-weight: 500; font-size: 20px; color: var(--bark); margin: 0 0 10px; line-height: 1.3; }
.hero-wyg-body { font-size: 14px; font-weight: 300; line-height: 1.6; color: var(--warm-mid); margin: 0; }
@media (max-width: 600px) {
  .hero-scope-note { font-size: 13px; margin-top: -16px; }
  .hero-wyg-card { padding: 18px 20px; }
  .hero-wyg-headline { font-size: 18px; }
  .hero-wyg-body { font-size: 13.5px; }
}

.icon-pause { width: 4px; height: 16px; background: #fff; box-shadow: 8px 0 0 #fff; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

.avatar-on-dark { background: rgba(253,250,245,0.15); color: var(--cream); border-color: rgba(253,250,245,0.25); }
.voice-controls { display: flex; align-items: center; gap: 12px; }
.voice-play-btn { flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: none; background: var(--rust); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease; }
.voice-play-btn:hover { background: var(--rust-light); transform: scale(1.06); }
.icon-play { width: 0; height: 0; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent #fff; margin-left: 2px; }
.voice-waveform { flex: 1; display: flex; align-items: center; gap: 2px; height: 24px; min-width: 0; }
.voice-waveform span { flex: 1; background: rgba(253,250,245,0.3); border-radius: 2px; transition: background 0.15s ease; }
.voice-waveform span.played { background: var(--rust-light); }
.voice-time { flex-shrink: 0; font-size: 11px; font-variant-numeric: tabular-nums; color: rgba(253,250,245,0.6); }

/* -- "every way a memory can live" content-type pills + feature grid -- */
.type-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 44px; }
.type-pill { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--bark); background: var(--cream); border: 1px solid var(--warm-faint); border-radius: 999px; padding: 8px 18px; }
.type-pills-hint { font-size: 14px; color: var(--warm-mid); line-height: 1.65; margin: 22px 0 0; max-width: 520px; }

.wyg2-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px 48px; margin-top: 56px; }
@media (max-width: 700px) { .wyg2-grid { grid-template-columns: 1fr; gap: 32px; } }
.wyg2-label { font-family: 'Lora', serif; font-size: 19px; font-weight: 500; color: var(--bark); margin-bottom: 10px; }
.wyg2-body { font-size: 14.5px; font-weight: 300; line-height: 1.7; color: var(--warm-mid); max-width: 400px; }
@media (max-width: 600px) {
  .type-pills { gap: 8px; margin-top: 32px; }
  .type-pill { font-size: 12px; padding: 7px 14px; }
  .type-pills-hint { font-size: 13px; margin-top: 18px; }
  .wyg2-grid { margin-top: 36px; }
  .wyg2-label { font-size: 17px; }
  .wyg2-body { font-size: 13.5px; }
}

/* Centered variant of .hero-media-cta, for the second "See a real, living
   page" link below the content-type grid. Both stay rust across every
   interactive state — no global anchor rule exists in this file to
   conflict with, but pinned explicitly since these read as links. */
.section-cta-link, .section-cta-link:hover, .section-cta-link:active, .section-cta-link:focus {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; margin-top: 30px; padding: 12px 8px; background: none; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--rust);
}
.section-cta-link:hover { color: var(--rust-light); text-decoration: underline; }

.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--warm-faint); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: var(--warm-mid); flex-shrink: 0; border: 1.5px solid var(--story-line); }

/* ── NARRATIVE SECTIONS ── */
/* Every homepage section after the first sets an inline paddingTop:0 (they
   stack directly, separated only by the section above's padding-bottom), so
   the vertical rhythm between sections is one padding-bottom value — keep
   these in step when changing it. */
.narrative { padding: 88px 0; }
@media (max-width: 700px) { .narrative { padding: 60px 0; } }
.section-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rust); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-label::after { content: ''; flex: 1; height: 1px; background: var(--warm-faint); max-width: 40px; }
.narrative-headline { font-family: 'Lora', serif; font-size: clamp(26px, 3vw, 36px); font-weight: 400; color: var(--bark); margin-bottom: 24px; max-width: 680px; line-height: 1.3; }
.narrative-body { font-size: 15px; font-weight: 300; line-height: 1.75; color: var(--warm-mid); max-width: 500px; }

/* ── FINAL CTA ── */
.final-cta { padding: 96px 0; text-align: center; }
@media (max-width: 700px) { .final-cta { padding: 64px 0; } }
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

/* ── PAGE SETTINGS ── */
.settings-section { margin-bottom: 34px; }
.settings-section:last-child { margin-bottom: 0; }
.settings-section-title { font-family: 'Lora', serif; font-size: 17px; color: var(--bark); margin-bottom: 4px; }
.settings-section-desc { font-size: 13px; color: var(--warm-light); margin: 0 0 14px; max-width: 52ch; }
.settings-default-tag { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: var(--cream-dark); color: var(--warm-mid); padding: 2px 7px; border-radius: 100px; margin-left: 6px; position: relative; top: -1px; }
.settings-warning { font-size: 12.5px; color: var(--warm-mid); background: var(--cream-dark); border: 1px solid var(--warm-faint); border-radius: 4px; padding: 12px 14px; margin-top: 10px; line-height: 1.5; }
.settings-hint { font-size: 12px; color: var(--warm-light); margin-top: 14px; }

.privacy-option { display: flex; align-items: flex-start; gap: 12px; border: 1px solid var(--warm-faint); border-radius: 6px; padding: 14px 16px; cursor: pointer; margin-bottom: 10px; transition: border-color 0.15s ease, background 0.15s ease; }
.privacy-option:last-of-type { margin-bottom: 0; }
.privacy-option.selected { border-color: var(--rust); background: rgba(184,92,44,0.04); }
.privacy-option input { margin-top: 3px; accent-color: var(--rust); }
.privacy-option-label { font-size: 14px; font-weight: 500; color: var(--bark); margin-bottom: 2px; }
.privacy-option-sub { font-size: 12.5px; color: var(--warm-light); line-height: 1.45; }

.access-req-list { display: flex; flex-direction: column; }
.access-req-row { display: flex; align-items: flex-start; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--warm-faint); }
.access-req-row:last-child { border-bottom: none; }
.access-req-info { flex: 1; min-width: 0; }
.access-req-name { font-size: 14px; font-weight: 500; color: var(--bark); }
.access-req-meta { font-size: 12px; color: var(--warm-light); margin-top: 2px; }
.access-req-actions { display: flex; gap: 8px; flex-shrink: 0; }

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
/* Same bar treatment as the site-wide .nav, just the logo (no nav-right
   links) — sits above the hero photo instead of floating over it, so the
   "And Then..." mark reads identically wherever it appears. */
.memorial-topbar { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; padding: 0 56px; height: 64px; background: rgba(253,250,245,0.93); backdrop-filter: blur(12px); border-bottom: 1px solid var(--warm-faint); }
.memorial-topbar-logo { font-family: 'Lora', serif; font-size: 20px; color: var(--bark); background: none; border: none; padding: 0; cursor: pointer; }
.memorial-topbar-logo em { font-style: italic; color: var(--rust); }
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
.hero-cta { font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.85rem; background: transparent; color: var(--mem-ink-soft); border: 1.5px solid rgba(44,36,32,0.18); padding: 10px 22px; border-radius: 999px; cursor: pointer; margin-top: 20px; transition: border-color 0.15s ease, color 0.15s ease; }
/* Same slot as .hero-cta/.add-btn, for the free-locked state — nothing to
   click, so plain text rather than a dead-end button. */
.hero-cta-note { font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-style: italic; color: var(--mem-ink-soft); margin-top: 20px; }
.hero-cta:hover { border-color: var(--mem-rose); color: var(--mem-ink); }

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

.mem-tile { position: relative; aspect-ratio: 1; border-radius: 4px; box-shadow: var(--mem-shadow); overflow: hidden; display: flex; flex-direction: column; scroll-margin-top: 100px; border: none; background: none; padding: 0; margin: 0; width: 100%; text-align: left; font-family: inherit; cursor: pointer; }
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

/* Voicemail's own play button — same shape/size as .mem-tile-play, but
   rust-filled with a white triangle rather than white-filled with a dark
   one, and laid out inline (not absolutely centered) since it's the top
   item in a vertical stack with the waveform and duration below it,
   not floating alone over a media element. */
.mem-tile-voice-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.mem-tile-play-voice { position: static; margin: 0; background: var(--rust); }
.mem-tile-play-voice::after { border-left-color: #fff; }
.mem-tile-duration { font-size: 11px; color: rgba(245,239,225,0.55); font-variant-numeric: tabular-nums; }
@media (max-width: 600px) {
  /* At 2-column mobile width the tile body has little vertical room to
     spare — shrink the play button and waveform so the stack (button +
     wave + duration) doesn't crowd the tile's edges. */
  .mem-tile-play-voice { width: 32px; height: 32px; }
  .mem-tile-play-voice::after { border-left-width: 10px; border-top-width: 6px; border-bottom-width: 6px; }
  .mem-tile-voice .mem-tile-wave { height: 30px; }
  .mem-tile-voice-inner { gap: 6px; }
}

/* Reuses the homepage's cream-on-dark waveform coloring as-is — this
   tile's background is already dark, the exact context that pattern was
   built for. */
.mem-tile-wave { display: flex; align-items: center; gap: 2px; height: 44px; }
.mem-tile-wave span { width: 3px; background: rgba(253,250,245,0.3); border-radius: 2px; }
.mem-tile-wave span.played { background: var(--mem-gold); }
.mem-tile-voice-photo { position: absolute; bottom: 8px; right: 8px; width: 40px; height: 40px; border-radius: 4px; object-fit: cover; border: 2px solid rgba(253,250,245,0.5); box-shadow: 0 4px 10px -2px rgba(0,0,0,0.35); }

/* Overrides .mem-tile-body's align-items: center — a long story should crop
   off the bottom, not show whatever falls in the vertical middle. */
.mem-tile-story { background: var(--mem-card); padding: 18px; align-items: flex-start; }
.mem-tile-story blockquote { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 0.85rem; line-height: 1.5; color: var(--mem-ink); text-align: left; }

/* Caption reveal for a media entry with attached text — visible on
   :hover (desktop) or via the .revealed class MemoryTile toggles on
   first tap (touch, no hover). pointer-events: none always, even when
   visible, so a second tap/click passes through to the tile body
   underneath rather than hitting the overlay — "tap the media once
   revealed" from the spec. */
.mem-tile-caption { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,13,10,0.88) 0%, rgba(15,13,10,0.55) 45%, transparent 75%); display: flex; align-items: flex-end; padding: 16px; opacity: 0; transition: opacity 0.18s ease; pointer-events: none; }
.mem-tile:hover .mem-tile-caption { opacity: 1; }
.mem-tile-caption p { margin: 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 0.8rem; line-height: 1.45; color: var(--mem-paper); text-align: left; }

.mem-tile-bar { height: 17%; min-height: 32px; flex-shrink: 0; background: var(--mem-ink); display: flex; align-items: center; gap: 8px; padding: 0 12px; }
.mem-tile-type { text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; color: rgba(245,239,225,0.55); white-space: nowrap; }
.mem-tile-flag { display: inline-flex; align-items: center; justify-content: center; color: var(--mem-gold); font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; line-height: 1; }
.mem-tile-meta { margin-left: auto; font-size: 10px; color: rgba(245,239,225,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%; }

@media (prefers-reduced-motion: reduce) {
  .mem-tile-caption { transition: none; }
  .mem-tile .voice-play-btn { transition: none; }
}

/* -- memory reader — full-screen overlay opened from any grid tile. Same
   dark card + gold-accent shell the old featured-memory card used, but
   this one is per-tile and always navigates the FULL memory list via
   fixed prev/next buttons OUTSIDE the card (not the invisible in-card
   click zones the old component used), so they can never overlap a
   memory's own content. max-height + overflow-y keeps a long story
   scrollable within the card on short viewports instead of pushing the
   card off-screen. */
.reader-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(15,13,10,0.82); display: flex; align-items: center; justify-content: center; padding: 24px; }
.reader-card { position: relative; width: 100%; max-width: 640px; max-height: 86vh; overflow-y: auto; background: var(--mem-ink); border-radius: 8px; padding: 44px 36px 32px; box-shadow: var(--mem-shadow); }
.reader-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(255,255,255,0.08); color: var(--mem-paper); font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease; }
.reader-close:hover { background: rgba(255,255,255,0.16); }
.reader-count { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mem-gold-soft); margin-bottom: 22px; text-align: center; }

.reader-media { border-radius: 6px; overflow: hidden; margin: 0 auto 24px; background: rgba(255,255,255,0.06); }
.reader-media.photo, .reader-media.recipe, .reader-media.video { max-width: 480px; aspect-ratio: 4 / 3; }
.reader-media.photo img, .reader-media.recipe img { width: 100%; height: 100%; object-fit: cover; display: block; }
.reader-media.video video { width: 100%; height: 100%; object-fit: contain; display: block; background: #000; }
.reader-media.voicemail, .reader-media.spoken { max-width: 420px; padding: 22px 20px; }
.reader-media.link { max-width: 480px; }

.reader-audio { width: 100%; }
.reader-play-btn { width: 40px; height: 40px; }

.reader-link { display: block; width: 100%; background: none; border: none; padding: 0; cursor: pointer; text-align: left; font-family: inherit; position: relative; }
.reader-link img, .reader-link-fallback { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
.reader-link-fallback { display: flex; align-items: center; justify-content: center; font-size: 1.8rem; opacity: 0.5; color: var(--mem-paper); }
.reader-yt-badge { position: absolute; top: 10px; left: 10px; z-index: 1; background: #E13B33; color: #fff; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 8px; border-radius: 3px; }
.reader-play { position: absolute; inset: 0; margin: auto; width: 54px; height: 54px; border-radius: 50%; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; }
.reader-play::after { content: ''; border-left: 17px solid #1D2523; border-top: 11px solid transparent; border-bottom: 11px solid transparent; margin-left: 4px; }
.reader-link-embed { aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: #000; }
.reader-link-embed iframe { width: 100%; height: 100%; border: none; display: block; }

.reader-text { margin: 0 0 20px; font-family: 'Fraunces', serif; font-style: italic; font-weight: 500; font-size: clamp(1.1rem, 2.4vw, 1.35rem); line-height: 1.5; color: var(--mem-paper); text-align: center; }
.reader-text::before { content: '“'; color: var(--mem-gold-soft); }
.reader-text::after { content: '”'; color: var(--mem-gold-soft); }

.reader-meta { display: flex; align-items: baseline; justify-content: center; gap: 10px; flex-wrap: wrap; text-align: center; }
.reader-credit { font-size: 0.85rem; color: rgba(245,239,225,0.65); }
.reader-credit-time { margin-left: 6px; opacity: 0.75; }
.reader-type-tag { text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; color: var(--mem-gold-soft); border: 1px solid rgba(245,239,225,0.25); border-radius: 999px; padding: 3px 10px; }

/* Fixed to the viewport (not the card) so they can never overlap reader
   content. Offset uses max() against the iOS safe-area insets so a
   notched/home-indicator device doesn't tuck them under the curved edge
   or the swipe-up gesture zone. */
.reader-nav { position: fixed; top: 50%; transform: translateY(-50%); z-index: 501; width: 52px; height: 52px; border-radius: 50%; border: none; background: rgba(255,255,255,0.12); color: var(--mem-paper); font-size: 26px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease, opacity 0.15s ease; }
.reader-nav:hover { background: rgba(255,255,255,0.22); }
.reader-nav.prev { left: max(24px, env(safe-area-inset-left)); }
.reader-nav.next { right: max(24px, env(safe-area-inset-right)); }
.reader-nav.disabled { opacity: 0.25; pointer-events: none; }

@media (max-width: 700px) {
  .reader-card { padding: 40px 20px 28px; }
  .reader-nav { width: 40px; height: 40px; font-size: 20px; }
  .reader-nav.prev { left: max(8px, env(safe-area-inset-left)); }
  .reader-nav.next { right: max(8px, env(safe-area-inset-right)); }
}

/* -- contribute form: video attachment poster/thumbnail picker -- */
.share-video-poster-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.share-video-poster-thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; background: var(--warm-faint); flex-shrink: 0; }
.share-video-poster-label { font-size: 12px; color: var(--mem-ink-soft); font-family: 'DM Sans', sans-serif; margin-bottom: 2px; }

/* -- contribute form: photo preview + crop reposition UI -- */
.photo-preview-crop { position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: var(--warm-faint); }
.photo-preview-crop img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crop-adjust-btn { position: absolute; right: 10px; bottom: 10px; background: rgba(45,33,24,0.72); color: var(--cream); border: none; border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.15s ease; }
.crop-adjust-btn:hover { background: rgba(45,33,24,0.9); }

.crop-adjust-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(26,14,8,0.6); display: flex; align-items: center; justify-content: center; padding: 24px; }
.crop-adjust-card { background: var(--cream); border-radius: 6px; padding: 28px; max-width: 380px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 60px -20px rgba(0,0,0,0.4); }
.crop-adjust-title { font-family: 'Lora', serif; font-size: 18px; color: var(--bark); margin-bottom: 4px; }
.crop-adjust-sub { font-size: 13px; color: var(--warm-light); margin-bottom: 16px; }
.crop-adjust-window { position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden; cursor: grab; touch-action: none; background: var(--warm-faint); }
.crop-adjust-window:active { cursor: grabbing; }
.crop-adjust-img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; -webkit-user-drag: none; }
.crop-adjust-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }

/* Wider card for a non-square crop window (the header photo banner) —
   the default 380px is sized for the original square per-memory-photo case. */
.crop-adjust-card-wide { max-width: 560px; }

/* Read-only live preview at a second aspect ratio, shown beside the
   interactive window — see CropAdjuster's header comment for why. */
.crop-adjust-secondary { margin-top: 14px; }
.crop-adjust-secondary-label { display: block; font-size: 12px; color: var(--warm-light); margin-bottom: 6px; }
.crop-adjust-secondary-window { position: relative; width: 100%; max-width: 220px; border-radius: 4px; overflow: hidden; background: var(--warm-faint); }

/* -- delete-memorial confirm modal: reuses .crop-adjust-overlay/-card, just wider -- */
.confirm-delete-card { max-width: 440px; }
.confirm-delete-warning { color: var(--warm-mid); line-height: 1.6; margin-bottom: 20px; }
.btn-danger { background: #c0392b; color: #fff; }
.btn-danger:hover { background: #a93226; transform: translateY(-1px); }

/* Delete reads as a careful, separate action — no border/button chrome,
   just underlined red text, so it doesn't compete visually with Export. */
.link-danger { background: none; border: none; padding: 0; margin: 0; font-family: inherit; font-size: 13px; color: #c0392b; text-decoration: underline; cursor: pointer; }
.link-danger:hover { color: #a93226; }

.dashboard-actions { margin-top: 12px; }
.dashboard-actions-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; flex-wrap: wrap; }
.dashboard-actions-divider { border-top: 1px solid var(--warm-faint); }


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
.share-rel-chip.active { border-color: var(--mem-rose); background: rgba(193,81,90,0.06); }
.share-freewrite-link { display: block; text-align: center; font-size: 13px; color: var(--mem-ink-soft); text-decoration: underline; cursor: pointer; }

.share-question-box { background: var(--mem-paper); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.share-question-text { font-family: 'Fraunces', serif; font-style: italic; font-size: 19px; line-height: 1.45; margin: 0; color: var(--mem-ink); }
.share-shuffle-link { display: inline-block; font-size: 12px; color: var(--mem-rose); text-decoration: underline; cursor: pointer; margin-top: 12px; }

.share-question-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.share-question-card { font-family: 'Fraunces', serif; font-style: italic; font-size: 15px; line-height: 1.45; text-align: left; padding: 16px 18px; border-radius: 8px; border: 1px solid rgba(44,36,32,0.14); background: var(--mem-paper); color: var(--mem-ink); cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
.share-question-card:hover { border-color: var(--mem-rose); background: var(--mem-card); }

.share-attach-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.share-attach-btn { font-size: 12px; color: var(--mem-ink-soft); border: 1px solid rgba(44,36,32,0.14); background: transparent; padding: 8px 12px; border-radius: 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s ease; }
.share-attach-btn:hover { border-color: var(--mem-rose); color: var(--mem-rose); }
.share-attach-btn.spotlight { border-color: var(--mem-rose); color: var(--mem-rose); background: rgba(193,81,90,0.06); }
.share-recipe-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--mem-ink-soft); cursor: pointer; user-select: none; }
.share-recipe-check input { margin: 0; }
.share-submit-btn { width: 100%; }
.share-back-link { display: block; text-align: center; font-size: 12px; color: var(--mem-ink-soft); margin-top: 16px; cursor: pointer; }

/* Full-width, taller than the app's default textarea — this is the
   primary content of the screen, not a secondary form field. */
.share-answer-textarea { width: 100%; box-sizing: border-box; min-height: 170px; margin-bottom: 16px; }

.share-mode-toggle { display: flex; gap: 8px; margin: 4px 0 16px; }
.share-mode-toggle button { flex: 1; font-size: 13px; font-family: 'DM Sans', sans-serif; padding: 9px 12px; border-radius: 6px; border: 1px solid rgba(44,36,32,0.14); background: var(--mem-paper); color: var(--mem-ink-soft); cursor: pointer; transition: all 0.15s ease; }
.share-mode-toggle button:hover { border-color: var(--mem-rose); }
.share-mode-toggle button.active { background: var(--mem-rose); border-color: var(--mem-rose); color: #fff; }

/* Live recording widget — reuses .voice-recorder/.record-btn* (already
   used by the general attach row's inline recorder), just adds the
   waveform between the button and the timer. */
.share-voice-recorder { margin-bottom: 16px; }
.record-live-wave { display: flex; align-items: center; justify-content: center; gap: 3px; height: 40px; }
.record-live-wave span { width: 4px; min-height: 4px; border-radius: 2px; background: var(--mem-rose); }

/* Your name / email — moved to the bottom, deliberately quiet: no boxes,
   underline-only inputs, small label text, so this reads as a signature
   line under the memory rather than a form competing with it. */
.share-signature-divider { border-top: 1px solid rgba(44,36,32,0.12); margin: 4px 0 16px; }
.share-signature { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.share-signature-field { display: flex; align-items: center; gap: 12px; }
.share-signature-field label { flex-shrink: 0; width: 100px; font-size: 12px; color: var(--mem-ink-soft); font-family: 'DM Sans', sans-serif; }
.share-signature-input { flex: 1; min-width: 0; border: none; border-bottom: 1px solid rgba(44,36,32,0.18); border-radius: 0; background: none; padding: 4px 0; font-size: 13px; font-family: 'DM Sans', sans-serif; color: var(--mem-ink); outline: none; transition: border-color 0.15s ease; }
.share-signature-input:focus { border-bottom-color: var(--mem-rose); }
.share-signature-input::placeholder { color: var(--mem-ink-soft); opacity: 0.65; }

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
.pricing-paths-single { grid-template-columns: 1fr; max-width: 420px; }

.pricing-path-card { display: flex; flex-direction: column; height: 100%; border-radius: 10px; padding: 36px 32px; }
/* Button-chrome reset, ahead of the -light/-dark variants below so their own
   background/border still win the cascade — this only strips the parts a
   <button> adds that a <div> never had (native border, centered text,
   system font, default cursor). */
.pricing-path-card-clickable { border: none; text-align: left; font-family: inherit; cursor: pointer; width: 100%; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.pricing-path-card-clickable:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -18px rgba(0,0,0,0.3); }
.pricing-path-card-clickable:focus-visible { outline: 2px solid var(--rust); outline-offset: 3px; }
.pricing-path-card-clickable:disabled { cursor: default; opacity: 0.7; transform: none; }
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

/* Homepage pricing section — three clear entry points (free / buy / gift),
   each a full-width clickable row that routes to onboarding or the Pricing
   page. Label + one line of detail + a trailing arrow. */
.home-paths { display: flex; flex-direction: column; gap: 12px; margin-top: 40px; max-width: 540px; }
.home-path {
  display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 18px; row-gap: 3px;
  width: 100%; text-align: left; cursor: pointer; font-family: inherit;
  background: var(--white); border: 1px solid var(--warm-faint); border-radius: 10px; padding: 17px 22px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.home-path:hover { border-color: var(--rust); background: rgba(184,92,44,0.04); }
.home-path-label { grid-column: 1; font-family: 'Lora', serif; font-size: 16px; font-weight: 500; color: var(--bark); }
.home-path-detail { grid-column: 1; font-size: 13px; font-weight: 300; line-height: 1.55; color: var(--warm-mid); }
.home-path-arrow { grid-column: 2; grid-row: 1 / span 2; color: var(--rust); font-size: 15px; }
@media (max-width: 600px) {
  .home-paths { margin-top: 28px; gap: 10px; }
  .home-path { padding: 14px 18px; }
  .home-path-label { font-size: 15px; }
  .home-path-detail { font-size: 12.5px; }
}

.pricing-path-ring { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--rust-light); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.pricing-path-ring-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--rust-light); }

.pricing-path-body { font-size: 14.5px; font-weight: 300; line-height: 1.7; margin: 0; margin-top: auto; }
.pricing-path-card-light .pricing-path-body { color: var(--warm-mid); }
.pricing-path-card-dark .pricing-path-body { color: rgba(253,250,245,0.75); }

/* Gift pill, sitting right under the $49 card — a quiet continuation of it,
   not a promotional banner, so it borrows the card's own rust token rather
   than introducing a new color. */
.gift-pill {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: fit-content; margin: 18px auto 0;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
  color: var(--rust); background: rgba(184,92,44,0.08);
  border: 1.5px solid var(--rust); border-radius: 999px; padding: 11px 22px;
  cursor: pointer; transition: background 0.2s ease, color 0.2s ease;
}
.gift-pill:hover { background: var(--rust); color: #fff; }
.gift-pill svg { flex-shrink: 0; }

.gift-modal-card { max-width: 440px; }
.form-label-optional { font-weight: 400; color: var(--warm-light); text-transform: none; letter-spacing: 0; }

.gift-claim-message { font-family: 'Lora', serif; font-style: italic; font-size: 16px; color: var(--bark-light); border-left: 2px solid var(--rust-light); padding-left: 16px; margin: 18px 0; line-height: 1.6; }

/* Confirmation the gifter lands back on after paying (Pricing.jsx, ?gift_sent=1) —
   a calm full-width band above the hero, borrowing the same rust wash as the pill. */
.gift-sent-banner { background: rgba(184,92,44,0.08); border-bottom: 1px solid var(--warm-faint); }
.gift-sent-banner-inner { max-width: 620px; margin: 0 auto; padding: 28px 24px; text-align: center; }
.gift-sent-banner-title { font-family: 'Lora', serif; font-size: 20px; color: var(--bark); margin: 0 0 8px; }
.gift-sent-banner-body { font-size: 14.5px; color: var(--warm-mid); line-height: 1.6; margin: 0 0 16px; }

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

/* -- Our Promise page -- */
.promise-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin: 48px 0 64px; }
@media (max-width: 720px) { .promise-cards { grid-template-columns: 1fr; } }
.promise-card { background: var(--white); border: 1px solid var(--warm-faint); border-top: 3px solid var(--rust); border-radius: var(--radius); padding: 28px 26px; }
.promise-card h3 { font-family: 'Lora', serif; font-weight: 500; font-size: 19px; color: var(--bark); margin: 0 0 10px; }
.promise-card p { font-family: 'DM Sans', sans-serif; font-size: 14.5px; line-height: 1.7; color: var(--warm-mid); margin: 0; font-weight: 300; }

.promise-closing { background: var(--bark); padding: 70px 24px; text-align: center; }
.promise-closing-line { font-family: 'Lora', serif; font-style: italic; font-size: 24px; line-height: 1.5; color: var(--cream-dark); max-width: 42ch; margin: 0 auto 20px; }
.promise-closing-line em { font-style: italic; color: var(--rust-light); }
.promise-closing-note { font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--cream-dark); margin: 0; }
.promise-closing-note a { color: var(--rust-light); text-decoration: none; }
.promise-closing-note a:hover { text-decoration: underline; }
@media (max-width: 640px) { .promise-closing-line { font-size: 19px; } }

.promise-callout-link { display: block; margin-top: 14px; background: none; border: none; padding: 0; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--warm-light); text-align: left; }
.promise-callout-link:hover { color: var(--rust); }

@media (max-width: 640px) {
  .story-headline { font-size: 30px; }
  .story-article p { font-size: 16.5px; }
  .story-article p.story-lede { font-size: 20px; }
  .story-pull { font-size: 21px; }
}

/* -- "how it works" page — reuses .story-wrap/.story-headline/.story-divider
   for the narrow single-column layout, and .pricing-path-* for the two
   pricing cards (as plain non-interactive divs here, not buttons — this
   page doesn't sell anything, it just explains). -- */
.hiw-sub { font-size: 17px; font-weight: 300; line-height: 1.65; color: var(--warm-mid); max-width: 500px; margin: 0 0 50px; }

.hiw-step { display: flex; gap: 20px; margin-bottom: 40px; }
.hiw-step-num { font-family: 'Lora', serif; font-style: italic; font-size: 22px; color: var(--rust); width: 36px; flex-shrink: 0; }
.hiw-step-body h3 { font-family: 'Lora', serif; font-weight: 500; font-size: 19px; color: var(--bark); margin: 0 0 8px; }
.hiw-step-body p { font-size: 15px; font-weight: 300; line-height: 1.6; color: var(--warm-mid); margin: 0; }

/* Homepage's condensed how-it-works — reuses .hiw-step/.hiw-step-num above
   for the numbered-row layout, but each step is one inline sentence with a
   bold lead-in phrase rather than a separate heading + paragraph. */
.home-steps { margin-top: 40px; }
.home-step-text { font-size: 14.5px; font-weight: 300; line-height: 1.6; color: var(--warm-mid); margin: 0; }
.home-step-text strong { font-weight: 600; color: var(--bark); }
@media (max-width: 600px) {
  .home-steps { margin-top: 28px; }
  .home-step-text { font-size: 13.5px; }
}

.hiw-paths-heading { font-family: 'Lora', serif; font-size: 22px; font-weight: 400; color: var(--bark); margin: 0 0 8px; }
.hiw-paths-sub { font-size: 15px; font-weight: 300; color: var(--warm-mid); max-width: 500px; margin: 0 0 26px; }
.hiw-paths { padding: 0 0 40px; }

.hiw-cta-block { text-align: center; padding-top: 10px; }

@media (max-width: 640px) {
  .story-headline { font-size: 30px; }
  .story-article p { font-size: 16.5px; }
  .story-article p.story-lede { font-size: 20px; }
  .story-pull { font-size: 21px; }
  .hiw-sub { font-size: 15.5px; margin-bottom: 40px; }
  .hiw-step { gap: 14px; margin-bottom: 32px; }
  .hiw-step-num { width: 26px; font-size: 19px; }
  .hiw-step-body h3 { font-size: 17.5px; }
  .hiw-step-body p { font-size: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .story-page .fade-up,
  .story-page .fade-up-2,
  .story-page .fade-up-3 { animation: none; opacity: 1; transform: none; }
}
`;
