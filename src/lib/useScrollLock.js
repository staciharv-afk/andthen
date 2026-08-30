import { useEffect } from "react";

// Lock body scroll while a full-screen overlay/modal is mounted, then restore
// it (and the exact scroll position) on unmount. Without this, iOS Safari lets
// the page scroll *behind* a position:fixed overlay — and its dynamic toolbar +
// rubber-banding then composite the modal and the moving page on top of each
// other, which reads as a broken, overlapping screen. Reference-counted so
// nested overlays (e.g. the crop adjuster opened from inside the share modal)
// don't unlock each other prematurely.
let lockCount = 0;
let savedScrollY = 0;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      const { style } = document.body;
      style.position = "fixed";
      style.top = `-${savedScrollY}px`;
      style.left = "0";
      style.right = "0";
      style.width = "100%";
      style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        const { style } = document.body;
        style.position = "";
        style.top = "";
        style.left = "";
        style.right = "";
        style.width = "";
        style.overflow = "";
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
