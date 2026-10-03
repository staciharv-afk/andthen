import { useLayoutEffect, useRef } from "react";

// Truncate a block of text to whole words and end it with the brand
// ellipsis (the three clay dots from the logo — .brand-dots in styles.js)
// instead of letting it clip mid-line. CSS line-clamp can only draw a plain
// "…", so this measures in the browser: fill the element, then binary-search
// the word count until text + dots fits (scrollHeight <= clientHeight).
//
// Usage: const ref = useDotTruncation(text); <blockquote ref={ref} />
// The hook owns the element's contents, so render it with NO children. The
// element needs a bounded height and overflow: hidden from its own CSS (see
// `.mem-tile-story blockquote`) — that box is the "text area" measured.
// The dots are aria-hidden; put the full text in an aria-label on whatever
// wraps this so screen readers still get all of it.
//
// Re-measures once web fonts load and whenever the element resizes.

// Trailing whitespace/punctuation stripped from the last word kept, so the
// dots never follow a stray gap or a dangling dash.
const TRAILING = /[\s,;:.–—]+$/;

function makeDots() {
  const dots = document.createElement("span");
  dots.className = "brand-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("i"));
  return dots;
}

// Fill `el` with the first `count` words followed by the dots. The last word
// and the dots share a nowrap span so the dots can't wrap onto a line alone.
function renderTruncated(el, words, count) {
  const kept = words.slice(0, count).join(" ").replace(TRAILING, "");
  const cut = kept.lastIndexOf(" ") + 1;
  const tail = document.createElement("span");
  tail.style.whiteSpace = "nowrap";
  tail.append(kept.slice(cut), makeDots());
  el.replaceChildren(kept.slice(0, cut), tail);
}

function fit(el, text) {
  el.textContent = text;
  // clientHeight 0 = not laid out (e.g. a filtered-out tile); the
  // ResizeObserver re-runs this when it becomes visible.
  if (!el.clientHeight || el.scrollHeight <= el.clientHeight) return;

  const words = text.trim().split(/\s+/);
  // Largest word count that fits alongside the dots. Never fewer than one
  // word, even in a box too small for it.
  let lo = 1;
  let hi = words.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    renderTruncated(el, words, mid);
    if (el.scrollHeight <= el.clientHeight) lo = mid;
    else hi = mid - 1;
  }
  renderTruncated(el, words, Math.max(lo, 1));
}

export function useDotTruncation(text) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const value = text || "";
    let cancelled = false;
    const run = () => { if (!cancelled) fit(el, value); };

    run();
    document.fonts?.ready.then(run);

    // Only re-fit when the box itself changes size — the observer also fires
    // once on observe(), which run() above has already covered.
    let w = el.clientWidth;
    let h = el.clientHeight;
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      run();
    });
    ro?.observe(el);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [text]);

  return ref;
}
